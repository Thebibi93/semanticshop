import requests
from django.conf import settings
from django.contrib import admin, messages
from django.utils.html import format_html

from .models import Category, Product


class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "product_count"]
    prepopulated_fields = {"slug": ["name"]}
    search_fields = ["name"]

    def product_count(self, obj):
        return obj.products.count()

    product_count.short_description = "Produits"


class ProductAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "price", "stock", "is_active", "embedding_badge"]
    list_display_links = ["title"]
    list_editable = ["price", "stock", "is_active"]
    list_filter = ["category", "is_active"]
    search_fields = ["title", "description"]
    readonly_fields = ["embedding_model", "embedding_updated_at"]
    actions = ["reindex_products"]

    fieldsets = (
        ("Produit", {"fields": ["title", "category", "description", "price", "stock", "is_active"]}),
        ("Embedding", {"fields": ["embedding_model", "embedding_updated_at"], "classes": ["collapse"]}),
    )

    @admin.action(description="Réindexer les embeddings via FastAPI")
    def reindex_products(self, request, queryset):
        ids = list(queryset.values_list("id", flat=True))
        if not ids:
            return
        try:
            response = requests.post(
                settings.FASTAPI_URL.rstrip("/") + "/embeddings/index/batch",
                json={"product_ids": ids},
                headers={"X-Internal-Api-Key": settings.INTERNAL_API_KEY},
                timeout=600,
            )
            data = response.json()
            indexed = data.get("indexed", 0)
            messages.success(request, f"{indexed} produit(s) réindexé(s) sur {len(ids)}")
        except Exception as exc:
            messages.error(request, f"Échec de la réindexation : {exc}")

    def embedding_badge(self, obj):
        if obj.embedding_updated_at:
            return format_html('<span style="color:#16a34a;font-weight:600">indexé</span>')
        return format_html('<span style="color:#dc2626;font-weight:600">non indexé</span>')

    embedding_badge.short_description = "Embedding"


admin.site.register(Category, CategoryAdmin)
admin.site.register(Product, ProductAdmin)
