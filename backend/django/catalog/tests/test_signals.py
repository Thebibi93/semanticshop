from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings

from catalog.models import Category, Product
from catalog.signals import _notify_indexing, dispatch_indexing


class NotifyIndexingTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Test", slug="test")
        self.product = Product.objects.create(title="Produit test", category=self.category, price=10, stock=5)

    @patch("catalog.signals.requests.post")
    def test_notify_posts_internal_key_and_payload(self, mock_post):
        _notify_indexing(self.product.id)
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertIn("/embeddings/index", args[0])
        self.assertEqual(kwargs["json"], {"product_id": self.product.id})
        self.assertIn("X-Internal-Api-Key", kwargs["headers"])

    @patch("catalog.signals.requests.post", side_effect=Exception("connexion refusée"))
    def test_notify_swallows_network_errors(self, mock_post):
        _notify_indexing(self.product.id)

    @patch("catalog.signals.threading.Thread")
    @override_settings(EMBED_ON_SAVE=False)
    def test_dispatch_disabled_does_not_spawn_thread(self, mock_thread):
        dispatch_indexing(self.product.id)
        mock_thread.assert_not_called()

    @patch("catalog.signals._notify_indexing")
    @patch("catalog.signals.threading.Thread")
    def test_dispatch_enabled_spawns_daemon_thread(self, mock_thread, mock_notify):
        dispatch_indexing(self.product.id)
        mock_thread.assert_called_once()
        kwargs = mock_thread.call_args.kwargs
        self.assertEqual(kwargs["target"], mock_notify)
        self.assertEqual(kwargs["args"], (self.product.id,))
        self.assertTrue(kwargs["daemon"])
        mock_thread.return_value.start.assert_called_once()
