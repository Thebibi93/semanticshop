import logging
import threading
import time

import requests
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Product

logger = logging.getLogger(__name__)


def _notify_indexing(product_id):
    url = settings.FASTAPI_URL.rstrip("/") + "/embeddings/index"
    for attempt in range(5):
        try:
            response = requests.post(
                url,
                json={"product_id": product_id},
                headers={"X-Internal-Api-Key": settings.INTERNAL_API_KEY},
                timeout=30,
            )
            if response.status_code != 503:
                return
        except Exception:
            logger.warning("Notification d'indexation impossible pour le produit %s", product_id)
        time.sleep(4)


def dispatch_indexing(product_id):
    if not settings.EMBED_ON_SAVE:
        return
    threading.Thread(target=_notify_indexing, args=(product_id,), daemon=True).start()


@receiver(post_save, sender=Product)
def product_saved(sender, instance, **kwargs):
    dispatch_indexing(instance.id)
