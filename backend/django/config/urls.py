from django.contrib import admin
from django.http import JsonResponse
from django.urls import path

from accounts.views import login_view, me_view
from catalog.views import product_detail, product_list
from orders.views import order_detail, order_list_create

admin.site.site_header = "SemanticShop Administration"
admin.site.site_title = "SemanticShop"
admin.site.index_title = "Catalogue et commandes"


def health(request):
    return JsonResponse({"status": "ok", "service": "django"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login", login_view),
    path("api/auth/me", me_view),
    path("api/products", product_list),
    path("api/products/<int:pk>", product_detail),
    path("api/orders", order_list_create),
    path("api/orders/<int:pk>", order_detail),
    path("health", health),
]
