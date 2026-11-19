import json

from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .models import Product

PAGE_SIZE = 24


def serialize_product(product):
    return {
        "id": product.id,
        "title": product.title,
        "description": product.description,
        "category": product.category.name if product.category else None,
        "price": float(product.price),
        "stock": product.stock,
        "indexed": product.embedding_updated_at is not None,
        "created_at": product.created_at.isoformat(),
    }


@require_http_methods(["GET"])
def product_list(request):
    query = Product.objects.filter(is_active=True).select_related("category").order_by("-created_at")
    q = (request.GET.get("q") or "").strip()
    if q:
        query = query.filter(Q(title__icontains=q) | Q(description__icontains=q))
    try:
        page = max(1, int(request.GET.get("page", "1")))
    except ValueError:
        page = 1
    total = query.count()
    start = (page - 1) * PAGE_SIZE
    products = list(query[start:start + PAGE_SIZE])
    return JsonResponse(
        {
            "count": total,
            "page": page,
            "page_size": PAGE_SIZE,
            "has_next": start + PAGE_SIZE < total,
            "results": [serialize_product(p) for p in products],
        }
    )


@require_http_methods(["GET"])
def product_detail(request, pk):
    try:
        product = Product.objects.select_related("category").get(pk=pk, is_active=True)
    except Product.DoesNotExist:
        return JsonResponse({"detail": "Produit introuvable"}, status=404)
    return JsonResponse(serialize_product(product))
