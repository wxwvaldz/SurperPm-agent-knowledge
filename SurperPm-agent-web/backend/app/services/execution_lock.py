"""Per-workspace asyncio.Lock — serialises goal executions within a workspace."""
import asyncio

_locks: dict[str, asyncio.Lock] = {}


def get_lock(workspace_id: str) -> asyncio.Lock:
    if workspace_id not in _locks:
        _locks[workspace_id] = asyncio.Lock()
    return _locks[workspace_id]
