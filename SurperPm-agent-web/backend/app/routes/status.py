"""System status endpoint."""
import time

from fastapi import APIRouter

router = APIRouter()

_start_time = time.time()


@router.get("")
def status() -> dict:
    return {
        "version": "0.1.0",
        "uptime_seconds": round(time.time() - _start_time, 1),
        "env": "development",
    }
