import hashlib
import os
import time

import jwt
import numpy as np
import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("JWT_SECRET", "test-jwt-secret-semanticshop-0123456789abcdef")
os.environ.setdefault("INTERNAL_API_KEY", "test-internal-key")
os.environ.setdefault("JWT_ISSUER", "semanticshop")
os.environ.setdefault("DATABASE_URL", "postgresql://semanticshop:semanticshop@localhost:5432/semanticshop")

from app.main import create_app


class FakeEmbedder:
    def __init__(self, ready=True):
        self.model_name = "fake-embedder"
        self.dimension = 384
        self.ready = ready
        self.error = None
        self.calls = []

    def encode(self, texts):
        self.calls.extend(texts)
        return np.array([self.encode_one(t) for t in texts])

    def encode_one(self, text):
        self.calls.append(text)
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        raw = np.frombuffer(digest * 12, dtype=np.uint8)[: self.dimension].astype(np.float32)
        norm = float(np.linalg.norm(raw)) or 1.0
        return raw / norm


class FakeRepo:
    def __init__(self):
        self.products = {}
        self.saved = []
        self.search_calls = []
        self.similar_calls = []
        self.search_results = []
        self.similar_results = []

    def get_product(self, product_id):
        return self.products.get(product_id)

    def save_embedding(self, product_id, vector, model_name):
        self.saved.append((product_id, vector, model_name))
        return 1

    def search(self, query_vector, limit, min_price=None, max_price=None, in_stock=None, category=None):
        self.search_calls.append(
            {
                "limit": limit,
                "min_price": min_price,
                "max_price": max_price,
                "in_stock": in_stock,
                "category": category,
            }
        )
        return self.search_results[:limit]

    def similar(self, product_id, limit):
        self.similar_calls.append({"product_id": product_id, "limit": limit})
        if self.similar_results is None:
            return None
        return self.similar_results[:limit]


def make_token(role="customer", expired=False):
    now = int(time.time())
    payload = {
        "sub": "1",
        "username": "tester",
        "role": role,
        "iat": now,
        "exp": now - 10 if expired else now + 3600,
        "iss": "semanticshop",
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm="HS256")


@pytest.fixture
def fake_embedder():
    return FakeEmbedder()


@pytest.fixture
def fake_repo():
    repo = FakeRepo()
    repo.products = {
        1: {"id": 1, "title": "Casque sans fil", "description": "Réduction de bruit active", "price": 149.9, "stock": 10, "category": "Électronique"},
        2: {"id": 2, "title": "Clavier mécanique", "description": "Switches tactiles", "price": 89.9, "stock": 5, "category": "Informatique"},
    }
    repo.search_results = [
        {"id": 1, "title": "Casque sans fil", "description": "Réduction de bruit active", "price": 149.9, "stock": 10, "category": "Électronique", "score": 0.92},
        {"id": 2, "title": "Clavier mécanique", "description": "Switches tactiles", "price": 89.9, "stock": 5, "category": "Informatique", "score": 0.71},
    ]
    repo.similar_results = [
        {"id": 2, "title": "Clavier mécanique", "description": "Switches tactiles", "price": 89.9, "stock": 5, "category": "Informatique", "score": 0.83}
    ]
    return repo


@pytest.fixture
def client(fake_embedder, fake_repo):
    app = create_app(embedder=fake_embedder, repo=fake_repo)
    return TestClient(app)
