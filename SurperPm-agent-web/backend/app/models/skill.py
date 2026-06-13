"""Skill + SkillFile table models."""

from datetime import UTC, datetime

from sqlmodel import Field, SQLModel, UniqueConstraint


class Skill(SQLModel, table=True):
    __tablename__ = "skill"
    __table_args__ = (UniqueConstraint("workspace_id", "slug"),)

    id: int | None = Field(default=None, primary_key=True)
    workspace_id: str = Field(foreign_key="workspace.id", nullable=False)
    name: str = Field(nullable=False)
    slug: str = Field(nullable=False)
    description: str | None = Field(default=None)
    source_type: str = Field(default="manual")  # manual | github_import
    source_url: str | None = Field(default=None)
    file_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SkillFile(SQLModel, table=True):
    __tablename__ = "skill_file"

    id: int | None = Field(default=None, primary_key=True)
    skill_id: int = Field(foreign_key="skill.id", nullable=False)
    path: str = Field(nullable=False)
    content: str = Field(default="")
    is_main: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
