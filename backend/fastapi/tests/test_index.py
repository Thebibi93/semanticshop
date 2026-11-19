def test_index_stores_embedding_and_uses_product_text(client, fake_repo, fake_embedder):
    from tests.conftest import make_token

    response = client.post(
        "/embeddings/index",
        json={"product_id": 1},
        headers={"Authorization": f"Bearer {make_token(role='admin')}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["product_id"] == 1
    assert data["dimension"] == 384
    assert data["model"] == "fake-embedder"
    assert len(fake_repo.saved) == 1
    saved_id, saved_vector, saved_model = fake_repo.saved[0]
    assert saved_id == 1
    assert len(saved_vector) == 384
    assert saved_model == "fake-embedder"
    text = fake_embedder.calls[-1]
    assert "Casque sans fil" in text
    assert "Réduction de bruit active" in text
    assert "Électronique" in text


def test_index_unknown_product_returns_404(client, fake_repo):
    from tests.conftest import make_token

    response = client.post(
        "/embeddings/index",
        json={"product_id": 999},
        headers={"Authorization": f"Bearer {make_token(role='admin')}"},
    )
    assert response.status_code == 404


def test_index_without_model_ready_returns_503(fake_repo):
    from tests.conftest import FakeEmbedder, make_token

    from app.main import create_app

    from fastapi.testclient import TestClient

    app = create_app(embedder=FakeEmbedder(ready=False), repo=fake_repo)
    client = TestClient(app)
    response = client.post(
        "/embeddings/index",
        json={"product_id": 1},
        headers={"X-Internal-Api-Key": "test-internal-key"},
    )
    assert response.status_code == 503


def test_batch_index_returns_counts(client, fake_repo):
    from tests.conftest import make_token

    fake_repo.products[3] = {"id": 3, "title": "Souris ergonomique", "description": "", "price": 39.9, "stock": 4, "category": "Informatique"}
    response = client.post(
        "/embeddings/index/batch",
        json={"product_ids": [1, 2, 3, 999]},
        headers={"X-Internal-Api-Key": "test-internal-key"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["requested"] == 4
    assert data["indexed"] == 3
    errors = [r for r in data["results"] if not r["indexed"]]
    assert len(errors) == 1
    assert errors[0]["product_id"] == 999


def test_batch_index_rejects_more_than_500(client):
    response = client.post(
        "/embeddings/index/batch",
        json={"product_ids": list(range(501))},
        headers={"X-Internal-Api-Key": "test-internal-key"},
    )
    assert response.status_code == 422
