"""Session cookie helpers — itsdangerous-signed payloads.

We don't store anything server-side. The cookie itself is the session.
itsdangerous prevents tampering (HMAC-signed); we still treat the contents
as untrusted on read and validate before use.

TODO (W2): rotate _SECRET to one loaded from env (`SuperPmAgent_SECRET`).
"""
from itsdangerous import BadSignature, URLSafeSerializer

# W1 末 dev secret. W2 reads from env.
_SECRET = "SuperPmAgent-dev-secret-change-in-prod"
_serializer = URLSafeSerializer(_SECRET, salt="SuperPmAgent.session")


def encode(payload: dict) -> str:
    return _serializer.dumps(payload)


def decode(token: str) -> dict:
    try:
        result = _serializer.loads(token)
    except BadSignature:
        return {}
    if not isinstance(result, dict):
        return {}
    return result
