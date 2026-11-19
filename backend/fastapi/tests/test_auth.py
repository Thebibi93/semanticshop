def test_search_without_token_returns_401(client):
    response = client.get("/search/semantic", params={"q": "casque"})
    assert response.status_code == 401


def test_search_with_garbage_token_returns_401(client):
    response = client.get("/search/semantic", params={"q": "casque"}, headers={"Authorization": "Bearer garbage"})
    assert response.status_code == 401


def test_search_with_expired_token_returns_401(client):
    from tests.conftest import make_token

    response = client.get(
        "/search/semantic", params={"q": "casque"}, headers={"Authorization": f"Bearer {make_token(expired=True)}"}
    )
    assert response.status_code == 401


def test_search_with_wrong_issuer_returns_401(client, fake_embedder):
    import time

    import jwt

    from app.config import settings

    now = int(time.time())
    token = jwt.encode(
        {"sub": "1", "role": "customer", "iat": now, "exp": now + 60, "iss": "autre-service"},
        settings.jwt_secret,
        algorithm="HS256",
    )
    response = client.get("/search/semantic", params={"q": "casque"}, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_index_with_customer_token_returns_403(client):
    from tests.conftest import make_token

    response = client.post(
        "/embeddings/index",
        json={"product_id": 1},
        headers={"Authorization": f"Bearer {make_token(role='customer')}"},
    )
    assert response.status_code == 403


def test_index_with_admin_token_returns_201(client):
    from tests.conftest import make_token

    response = client.post(
        "/embeddings/index",
        json={"product_id": 1},
        headers={"Authorization": f"Bearer {make_token(role='admin')}"},
    )
    assert response.status_code == 201


def test_index_with_internal_key_alone_returns_201(client):
    response = client.post("/embeddings/index", json={"product_id": 1}, headers={"X-Internal-Api-Key": "test-internal-key"})
    assert response.status_code == 201


def test_index_with_wrong_internal_key_returns_401(client):
    response = client.post("/embeddings/index", json={"product_id": 1}, headers={"X-Internal-Api-Key": "mauvaise-cle"})
    assert response.status_code == 401
