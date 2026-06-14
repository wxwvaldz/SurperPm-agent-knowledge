"""GoalGroup table model — organise goals into named groups."""

from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class GoalGroup(SQLModel, table=True):
    __tablename__ = "goal_group"

    id: int | None = Field(default=None, primary_key=True)
    workspace_id: str = Field(foreign_key="workspace.id", nullable=False)
    name: str = Field(nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
