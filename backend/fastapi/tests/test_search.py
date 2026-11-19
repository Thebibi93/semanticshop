def test_search_returns_sorted_results_with_scores(client):
    from tests.conftest import make_token

    response = client.get(
        "/search/semantic",
        params={"q": "casque sans fil", "limit": 2},
        headers={"Authorization": f"Bearer {make_token()}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "casque sans fil"
    assert data["count"] == 2
    scores = [item["score"] for item in data["results"]]
    assert scores == sorted(scores, reverse=True)
    assert data["results"][0]["title"] == "Casque sans fil"
    assert all("price" in item and "category" in item for item in data["results"])


def test_search_forwards_filters_to_repository(client, fake_repo):
    from tests.conftest import make_token

    response = client.get(
        "/search/semantic",
        params={"q": "clavier", "limit": 5, "min_price": 10, "max_price": 100, "in_stock": True, "category": "info"},
        headers={"Authorization": f"Bearer {make_token()}"},
    )
    assert response.status_code == 200
    call = fake_repo.search_calls[0]
    assert call["limit"] == 5
    assert call["min_price"] == 10
    assert call["max_price"] == 100
    assert call["in_stock"] is True
    assert call["category"] == "info"


def test_search_with_empty_query_returns_422(client):
    from tests.conftest import make_token

    response = client.get("/search/semantic", params={"q": ""}, headers={"Authorization": f"Bearer {make_token()}"})
    assert response.status_code == 422


def test_search_without_model_ready_returns_503(fake_repo):
    from tests.conftest import FakeEmbedder, make_token

    from app.main import create_app

    from fastapi.testclient import TestClient

    app = create_app(embedder=FakeEmbedder(ready=False), repo=fake_repo)
    client = TestClient(app)
    response = client.get("/search/semantic", params={"q": "casque"}, headers={"Authorization": f"Bearer {make_token()}"})
    assert response.status_code == 503


def test_health_is_public(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert data["dimension"] == 384
