"""Shared test fixtures for backend tests.

Convention:
- Each test file (test_<feature>.py) tests one feature in isolation.
- Tests are self-contained: they set up their own temp data.
- Use these shared fixtures to avoid boilerplate.
"""
import os
import subprocess

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def temp_git_repo(tmp_path):
    """Create a temporary initialized git repo. Returns path as string."""
    repo = tmp_path / "repo"
    repo.mkdir()
    subprocess.run(["git", "init"], cwd=repo, check=True, capture_output=True)
    subprocess.run(
        ["git", "config", "user.email", "test@test.com"],
        cwd=repo, check=True, capture_output=True,
    )
    subprocess.run(
        ["git", "config", "user.name", "Test"],
        cwd=repo, check=True, capture_output=True,
    )
    readme = repo / "README.md"
    readme.write_text("# test repo\n")
    subprocess.run(["git", "add", "-A"], cwd=repo, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=repo, check=True, capture_output=True)
    return str(repo)


@pytest.fixture()
def app_client():
    """Basic TestClient for the FastAPI app (no extra env config)."""
    from app.main import app

    with TestClient(app) as client:
        yield client


@pytest.fixture()
def goal_client(temp_git_repo):
    """TestClient with goal-related env vars set to temp paths."""
    os.environ["PLUGIN_REPO_PATH"] = "/tmp/fake-plugin"
    os.environ["TARGET_REPO_PATH"] = temp_git_repo
    from app.main import app

    with TestClient(app) as client:
        yield client
    os.environ.pop("PLUGIN_REPO_PATH", None)
    os.environ.pop("TARGET_REPO_PATH", None)
