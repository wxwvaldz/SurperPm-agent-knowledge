"""MCP Server table model."""

from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class MCPServer(SQLModel, table=True):
    __tablename__ = "mcp_server"

    id: int | None = Field(default=None, primary_key=True)
    workspace_id: str = Field(foreign_key="workspace.id", nullable=False)
    name: str = Field(nullable=False)
    transport: str = Field(default="stdio")  # stdio | sse | http
    command: str | None = Field(default=None)  # for stdio
    args: str | None = Field(default=None)  # JSON array string
    env: str | None = Field(default=None)  # JSON object string
    url: str | None = Field(default=None)  # for sse/http
    headers: str | None = Field(default=None)  # JSON object string
    enabled: bool = Field(default=True)
    plugin_source: str | None = Field(default=None)  # e.g. "SuperPmAgent-core"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
