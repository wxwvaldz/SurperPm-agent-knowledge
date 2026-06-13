"""Secret table model."""

from datetime import UTC, datetime

from sqlmodel import Field, SQLModel, UniqueConstraint


class Secret(SQLModel, table=True):
    __tablename__ = "secret"
    __table_args__ = (UniqueConstraint("workspace_id", "key"),)

    id: int | None = Field(default=None, primary_key=True)
    workspace_id: str = Field(foreign_key="workspace.id", nullable=False)
    key: str = Field(nullable=False)
    value_enc: str = Field(nullable=False)
    category: str = Field(default="env")  # env | token | server | other
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
