import os
from pathlib import Path
from urllib.parse import urlsplit

BASE_DIR = Path(__file__).resolve().parent.parent


def env(key, default=None):
    value = os.environ.get(key)
    return default if value is None or value == "" else value


def parse_database_url(url):
    if url.startswith("sqlite"):
        remainder = url[len("sqlite://"):]
        if remainder.startswith("//"):
            name = remainder[1:]
        elif remainder in ("", ":memory:"):
            name = ":memory:" if remainder == ":memory:" else str(BASE_DIR / "db.sqlite3")
        elif remainder.startswith("/"):
            name = str(BASE_DIR / remainder[1:])
        else:
            name = str(BASE_DIR / remainder)
        return {"ENGINE": "django.db.backends.sqlite3", "NAME": name}
    parts = urlsplit(url)
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": parts.path.lstrip("/") or "semanticshop",
        "USER": parts.username or "",
        "PASSWORD": parts.password or "",
        "HOST": parts.hostname or "localhost",
        "PORT": str(parts.port or 5432),
    }


SECRET_KEY = env("DJANGO_SECRET_KEY", "dev-insecure-change-me")
DEBUG = env("DJANGO_DEBUG", "false").lower() == "true"
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "catalog",
    "orders",
    "accounts",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {"default": parse_database_url(env("DATABASE_URL", "sqlite:///db.sqlite3"))}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Europe/Paris"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

JWT_SECRET = env("JWT_SECRET", SECRET_KEY)
JWT_TTL_SECONDS = int(env("JWT_TTL_SECONDS", "86400"))
JWT_ISSUER = "semanticshop"
INTERNAL_API_KEY = env("INTERNAL_API_KEY", "internal-service-key")
FASTAPI_URL = env("FASTAPI_URL", "http://localhost:8001")
EMBED_ON_SAVE = env("EMBED_ON_SAVE", "true").lower() == "true"
SEED_DATASET = env("SEED_DATASET", "ashraq/fashion-product-images-small")
SEED_LIMIT = int(env("SEED_LIMIT", "120"))

hf_home = env("HF_HOME")
if hf_home:
    os.environ["HF_HOME"] = hf_home

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
