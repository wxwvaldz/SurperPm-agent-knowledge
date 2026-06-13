"""Skills API — workspace-scoped CRUD + file management + GitHub import + validation."""

import logging
import re
from datetime import UTC, datetime

import requests as http_requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models.skill import Skill, SkillFile
from app.routes.deps import require_auth
from app.services.event_bus import SKILL_CREATED, SKILL_DELETED, SKILL_UPDATED, bus

router = APIRouter()
_logger = logging.getLogger(__name__)

_GITHUB_API_REAL = "https://api.github.com"


# ── Request schemas ──────────────────────────────────────────────


class SkillCreate(BaseModel):
    name: str
    description: str | None = None
    skill_md_content: str | None = None


class SkillUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class SkillFileCreate(BaseModel):
    path: str
    content: str = ""
    is_main: bool = False


class SkillFileUpdate(BaseModel):
    content: str


class SkillImportUrl(BaseModel):
    url: str


# ── Helpers ──────────────────────────────────────────────────────


def _slugify(name: str) -> str:
    slug = name.lower().replace(" ", "-")
    slug = re.sub(r"[^a-z0-9\-]", "", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or "untitled"


async def _unique_slug(session: AsyncSession, workspace_id: str, base_slug: str) -> str:
    slug = base_slug
    n = 1
    while True:
        stmt = select(Skill).where(Skill.workspace_id == workspace_id, Skill.slug == slug)
        result = await session.execute(stmt)
        if result.scalar_one_or_none() is None:
            return slug
        n += 1
        slug = f"{base_slug}-{n}"


# ── Skill list & create ────────────────────────────────────────


@router.get("")
async def list_skills(
    workspace_id: str,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    stmt = select(Skill).where(Skill.workspace_id == workspace_id).order_by(Skill.created_at.desc())
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("", status_code=201)
async def create_skill(
    workspace_id: str,
    body: SkillCreate,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    slug = await _unique_slug(session, workspace_id, _slugify(body.name))
    skill = Skill(
        workspace_id=workspace_id, name=body.name, slug=slug,
        description=body.description, source_type="manual", file_count=0,
    )
    session.add(skill)
    await session.commit()
    await session.refresh(skill)

    if body.skill_md_content:
        sf = SkillFile(skill_id=skill.id, path="SKILL.md", content=body.skill_md_content, is_main=True)
        session.add(sf)
        skill.file_count = 1
        session.add(skill)
        await session.commit()
        await session.refresh(skill)

    await bus.emit(SKILL_CREATED, {"skill_id": skill.id, "workspace_id": workspace_id, "name": skill.name})
    return skill


# ── GitHub Import (before /{skill_id}) ──────────────────────────


@router.post("/import", status_code=201)
async def import_skill_from_url(
    workspace_id: str,
    body: SkillImportUrl,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    url = body.url.strip().rstrip("/")
    match = re.match(r"https?://github\.com/([^/]+)/([^/]+?)(?:/(?:tree|blob)/[^/]+/(.*))?$", url)
    if not match:
        raise HTTPException(status_code=400, detail=f"Invalid GitHub URL: {url}")

    owner, repo, subpath = match.group(1), match.group(2), match.group(3) or ""
    token = _user.get("github_token", "")
    if not token:
        raise HTTPException(status_code=400, detail="No GitHub token found. Please re-login with GitHub.")

    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    api_url = f"{_GITHUB_API_REAL}/repos/{owner}/{repo}/contents/{subpath}".rstrip("/")
    resp = http_requests.get(api_url, headers=headers, timeout=15)
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="GitHub path not found")
    resp.raise_for_status()

    contents = resp.json()
    if not isinstance(contents, list):
        contents = [contents]

    files_to_import: list[dict] = []
    _recurse_github_dir(headers, owner, repo, contents, subpath, files_to_import, max_files=128)
    if not files_to_import:
        raise HTTPException(status_code=400, detail="No importable files found at URL")

    skill_name = subpath.split("/")[-1] if subpath else repo
    slug = await _unique_slug(session, workspace_id, _slugify(skill_name))
    skill = Skill(
        workspace_id=workspace_id, name=skill_name, slug=slug,
        description=f"Imported from {url}", source_type="github_import",
        source_url=url, file_count=0,
    )
    session.add(skill)
    await session.commit()
    await session.refresh(skill)

    for f_info in files_to_import:
        session.add(SkillFile(
            skill_id=skill.id, path=f_info["path"],
            content=f_info["content"], is_main=f_info["path"] == "SKILL.md",
        ))
    skill.file_count = len(files_to_import)
    skill.updated_at = datetime.now(UTC)
    session.add(skill)
    await session.commit()
    await session.refresh(skill)

    files_stmt = select(SkillFile).where(SkillFile.skill_id == skill.id)
    files = (await session.execute(files_stmt)).scalars().all()
    await bus.emit(SKILL_CREATED, {"skill_id": skill.id, "workspace_id": workspace_id, "name": skill.name})
    return {**skill.model_dump(), "files": [f.model_dump() for f in files]}


def _recurse_github_dir(headers, owner, repo, contents, base_path, collected, max_files=128, depth=0):
    if depth > 5 or len(collected) >= max_files:
        return
    for entry in contents:
        if len(collected) >= max_files:
            break
        if entry.get("type") == "dir":
            resp = http_requests.get(entry["url"], headers=headers, timeout=15)
            if resp.status_code == 200:
                _recurse_github_dir(headers, owner, repo, resp.json(), base_path, collected, max_files, depth + 1)
        elif entry.get("type") == "file":
            name = entry.get("name", "")
            if name.endswith((".png", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".zip", ".gz")):
                continue
            download_url = entry.get("download_url")
            if not download_url:
                continue
            try:
                resp = http_requests.get(download_url, headers=headers, timeout=15)
                if resp.status_code == 200:
                    rel_path = entry.get("path", name)
                    if base_path and rel_path.startswith(base_path + "/"):
                        rel_path = rel_path[len(base_path) + 1:]
                    collected.append({"path": rel_path, "content": resp.text})
            except Exception:
                _logger.warning("Failed to fetch %s", download_url)


# ── Single-skill CRUD (must come after /import) ───


@router.get("/{skill_id}")
async def get_skill(
    workspace_id: str,
    skill_id: int,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    stmt = select(Skill).where(Skill.id == skill_id, Skill.workspace_id == workspace_id)
    skill = (await session.execute(stmt)).scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    files_stmt = select(SkillFile).where(SkillFile.skill_id == skill_id)
    files = (await session.execute(files_stmt)).scalars().all()
    return {**skill.model_dump(), "files": [f.model_dump() for f in files]}


@router.patch("/{skill_id}")
async def update_skill(
    workspace_id: str,
    skill_id: int,
    body: SkillUpdate,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    stmt = select(Skill).where(Skill.id == skill_id, Skill.workspace_id == workspace_id)
    skill = (await session.execute(stmt)).scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(skill, key, val)
    if "name" in update_data:
        skill.slug = await _unique_slug(session, workspace_id, _slugify(body.name))

    skill.updated_at = datetime.now(UTC)
    session.add(skill)
    await session.commit()
    await session.refresh(skill)
    await bus.emit(SKILL_UPDATED, {"skill_id": skill.id, "workspace_id": workspace_id, "name": skill.name})
    return skill


@router.delete("/{skill_id}", status_code=204)
async def delete_skill(
    workspace_id: str,
    skill_id: int,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    stmt = select(Skill).where(Skill.id == skill_id, Skill.workspace_id == workspace_id)
    skill = (await session.execute(stmt)).scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    files_stmt = select(SkillFile).where(SkillFile.skill_id == skill_id)
    for f in (await session.execute(files_stmt)).scalars().all():
        await session.delete(f)
    await session.delete(skill)
    await session.commit()
    await bus.emit(SKILL_DELETED, {"skill_id": skill_id, "workspace_id": workspace_id})


# ── Skill File CRUD ─────────────────────────────────────────────


@router.get("/{skill_id}/files")
async def list_skill_files(
    workspace_id: str,
    skill_id: int,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    stmt = select(Skill).where(Skill.id == skill_id, Skill.workspace_id == workspace_id)
    if not (await session.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Skill not found")
    files_stmt = select(SkillFile).where(SkillFile.skill_id == skill_id)
    return (await session.execute(files_stmt)).scalars().all()


@router.post("/{skill_id}/files", status_code=201)
async def create_skill_file(
    workspace_id: str,
    skill_id: int,
    body: SkillFileCreate,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    stmt = select(Skill).where(Skill.id == skill_id, Skill.workspace_id == workspace_id)
    skill = (await session.execute(stmt)).scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    sf = SkillFile(skill_id=skill_id, path=body.path, content=body.content, is_main=body.is_main)
    session.add(sf)
    skill.file_count += 1
    skill.updated_at = datetime.now(UTC)
    session.add(skill)
    await session.commit()
    await session.refresh(sf)
    await bus.emit(SKILL_UPDATED, {"skill_id": skill_id, "workspace_id": workspace_id})
    return sf


@router.put("/{skill_id}/files/{file_id}")
async def update_skill_file(
    workspace_id: str,
    skill_id: int,
    file_id: int,
    body: SkillFileUpdate,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    stmt = select(Skill).where(Skill.id == skill_id, Skill.workspace_id == workspace_id)
    skill = (await session.execute(stmt)).scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    file_stmt = select(SkillFile).where(SkillFile.id == file_id, SkillFile.skill_id == skill_id)
    sf = (await session.execute(file_stmt)).scalar_one_or_none()
    if not sf:
        raise HTTPException(status_code=404, detail="File not found")

    sf.content = body.content
    sf.updated_at = datetime.now(UTC)
    skill.updated_at = datetime.now(UTC)
    session.add(sf)
    session.add(skill)
    await session.commit()
    await session.refresh(sf)
    await bus.emit(SKILL_UPDATED, {"skill_id": skill_id, "workspace_id": workspace_id})
    return sf


@router.delete("/{skill_id}/files/{file_id}", status_code=204)
async def delete_skill_file(
    workspace_id: str,
    skill_id: int,
    file_id: int,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    stmt = select(Skill).where(Skill.id == skill_id, Skill.workspace_id == workspace_id)
    skill = (await session.execute(stmt)).scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    file_stmt = select(SkillFile).where(SkillFile.id == file_id, SkillFile.skill_id == skill_id)
    sf = (await session.execute(file_stmt)).scalar_one_or_none()
    if not sf:
        raise HTTPException(status_code=404, detail="File not found")

    await session.delete(sf)
    skill.file_count = max(0, skill.file_count - 1)
    skill.updated_at = datetime.now(UTC)
    session.add(skill)
    await session.commit()
    await bus.emit(SKILL_UPDATED, {"skill_id": skill_id, "workspace_id": workspace_id})


# ── Skill Validation ────────────────────────────────────────────


_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


class SkillValidateRequest(BaseModel):
    content: str


class ValidationIssue(BaseModel):
    severity: str  # "error" | "warning"
    field: str
    message: str


class SkillValidateResponse(BaseModel):
    valid: bool
    errors: list[ValidationIssue] = []
    warnings: list[ValidationIssue] = []


@router.post("/validate")
async def validate_skill(
    workspace_id: str,
    body: SkillValidateRequest,
    _user: dict = Depends(require_auth),
) -> SkillValidateResponse:
    """Validate SKILL.md content — frontmatter fields + structure."""
    errors: list[ValidationIssue] = []
    warnings: list[ValidationIssue] = []
    content = body.content

    # Parse frontmatter
    fm: dict[str, str] = {}
    fm_match = _FRONTMATTER_RE.match(content)
    if fm_match:
        fm_text = fm_match.group(1)
        for line in fm_text.split("\n"):
            line = line.strip()
            if ":" in line:
                key, _, val = line.partition(":")
                fm[key.strip()] = val.strip().strip("\"'")
    else:
        warnings.append(ValidationIssue(
            severity="warning", field="frontmatter",
            message="No YAML frontmatter found (--- ... ---). Consider adding metadata.",
        ))

    # Required frontmatter fields
    if not fm.get("name"):
        errors.append(ValidationIssue(
            severity="error", field="frontmatter.name",
            message="Missing required field: name",
        ))
    if not fm.get("description"):
        errors.append(ValidationIssue(
            severity="error", field="frontmatter.description",
            message="Missing required field: description",
        ))

    # Description length
    desc = fm.get("description", "")
    if len(desc) > 1024:
        errors.append(ValidationIssue(
            severity="error", field="frontmatter.description",
            message=f"Description must be ≤ 1024 characters (currently {len(desc)})",
        ))

    # Optional fields — warn if missing
    for opt in ("version", "tags", "tools"):
        if not fm.get(opt):
            warnings.append(ValidationIssue(
                severity="warning", field=f"frontmatter.{opt}",
                message=f"Optional: add '{opt}' field for better discoverability",
            ))

    # Content structure
    body_text = _FRONTMATTER_RE.sub("", content, count=1).strip()
    if not body_text:
        errors.append(ValidationIssue(
            severity="error", field="structure.body",
            message="SKILL.md body is empty after frontmatter",
        ))
    elif "## " not in body_text:
        errors.append(ValidationIssue(
            severity="error", field="structure.sections",
            message="SKILL.md must contain at least one ## section header (e.g. '## Steps')",
        ))

    valid = len(errors) == 0
    return SkillValidateResponse(valid=valid, errors=errors, warnings=warnings)
