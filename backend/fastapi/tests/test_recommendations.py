def test_recommendations_returns_similar_products(client):
    from tests.conftest import make_token

    response = client.get(
        "/recommendations/1", params={"limit": 5}, headers={"Authorization": f"Bearer {make_token()}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["product_id"] == 1
    assert data["count"] == 1
    assert data["results"][0]["id"] == 2


def test_recommendations_forwards_limit(client, fake_repo):
    from tests.conftest import make_token

    client.get("/recommendations/1", params={"limit": 7}, headers={"Authorization": f"Bearer {make_token()}"})
    assert fake_repo.similar_calls[0]["limit"] == 7
    assert fake_repo.similar_calls[0]["product_id"] == 1


def test_recommendations_unknown_or_unindexed_product_returns_404(client, fake_repo):
    from tests.conftest import make_token

    fake_repo.similar_results = None
    response = client.get("/recommendations/1", headers={"Authorization": f"Bearer {make_token()}"})
    assert response.status_code == 404


def test_recommendations_require_token(client):
    response = client.get("/recommendations/1")
    assert response.status_code == 401
