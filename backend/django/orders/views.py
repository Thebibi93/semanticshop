import json
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import F
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from accounts.decorators import jwt_required
from catalog.models import Product

from .models import Order, OrderItem


class StockError(Exception):
    pass


def serialize_order(order):
    return {
        "id": order.id,
        "status": order.status,
        "total": float(order.total),
        "created_at": order.created_at.isoformat(),
        "items": [
            {
                "product_id": item.product_id,
                "title": item.product.title,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
            }
            for item in order.items.select_related("product")
        ],
    }


@csrf_exempt
@require_http_methods(["GET", "POST"])
@jwt_required
def order_list_create(request):
    user = request.jwt_user
    if request.method == "GET":
        orders = Order.objects.filter(user=user).prefetch_related("items__product").order_by("-created_at")
        return JsonResponse({"count": orders.count(), "results": [serialize_order(o) for o in orders]})

    try:
        data = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Corps de requête invalide"}, status=400)

    raw_items = data.get("items")
    if not isinstance(raw_items, list) or not raw_items:
        return JsonResponse({"detail": "Le panier est vide"}, status=400)

    parsed = []
    for raw in raw_items:
        try:
            product_id = int(raw.get("product_id"))
            quantity = int(raw.get("quantity", 1))
        except (TypeError, ValueError):
            return JsonResponse({"detail": "Article invalide"}, status=400)
        if quantity < 1:
            return JsonResponse({"detail": "Quantité invalide"}, status=400)
        parsed.append((product_id, quantity))

    try:
        with transaction.atomic():
            order = Order.objects.create(user=user)
            total = Decimal("0.00")
            for product_id, quantity in parsed:
                try:
                    product = Product.objects.get(pk=product_id, is_active=True)
                except Product.DoesNotExist:
                    raise StockError(f"Produit {product_id} introuvable")
                updated = Product.objects.filter(pk=product_id, stock__gte=quantity).update(
                    stock=F("stock") - quantity
                )
                if updated == 0:
                    raise StockError(f"Stock insuffisant pour « {product.title} »")
                OrderItem.objects.create(order=order, product=product, quantity=quantity, unit_price=product.price)
                total += product.price * quantity
            order.total = total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            order.save()
    except StockError as exc:
        return JsonResponse({"detail": str(exc)}, status=409)

    created = Order.objects.filter(pk=order.id).prefetch_related("items__product").first()
    return JsonResponse(serialize_order(created), status=201)


@require_http_methods(["GET"])
@jwt_required
def order_detail(request, pk):
    try:
        order = Order.objects.filter(user=request.jwt_user, pk=pk).prefetch_related("items__product").get()
    except Order.DoesNotExist:
        return JsonResponse({"detail": "Commande introuvable"}, status=404)
    return JsonResponse(serialize_order(order))
