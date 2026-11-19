from decimal import Decimal

from django.db import connection, IntegrityError
from django.test import TestCase

from catalog.models import Category, Product
from catalog.vector_field import EmbeddingVectorField


class ProductModelTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Informatique", slug="informatique")
        self.product = Product.objects.create(
            title="Clavier mécanique",
            description="Switches tactiles",
            category=self.category,
            price=Decimal("89.90"),
            stock=12,
        )

    def test_str_contains_title_and_category(self):
        self.assertIn("Clavier mécanique", str(self.product))
        self.assertIn("Informatique", str(self.product))

    def test_category_str(self):
        self.assertEqual(str(self.category), "Informatique")

    def test_product_defaults(self):
        self.assertTrue(self.product.is_active)
        self.assertIsNone(self.product.embedding)
        self.assertEqual(self.product.embedding_model, "")

    def test_title_is_unique(self):
        with self.assertRaises(IntegrityError):
            Product.objects.create(title="Clavier mécanique", category=self.category, price=1, stock=1)

    def test_deleting_category_with_products_is_protected(self):
        with self.assertRaises(Exception):
            self.category.delete()

    def test_embedding_field_type_per_backend(self):
        field = EmbeddingVectorField(dimensions=384)
        db_type = field.db_type(connection)
        expected = f"vector(384)" if connection.vendor == "postgresql" else "text"
        self.assertEqual(db_type, expected)
