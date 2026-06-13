"""Workspace table model."""

import secrets
from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class Workspace(SQLModel, table=True):
    __tablename__ = "workspace"

    id: str = Field(default_factory=lambda: secrets.token_hex(8), primary_key=True)
    name: str = Field(nullable=False)
    slug: str = Field(nullable=False, unique=True)
    repo_url: str | None = Field(default=None)
    repo_path: str | None = Field(default=None)
    knowledge_repo_url: str | None = Field(default=None)
    knowledge_repo_path: str | None = Field(default=None)
    repos: str | None = Field(default=None)  # JSON array of repo URLs
    ssh_public_key: str | None = Field(default=None)
    ssh_private_key_enc: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
