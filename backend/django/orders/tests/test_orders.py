import json
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.jwt_utils import issue_token
from catalog.models import Category, Product
from orders.models import Order, OrderItem

User = get_user_model()


def auth_header(user):
    token, _ = issue_token(user)
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


class OrderFlowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pw123456")
        self.category = Category.objects.create(name="Informatique", slug="informatique")
        self.keyboard = Product.objects.create(
            title="Clavier mécanique",
            description="Switches tactiles",
            category=self.category,
            price=Decimal("89.90"),
            stock=10,
        )
        self.mouse = Product.objects.create(
            title="Souris ergonomique",
            description="Verticale",
            category=self.category,
            price=Decimal("39.99"),
            stock=3,
        )
        self.url = "/api/orders"

    def test_create_order_decrements_stock_and_computes_total(self):
        response = self.client.post(
            self.url,
            data=json.dumps(
                {"items": [{"product_id": self.keyboard.id, "quantity": 2}, {"product_id": self.mouse.id, "quantity": 1}]}
            ),
            content_type="application/json",
            **auth_header(self.user),
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(Decimal(str(data["total"])), Decimal("219.79"))
        self.keyboard.refresh_from_db()
        self.mouse.refresh_from_db()
        self.assertEqual(self.keyboard.stock, 8)
        self.assertEqual(self.mouse.stock, 2)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderItem.objects.count(), 2)
        self.assertEqual(data["status"], "pending")

    def test_order_requires_jwt(self):
        response = self.client.post(
            self.url,
            data=json.dumps({"items": [{"product_id": self.keyboard.id, "quantity": 1}]}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_insufficient_stock_returns_409_and_rolls_back(self):
        response = self.client.post(
            self.url,
            data=json.dumps({"items": [{"product_id": self.mouse.id, "quantity": 99}]}),
            content_type="application/json",
            **auth_header(self.user),
        )
        self.assertEqual(response.status_code, 409)
        self.mouse.refresh_from_db()
        self.assertEqual(self.mouse.stock, 3)
        self.assertEqual(Order.objects.count(), 0)

    def test_mixed_cart_with_one_stock_error_rolls_back_everything(self):
        response = self.client.post(
            self.url,
            data=json.dumps(
                {"items": [{"product_id": self.keyboard.id, "quantity": 1}, {"product_id": self.mouse.id, "quantity": 50}]}
            ),
            content_type="application/json",
            **auth_header(self.user),
        )
        self.assertEqual(response.status_code, 409)
        self.keyboard.refresh_from_db()
        self.mouse.refresh_from_db()
        self.assertEqual(self.keyboard.stock, 10)
        self.assertEqual(self.mouse.stock, 3)
        self.assertEqual(Order.objects.count(), 0)

    def test_unknown_product_returns_409(self):
        response = self.client.post(
            self.url,
            data=json.dumps({"items": [{"product_id": 9999, "quantity": 1}]}),
            content_type="application/json",
            **auth_header(self.user),
        )
        self.assertEqual(response.status_code, 409)

    def test_empty_items_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps({"items": []}),
            content_type="application/json",
            **auth_header(self.user),
        )
        self.assertEqual(response.status_code, 400)

    def test_invalid_body_returns_400(self):
        response = self.client.post(self.url, data="{oops", content_type="application/json", **auth_header(self.user))
        self.assertEqual(response.status_code, 400)

    def test_list_orders_scoped_to_user(self):
        other = User.objects.create_user(username="bob", password="pw123456")
        self.client.post(
            self.url,
            data=json.dumps({"items": [{"product_id": self.keyboard.id, "quantity": 1}]}),
            content_type="application/json",
            **auth_header(self.user),
        )
        response = self.client.get(self.url, **auth_header(other))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 0)
        response = self.client.get(self.url, **auth_header(self.user))
        self.assertEqual(response.json()["count"], 1)

    def test_order_detail_of_other_user_returns_404(self):
        other = User.objects.create_user(username="bob", password="pw123456")
        self.client.post(
            self.url,
            data=json.dumps({"items": [{"product_id": self.keyboard.id, "quantity": 1}]}),
            content_type="application/json",
            **auth_header(self.user),
        )
        order = Order.objects.first()
        response = self.client.get(f"/api/orders/{order.id}", **auth_header(other))
        self.assertEqual(response.status_code, 404)
