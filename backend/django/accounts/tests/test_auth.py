import json
from unittest.mock import patch

import jwt
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from accounts.jwt_utils import decode_token, issue_token

User = get_user_model()


class JwtUtilsTests(TestCase):
    def test_issue_token_contains_claims(self):
        user = User.objects.create_user(username="alice", password="pw123456")
        token, role = issue_token(user)
        self.assertEqual(role, "customer")
        payload = decode_token(token)
        self.assertEqual(payload["sub"], str(user.id))
        self.assertEqual(payload["username"], "alice")
        self.assertEqual(payload["role"], "customer")
        self.assertEqual(payload["iss"], "semanticshop")

    def test_superuser_role_is_admin(self):
        user = User.objects.create_user(username="boss", password="pw123456", is_superuser=True)
        token, role = issue_token(user)
        self.assertEqual(role, "admin")

    def test_decode_expired_token_raises(self):
        import time as time_module

        user = User.objects.create_user(username="bob", password="pw123456")
        with patch("accounts.jwt_utils.time.time", return_value=1000):
            token, _ = issue_token(user)
        with self.assertRaises(jwt.ExpiredSignatureError):
            decode_token(token)


class LoginViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pw123456")
        self.url = "/api/auth/login"

    def test_login_success_returns_token(self):
        response = self.client.post(
            self.url,
            data=json.dumps({"username": "alice", "password": "pw123456"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("token", data)
        self.assertEqual(data["role"], "customer")
        self.assertEqual(data["username"], "alice")

    def test_login_wrong_password_returns_401(self):
        response = self.client.post(
            self.url,
            data=json.dumps({"username": "alice", "password": "mauvais"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_login_invalid_body_returns_400(self):
        response = self.client.post(self.url, data="{oops", content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_me_requires_token(self):
        response = self.client.get("/api/auth/me")
        self.assertEqual(response.status_code, 401)

    def test_me_with_token_returns_profile(self):
        token, _ = issue_token(self.user)
        response = self.client.get("/api/auth/me", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["username"], "alice")

    def test_me_with_garbage_token_returns_401(self):
        response = self.client.get("/api/auth/me", HTTP_AUTHORIZATION="Bearer abc.def.ghi")
        self.assertEqual(response.status_code, 401)
