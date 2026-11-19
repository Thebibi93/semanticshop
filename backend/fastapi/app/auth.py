import secrets

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import settings

bearer_scheme = HTTPBearer(auto_error=False)


def decode_jwt(token):
    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            issuer=settings.jwt_issuer,
            options={"require": ["exp", "sub", "iat"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide")


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentification requise (JWT)")
    return decode_jwt(credentials.credentials)


def require_staff_or_internal(
    request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)
):
    api_key = request.headers.get("x-internal-api-key")
    if api_key and secrets.compare_digest(api_key, settings.internal_api_key):
        return {"role": "internal"}
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentification requise (JWT ou clé API interne)"
        )
    payload = decode_jwt(credentials.credentials)
    if payload.get("role") in ("admin", "staff"):
        return payload
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN, detail="Réservé aux administrateurs ou au service interne"
    )
