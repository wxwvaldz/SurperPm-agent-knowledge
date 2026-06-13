"""E2E tests for /api/goal endpoints.

Self-contained: creates its own temp git repo, overrides config paths,
and tests the full submit → list → get flow without touching .env.
"""
import os
import subprocess
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def target_repo(tmp_path):
    """Create a temporary git repo as the goal execution target."""
    repo = tmp_path / "target"
    repo.mkdir()
    subprocess.run(["git", "init"], cwd=repo, check=True, capture_output=True)
    subprocess.run(
        ["git", "config", "user.email", "test@test.com"], cwd=repo, check=True, capture_output=True
    )
    subprocess.run(
        ["git", "config", "user.name", "Test"], cwd=repo, check=True, capture_output=True
    )
    readme = repo / "README.md"
    readme.write_text("# test target repo\n")
    subprocess.run(["git", "add", "-A"], cwd=repo, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=repo, check=True, capture_output=True)
    return str(repo)


@pytest.fixture()
def test_client(target_repo):
    """FastAPI test client with config overridden to use temp paths."""
    os.environ["PLUGIN_REPO_PATH"] = "/tmp/fake-plugin-path"
    os.environ["TARGET_REPO_PATH"] = target_repo
    from app.main import app

    with TestClient(app) as client:
        yield client
    os.environ.pop("PLUGIN_REPO_PATH", None)
    os.environ.pop("TARGET_REPO_PATH", None)


def test_submit_returns_run_id(test_client):
    """POST /api/goal/submit should return a run_id and status."""
    with patch("app.services.goal_runner.query", new_callable=AsyncMock) as mock_query:
        mock_query.return_value = AsyncMock()
        mock_query.return_value.__aiter__ = AsyncMock(return_value=iter([]))

        r = test_client.post("/api/goal/submit", json={"text": "add .gitignore for Python"})
        assert r.status_code == 200
        body = r.json()
        assert "id" in body
        assert body["status"] == "running"
        assert len(body["id"]) == 8


def test_list_contains_submitted_goal(test_client):
    """GET /api/goal/list should include previously submitted goals."""
    with patch("app.services.goal_runner.query", new_callable=AsyncMock) as mock_query:
        mock_query.return_value = AsyncMock()
        mock_query.return_value.__aiter__ = AsyncMock(return_value=iter([]))

        test_client.post("/api/goal/submit", json={"text": "add .editorconfig"})
        r = test_client.get("/api/goal/list")
        assert r.status_code == 200
        runs = r.json()
        assert len(runs) >= 1
        assert runs[-1]["goal_text"] == "add .editorconfig"
        assert runs[-1]["status"] in ("running", "done", "failed")


def test_get_single_run(test_client):
    """GET /api/goal/{id} should return the run details."""
    with patch("app.services.goal_runner.query", new_callable=AsyncMock) as mock_query:
        mock_query.return_value = AsyncMock()
        mock_query.return_value.__aiter__ = AsyncMock(return_value=iter([]))

        submit_resp = test_client.post("/api/goal/submit", json={"text": "fix typo in readme"})
        run_id = submit_resp.json()["id"]

        r = test_client.get(f"/api/goal/{run_id}")
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == run_id
        assert body["goal_text"] == "fix typo in readme"


def test_get_nonexistent_run(test_client):
    """GET /api/goal/{id} for unknown id returns error."""
    r = test_client.get("/api/goal/nonexist")
    assert r.status_code == 200
    assert r.json() == {"error": "not found"}
