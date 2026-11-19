import argparse
import itertools
import json
import random
import time
from pathlib import Path

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from catalog.models import Category, Product

FALLBACK_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "products.json"

TITLE_KEYS = ["productDisplayName", "title", "product_title", "name"]
DESCRIPTION_KEYS = ["description", "product_description", "content"]
CATEGORY_KEYS = ["masterCategory", "category", "product_category", "label"]
EXTRA_KEYS = ["subCategory", "articleType", "gender", "baseColour", "season", "usage", "year", "brand"]


def first_value(row, keys):
    for key in keys:
        value = row.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
        if value is not None and not isinstance(value, (dict, list)) and str(value).strip():
            return str(value).strip()
    return ""


def build_description(row):
    explicit = first_value(row, DESCRIPTION_KEYS)
    if explicit:
        return explicit
    extras = []
    for key in EXTRA_KEYS:
        value = row.get(key)
        if value is None or isinstance(value, (dict, list)):
            continue
        text = str(value).strip()
        if text and text not in extras:
            extras.append(text)
    return " · ".join(extras)


def load_huggingface(limit):
    from datasets import load_dataset

    dataset = load_dataset(settings.SEED_DATASET, split="train", streaming=True)
    rows = []
    seen = set()
    for row in itertools.islice(dataset, limit * 4):
        title = first_value(row, TITLE_KEYS)
        if len(title) < 5 or title.lower() in seen:
            continue
        seen.add(title.lower())
        rows.append(
            {
                "title": title[:255],
                "description": build_description(row),
                "category": first_value(row, CATEGORY_KEYS) or "Divers",
                "price": round(random.Random(title).uniform(9.9, 299.9), 2),
                "stock": 0 if random.Random(title + "stock").random() < 0.08 else random.Random(title + "stock").randint(3, 45),
            }
        )
        if len(rows) >= limit:
            break
    return rows


def load_fallback(limit):
    with open(FALLBACK_PATH, encoding="utf-8") as handle:
        rows = json.load(handle)
    return rows[:limit] if limit else rows


def create_demo_users():
    User = get_user_model()
    admin, created = User.objects.get_or_create(
        username="admin",
        defaults={"email": "admin@semanticshop.local", "is_staff": True, "is_superuser": True},
    )
    if created:
        admin.set_password("admin1234")
        admin.save()
    demo, created = User.objects.get_or_create(username="demo", defaults={"email": "demo@semanticshop.local"})
    if created:
        demo.set_password("demo1234")
        demo.save()
    if admin.profile.role != "admin":
        admin.profile.role = "admin"
        admin.profile.save()


def create_products(rows):
    created_count = 0
    for row in rows:
        category, _ = Category.objects.get_or_create(
            name=row["category"], defaults={"slug": slugify(row["category"])}
        )
        product, created = Product.objects.get_or_create(
            title=row["title"],
            defaults={
                "category": category,
                "description": row.get("description", ""),
                "price": row.get("price", 19.99),
                "stock": row.get("stock", 10),
            },
        )
        if created:
            created_count += 1
    return created_count


def wait_for_model(stderr):
    base_url = settings.FASTAPI_URL.rstrip("/")
    deadline = time.time() + 300
    while time.time() < deadline:
        try:
            response = requests.get(base_url + "/health", timeout=5)
            if response.ok and response.json().get("model_loaded"):
                return True
        except Exception:
            pass
        time.sleep(4)
    stderr.write("Modèle FastAPI indisponible, embeddings ignorés (lancez : manage.py reindex)")
    return False


def index_products(product_ids, stdout, stderr):
    base_url = settings.FASTAPI_URL.rstrip("/")
    if not wait_for_model(stderr):
        return
    try:
        response = requests.post(
            base_url + "/embeddings/index/batch",
            json={"product_ids": product_ids},
            headers={"X-Internal-Api-Key": settings.INTERNAL_API_KEY},
            timeout=900,
        )
        data = response.json()
        stdout.write(f"Embeddings indexés : {data.get('indexed', 0)}/{len(product_ids)}")
    except Exception as exc:
        stdout.write(f"Indexation impossible ({exc}). Relancez : manage.py reindex")


class Command(BaseCommand):
    help = "Charge un catalogue de produits depuis Hugging Face ou le fichier local"

    def add_arguments(self, parser):
        parser.add_argument("--source", choices=["auto", "hf", "fallback"], default="auto")
        parser.add_argument("--limit", type=int, default=None)
        parser.add_argument("--with-users", action=argparse.BooleanOptionalAction, default=True)
        parser.add_argument("--no-embed", action="store_true")

    def handle(self, *args, **options):
        limit = options["limit"] or settings.SEED_LIMIT
        if options["with_users"]:
            create_demo_users()
        source = options["source"]
        rows = []
        if source in ("auto", "hf"):
            try:
                rows = load_huggingface(limit)
                if rows:
                    self.stdout.write(f"Source Hugging Face : {settings.SEED_DATASET} ({len(rows)} produits)")
            except Exception as exc:
                self.stderr.write(f"Hugging Face indisponible ({exc})")
                if source == "hf":
                    return
        if not rows:
            rows = load_fallback(limit)
            self.stdout.write(f"Catalogue local : {len(rows)} produits")
        previous = settings.EMBED_ON_SAVE
        settings.EMBED_ON_SAVE = False
        try:
            created = create_products(rows)
        finally:
            settings.EMBED_ON_SAVE = previous
        total = Product.objects.count()
        self.stdout.write(f"Produits créés : {created} (total catalogue : {total})")
        if options["no_embed"]:
            self.stdout.write("Indexation désactivée (--no-embed)")
            return
        index_products(list(Product.objects.values_list("id", flat=True)), self.stdout, self.stderr)
