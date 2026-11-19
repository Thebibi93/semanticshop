import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import JsonResponse

from .jwt_utils import decode_token


def jwt_required(view):
    def wrapped(request, *args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return JsonResponse({"detail": "Authentification requise (JWT)"}, status=401)
        try:
            payload = decode_token(header[7:])
        except jwt.ExpiredSignatureError:
            return JsonResponse({"detail": "Token expiré"}, status=401)
        except jwt.InvalidTokenError:
            return JsonResponse({"detail": "Token invalide"}, status=401)
        user = get_user_model().objects.filter(pk=payload.get("sub")).first()
        if user is None:
            return JsonResponse({"detail": "Utilisateur inconnu"}, status=401)
        request.jwt_user = user
        request.jwt_payload = payload
        return view(request, *args, **kwargs)

    return wrapped
