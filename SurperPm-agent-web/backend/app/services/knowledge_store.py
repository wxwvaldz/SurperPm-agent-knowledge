"""KnowledgeStore — JSONL-backed data store replacing SQLAlchemy for business data.

Reads/writes .logs/*.jsonl files in the SuperPmAgent-knowledge repo clone.
In-memory cache for fast reads; atomic file writes for durability.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import secrets as stdlib_secrets
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.config import settings

_logger = logging.getLogger(__name__)

_KNOWLEDGE_PATH: Path | None = None


def _get_knowledge_path() -> Path:
    global _KNOWLEDGE_PATH
    if _KNOWLEDGE_PATH is None:
        p = settings.knowledge_repo_path
        _KNOWLEDGE_PATH = Path(p) if p else Path("knowledge")
    return _KNOWLEDGE_PATH


def _serialize_value(v: Any) -> Any:
    if isinstance(v, datetime):
        return v.isoformat()
    return v


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


class KnowledgeStore:
    """File-backed JSONL store with in-memory cache."""

    def __init__(self, knowledge_path: Path | None = None):
        self._knowledge_root = knowledge_path or _get_knowledge_path()
        self._root = self._knowledge_root / ".logs"
        self._cache: dict[str, list[dict]] = {}
        self._locks: dict[str, asyncio.Lock] = {}
        self._root.mkdir(parents=True, exist_ok=True)

    @property
    def knowledge_root(self) -> Path:
        return self._knowledge_root

    def _lock_for(self, collection: str) -> asyncio.Lock:
        if collection not in self._locks:
            self._locks[collection] = asyncio.Lock()
        return self._locks[collection]

    def _path_for(self, collection: str) -> Path:
        return self._root / f"{collection}.jsonl"

    def _discussion_path(self, topic_id: int | None) -> Path:
        d = self._root / "discussions"
        d.mkdir(parents=True, exist_ok=True)
        fname = f"{topic_id}.jsonl" if topic_id is not None else "_no_topic.jsonl"
        return d / fname

    def _load_jsonl(self, path: Path) -> list[dict]:
        if not path.exists():
            return []
        rows = []
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        rows.append(json.loads(line))
                    except json.JSONDecodeError:
                        _logger.warning("Skipping malformed line in %s", path)
        return rows

    def _flush_jsonl(self, path: Path, rows: list[dict]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(
            dir=str(path.parent), suffix=".tmp", prefix=path.stem
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                for row in rows:
                    f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
            os.replace(tmp, str(path))
        except Exception:
            if os.path.exists(tmp):
                os.unlink(tmp)
            raise

    def _get_cache(self, collection: str) -> list[dict]:
        if collection not in self._cache:
            self._cache[collection] = self._load_jsonl(self._path_for(collection))
        return self._cache[collection]

    def _flush_cache(self, collection: str) -> None:
        rows = self._cache.get(collection, [])
        self._flush_jsonl(self._path_for(collection), rows)

    def _next_int_id(self, collection: str) -> int:
        rows = self._get_cache(collection)
        if not rows:
            return 1
        max_id = max(
            (r.get("id", 0) for r in rows if isinstance(r.get("id"), int)),
            default=0,
        )
        return max_id + 1

    def _next_hex_id(self) -> str:
        return stdlib_secrets.token_hex(8)

    # ------------------------------------------------------------------
    # Public CRUD
    # ------------------------------------------------------------------

    @staticmethod
    def _match_value(row_val: Any, filter_val: Any) -> bool:
        if row_val == filter_val:
            return True
        if row_val is not None and filter_val is not None:
            return str(row_val) == str(filter_val)
        return False

    def list(self, collection: str, **filters: Any) -> list[dict]:
        rows = self._get_cache(collection)
        if not filters:
            return list(rows)
        result = []
        for row in rows:
            match = True
            for k, v in filters.items():
                if not self._match_value(row.get(k), v):
                    match = False
                    break
            if match:
                result.append(row)
        return result

    def get(self, collection: str, id: int | str) -> dict | None:
        for row in self._get_cache(collection):
            rid = row.get("id")
            if rid == id or str(rid) == str(id):
                return row
        return None

    async def create(
        self, collection: str, data: dict, *, id_type: str = "int"
    ) -> dict:
        async with self._lock_for(collection):
            if id_type == "hex":
                data.setdefault("id", self._next_hex_id())
            else:
                data.setdefault("id", self._next_int_id(collection))
            now = _now_iso()
            data.setdefault("created_at", now)
            data.setdefault("updated_at", now)
            self._get_cache(collection).append(data)
            self._flush_cache(collection)
            return data

    async def update(
        self, collection: str, id: int | str, patch: dict
    ) -> dict | None:
        async with self._lock_for(collection):
            rows = self._get_cache(collection)
            for i, row in enumerate(rows):
                rid = row.get("id")
                if rid == id or str(rid) == str(id):
                    for k, v in patch.items():
                        row[k] = _serialize_value(v)
                    row["updated_at"] = _now_iso()
                    rows[i] = row
                    self._flush_cache(collection)
                    return row
            return None

    async def delete(self, collection: str, id: int | str) -> bool:
        async with self._lock_for(collection):
            rows = self._get_cache(collection)
            before = len(rows)
            sid = str(id)
            self._cache[collection] = [
                r for r in rows
                if r.get("id") != id and str(r.get("id")) != sid
            ]
            if len(self._cache[collection]) < before:
                self._flush_cache(collection)
                return True
            return False

    # ------------------------------------------------------------------
    # Discussions (per-topic file split)
    # ------------------------------------------------------------------

    def _disc_cache_key(self, topic_id: int | None) -> str:
        return f"_disc_{topic_id}"

    def _get_disc_cache(self, topic_id: int | None) -> list[dict]:
        key = self._disc_cache_key(topic_id)
        if key not in self._cache:
            self._cache[key] = self._load_jsonl(self._discussion_path(topic_id))
        return self._cache[key]

    def list_discussions(
        self, topic_id: int | None = None, **filters: Any
    ) -> list[dict]:
        rows = self._get_disc_cache(topic_id)
        if not filters:
            return list(rows)
        result = []
        for row in rows:
            match = all(row.get(k) == v for k, v in filters.items())
            if match:
                result.append(row)
        return result

    def list_all_discussions(self, **filters: Any) -> list[dict]:
        disc_dir = self._root / "discussions"
        if not disc_dir.is_dir():
            return []
        all_rows: list[dict] = []
        for f in sorted(disc_dir.glob("*.jsonl")):
            all_rows.extend(self._load_jsonl(f))
        if not filters:
            return all_rows
        return [
            r for r in all_rows if all(r.get(k) == v for k, v in filters.items())
        ]

    def get_discussion(self, discussion_id: int) -> dict | None:
        disc_dir = self._root / "discussions"
        if not disc_dir.is_dir():
            return None
        for f in disc_dir.glob("*.jsonl"):
            for row in self._load_jsonl(f):
                if row.get("id") == discussion_id:
                    return row
        return None

    async def create_discussion(self, data: dict) -> dict:
        topic_id = data.get("topic_id")
        key = self._disc_cache_key(topic_id)
        lock = self._lock_for(key)
        async with lock:
            rows = self._get_disc_cache(topic_id)
            all_ids: list[int] = []
            disc_dir = self._root / "discussions"
            if disc_dir.is_dir():
                for f in disc_dir.glob("*.jsonl"):
                    for r in self._load_jsonl(f):
                        if isinstance(r.get("id"), int):
                            all_ids.append(r["id"])
            all_ids.extend(
                r.get("id", 0) for r in rows if isinstance(r.get("id"), int)
            )
            next_id = (max(all_ids) + 1) if all_ids else 1
            data.setdefault("id", next_id)
            now = _now_iso()
            data.setdefault("created_at", now)
            rows.append(data)
            self._cache[key] = rows
            self._flush_jsonl(self._discussion_path(topic_id), rows)
            return data

    async def delete_discussion(self, discussion_id: int) -> bool:
        disc_dir = self._root / "discussions"
        if not disc_dir.is_dir():
            return False
        for f in disc_dir.glob("*.jsonl"):
            rows = self._load_jsonl(f)
            filtered = [r for r in rows if r.get("id") != discussion_id]
            if len(filtered) < len(rows):
                self._flush_jsonl(f, filtered)
                return True
        return False

    # ------------------------------------------------------------------
    # Settings (single JSON file, not JSONL)
    # ------------------------------------------------------------------

    def get_settings(self) -> dict:
        path = self._root / "settings.json"
        if not path.exists():
            return {}
        try:
            return json.loads(path.read_text("utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}

    async def update_settings(self, patch: dict) -> dict:
        lock = self._lock_for("_settings")
        async with lock:
            cfg = self.get_settings()
            for k, v in patch.items():
                cfg[k] = _serialize_value(v)
            cfg["updated_at"] = _now_iso()
            path = self._root / "settings.json"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(
                json.dumps(cfg, ensure_ascii=False, indent=2, default=str),
                encoding="utf-8",
            )
            return cfg

    # ------------------------------------------------------------------
    # Cache reload (after git pull)
    # ------------------------------------------------------------------

    def reload(self) -> None:
        self._cache.clear()
        _logger.info("KnowledgeStore: cache cleared, will reload on next access")


# ------------------------------------------------------------------
# Singleton + FastAPI dependency
# ------------------------------------------------------------------

_store_instance: KnowledgeStore | None = None


def init_store(knowledge_path: Path | None = None) -> KnowledgeStore:
    global _store_instance
    path = knowledge_path or _get_knowledge_path()
    _store_instance = KnowledgeStore(path)
    _logger.info("KnowledgeStore initialized at %s", path)
    return _store_instance


def get_store() -> KnowledgeStore:
    global _store_instance
    if _store_instance is None:
        _store_instance = KnowledgeStore()
    return _store_instance
