"""Session cookie helpers — itsdangerous-signed payloads.

Upgrade notes (W2):
- URLSafeSerializer → URLSafeTimedSerializer (7-day expiry).
- Sensitive fields (github_token, anthropic_key) encrypted with Fernet.
- decode() falls back to legacy unsigned format for backward compat.
"""
import logging

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import settings
from app.services.crypto import decrypt, encrypt

_SECRET = settings.SuperPmAgent_secret or "SuperPmAgent-dev-secret-change-in-prod"
if not settings.SuperPmAgent_secret:
    logging.warning("SuperPmAgent_SECRET not set — using dev secret. Set it in .env for production.")

_serializer = URLSafeTimedSerializer(_SECRET, salt="SuperPmAgent.session")

MAX_AGE = 7 * 24 * 3600  # 7 days — matches cookie max_age in auth.py

_ENCRYPTED_FIELDS = ("github_token", "anthropic_key")


def encode(payload: dict) -> str:
    out = dict(payload)
    for field in _ENCRYPTED_FIELDS:
        val = out.get(field)
        if val:
            out[field] = encrypt(val)
    return _serializer.dumps(out)


def decode(token: str) -> dict:
    try:
        result = _serializer.loads(token, max_age=MAX_AGE)
    except SignatureExpired:
        return {}
    except BadSignature:
        # Backward compat: try without max_age (old URLSafeSerializer cookies)
        try:
            from itsdangerous import URLSafeSerializer as _Legacy
            legacy = _Legacy(_SECRET, salt="SuperPmAgent.session")
            result = legacy.loads(token)
        except BadSignature:
            return {}
        if not isinstance(result, dict):
            return {}
        return result

    if not isinstance(result, dict):
        return {}

    for field in _ENCRYPTED_FIELDS:
        val = result.get(field)
        if val:
            try:
                result[field] = decrypt(val)
            except Exception:
                pass
    return result
