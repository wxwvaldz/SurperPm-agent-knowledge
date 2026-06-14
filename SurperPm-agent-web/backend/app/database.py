"""Async SQLite database engine and session factory."""
import logging
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from app.config import settings

_logger = logging.getLogger(__name__)

_db_path = Path(settings.database_url.replace("sqlite+aiosqlite:///", ""))
_db_path.parent.mkdir(parents=True, exist_ok=True)

engine = create_async_engine(
    settings.database_url,
    echo=False,
    connect_args={"check_same_thread": False},
)

async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


_MIGRATIONS: list[tuple[str, str, str]] = [
    # (table, column, type_default)
    ("global_config", "github_token_enc", "TEXT"),
    ("global_config", "founder_username", "TEXT"),
    ("global_config", "distill_config", "TEXT"),
]


async def _migrate_schema(conn) -> None:
    """Add any missing columns to existing tables (SQLite ADD COLUMN)."""
    for table, column, col_type in _MIGRATIONS:
        result = await conn.execute(text(f"PRAGMA table_info({table})"))
        existing = {row[1] for row in result.fetchall()}
        if column not in existing:
            await conn.execute(
                text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
            )
            _logger.info("Migrated: ALTER TABLE %s ADD COLUMN %s %s", table, column, col_type)


async def _seed_global_config(conn) -> None:
    """Seed global_config singleton if missing."""
    result = await conn.execute(text("SELECT COUNT(*) FROM global_config"))
    if result.scalar():
        return

    await conn.execute(text(
        "INSERT INTO global_config (id, created_at, updated_at) "
        "VALUES (1, datetime('now'), datetime('now'))"
    ))
    _logger.info("Seeded global_config singleton row")


async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        await _migrate_schema(conn)
        await _seed_global_config(conn)


async def get_session():
    async with async_session() as session:
        yield session
