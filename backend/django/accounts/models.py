from django.conf import settings
from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ("customer", "Client"),
        ("staff", "Équipe catalogue"),
        ("admin", "Administrateur"),
    ]

    user = models.OneToOneField(User, related_name="profile", on_delete=models.CASCADE)
    role = models.CharField("Rôle", max_length=20, choices=ROLE_CHOICES, default="customer")

    class Meta:
        verbose_name = "Profil utilisateur"
        verbose_name_plural = "Profils utilisateurs"

    def __str__(self):
        return f"{self.user.username} ({self.role})"


def default_role(user):
    return "admin" if user.is_superuser else "customer"
