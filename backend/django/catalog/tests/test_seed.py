from django.test import TestCase

from catalog.management.commands.seed_products import create_demo_users, create_products, load_fallback
from catalog.models import Category, Product


class SeedTests(TestCase):
    def test_fallback_file_is_loadable(self):
        rows = load_fallback(None)
        self.assertGreaterEqual(len(rows), 50)
        for row in rows:
            self.assertIn("title", row)
            self.assertIn("description", row)
            self.assertIn("category", row)
            self.assertIn("price", row)

    def test_fallback_limit(self):
        rows = load_fallback(10)
        self.assertEqual(len(rows), 10)

    def test_create_products_is_idempotent(self):
        rows = load_fallback(12)
        first = create_products(rows)
        second = create_products(rows)
        self.assertEqual(first, 12)
        self.assertEqual(second, 0)
        self.assertEqual(Product.objects.count(), 12)
        self.assertTrue(Category.objects.exists())

    def test_demo_users_created_with_roles(self):
        create_demo_users()
        create_demo_users()
        from django.contrib.auth import get_user_model

        User = get_user_model()
        admin = User.objects.get(username="admin")
        demo = User.objects.get(username="demo")
        self.assertTrue(admin.is_superuser)
        self.assertEqual(admin.profile.role, "admin")
        self.assertEqual(demo.profile.role, "customer")
        self.assertEqual(User.objects.filter(username__in=["admin", "demo"]).count(), 2)
