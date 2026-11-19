import json

from django.contrib.auth import authenticate
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .decorators import jwt_required
from .jwt_utils import issue_token


@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    try:
        data = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Corps de requête invalide"}, status=400)
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"detail": "Identifiants invalides"}, status=401)
    token, role = issue_token(user)
    return JsonResponse({"token": token, "username": user.username, "role": role, "expires_in": 86400})


@require_http_methods(["GET"])
@jwt_required
def me_view(request):
    return JsonResponse(
        {
            "username": request.jwt_user.username,
            "role": request.jwt_payload.get("role"),
            "email": request.jwt_user.email,
        }
    )
