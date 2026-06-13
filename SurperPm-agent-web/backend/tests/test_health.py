"""Smoke tests for the FastAPI app."""
from fastapi.testclient import TestClient

from app.main import app


def test_health() -> None:
    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_root() -> None:
    client = TestClient(app)
    r = client.get("/")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "SuperPmAgent-web"
    assert body["status"] == "ok"


def test_me_unauthenticated() -> None:
    """GET /api/auth/me without cookie -> 401."""
    client = TestClient(app)
    r = client.get("/api/auth/me")
    assert r.status_code == 401
