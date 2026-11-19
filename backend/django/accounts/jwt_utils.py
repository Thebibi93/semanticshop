import time

import jwt
from django.conf import settings


def role_for_user(user):
    if user.is_superuser:
        return "admin"
    profile = getattr(user, "profile", None)
    return profile.role if profile else "customer"


def issue_token(user):
    now = int(time.time())
    role = role_for_user(user)
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": role,
        "iat": now,
        "exp": now + settings.JWT_TTL_SECONDS,
        "iss": settings.JWT_ISSUER,
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
    return token, role


def decode_token(token):
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=["HS256"],
        issuer=settings.JWT_ISSUER,
        options={"require": ["exp", "sub", "iat"]},
    )
