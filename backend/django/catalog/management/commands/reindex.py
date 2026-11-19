import requests
from django.conf import settings
from django.core.management.base import BaseCommand

from catalog.models import Product


class Command(BaseCommand):
    help = "Recalcule les embeddings de tous les produits via le service FastAPI"

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=None)

    def handle(self, *args, **options):
        queryset = Product.objects.values_list("id", flat=True)
        ids = list(queryset[: options["limit"]] if options["limit"] else queryset)
        if not ids:
            self.stdout.write("Aucun produit à indexer")
            return
        try:
            response = requests.post(
                settings.FASTAPI_URL.rstrip("/") + "/embeddings/index/batch",
                json={"product_ids": ids},
                headers={"X-Internal-Api-Key": settings.INTERNAL_API_KEY},
                timeout=900,
            )
            response.raise_for_status()
            data = response.json()
            self.stdout.write(f"Embeddings indexés : {data.get('indexed', 0)}/{len(ids)}")
        except Exception as exc:
            self.stderr.write(f"Indexation impossible : {exc}")
