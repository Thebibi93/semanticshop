from django.db import models

from .vector_field import EmbeddingVectorField

EMBEDDING_DIMENSIONS = 384


class Category(models.Model):
    name = models.CharField("Nom", max_length=120, unique=True)
    slug = models.SlugField("Slug", max_length=140, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(
        Category, verbose_name="Catégorie", related_name="products", on_delete=models.PROTECT
    )
    title = models.CharField("Titre", max_length=255, unique=True)
    description = models.TextField("Description", blank=True, default="")
    price = models.DecimalField("Prix", max_digits=10, decimal_places=2, default=0)
    stock = models.PositiveIntegerField("Stock", default=0)
    is_active = models.BooleanField("Actif", default=True)
    embedding = EmbeddingVectorField(dimensions=EMBEDDING_DIMENSIONS, null=True, blank=True)
    embedding_model = models.CharField("Modèle d'embedding", max_length=160, blank=True, default="")
    embedding_updated_at = models.DateTimeField("Embedding mis à jour le", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Produit"
        verbose_name_plural = "Produits"

    def __str__(self):
        return f"{self.title} ({self.category.name})"
