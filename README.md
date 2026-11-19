# SemanticShop

Application e-commerce avec **recherche sémantique en langage naturel** : les clients décrivent ce qu'ils cherchent (« une enceinte pour écouter de la musique sous la douche ») et reçoivent les produits les plus proches via des embeddings vectoriels, pendant que l'équipe gère le catalogue et les commandes dans l'admin Django.

## Stack

| Service | Rôle | Port |
|---|---|---|
| **PostgreSQL + pgvector** | Données relationnelles + vecteurs d'embeddings | 5432 (interne) |
| **Django** | Admin catalogue, commandes, utilisateurs, émission des JWT | 8000 |
| **FastAPI** | Embeddings, recherche sémantique, recommandations | 8001 |
| **Angular + nginx** | Interface web (SPA TypeScript) + reverse proxy API | **8080** |

Flux : à chaque sauvegarde d'un produit dans Django, un signal notifie FastAPI qui calcule l'embedding (titre + description + catégorie, modèle sentence-transformers) et le stocke dans la colonne pgvector. La recherche compare les vecteurs par **similarité cosinus**.

## Lancer l'application

Prérequis : [Docker](https://docs.docker.com/get-docker/) (avec le plugin compose).

```bash
docker compose up --build -d
docker compose exec django python manage.py seed_products
```

Puis ouvre **http://localhost:8080**.

- Le premier démarrage télécharge le modèle d'embeddings (~500 Mo) : patiente 2 à 5 minutes, ou suis l'avancement avec `docker compose logs -f fastapi`.
- `seed_products` charge les produits depuis le dataset Hugging Face (`ashraq/fashion-product-images-small`) via la librairie `datasets` et calcule leurs embeddings automatiquement. Si Hugging Face est inaccessible, un catalogue local français est utilisé en secours.

### Comptes de démonstration

| Identifiant | Mot de passe | Rôle |
|---|---|---|
| `admin` | `admin1234` | Équipe (admin) |
| `demo` | `demo1234` | Client |

Connexion depuis le front (bouton « Connexion ») ou sur **http://localhost:8000/admin/** pour l'administration.

## Tester

```bash
make test
make test-front
```

Détail :

```bash
docker compose exec django python manage.py test
docker compose exec fastapi pytest -q
cd frontend && npm install && npm run test:ci
```

La suite Angular (52 tests, Vitest + TestBed) couvre les stores (auth, panier), les services API, l'intercepteur JWT et tous les composants (recherche, connexion, carte produit, recommandations, panier, commandes).

## Endpoints principaux

**FastAPI** (http://localhost:8001/docs, JWT obligatoire sauf `/health`) :

| Méthode | Route | Description |
|---|---|---|
| POST | `/embeddings/index` | Recalcule l'embedding d'un produit (JWT admin/staff ou clé interne) |
| POST | `/embeddings/index/batch` | Indexation en lot (service interne) |
| GET | `/search/semantic?q=...` | Recherche sémantique (filtres `min_price`, `max_price`, `in_stock`, `category`) |
| GET | `/recommendations/{product_id}` | Produits similaires par similarité cosinus |
| GET | `/health` | État du service et du modèle |

**Django** (http://localhost:8000) :

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Connexion → JWT HS256 signé par Django |
| GET | `/api/products` | Catalogue paginé (public) |
| GET/POST | `/api/orders` | Commandes de l'utilisateur (JWT), décrémente le stock |
| GET | `/admin/` | Administration du catalogue |

Le front Angular appelle tout via nginx (même origine) : `/api/...` → Django, `/semantic/...` → FastAPI.

## Essayer la recherche

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "demo", "password": "demo1234"}' | python -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s "http://localhost:8001/search/semantic?q=casque%20silencieux%20pour%20le%20train&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

## Front Angular

```
frontend/
├── src/app/core/       stores (auth, panier, UI), services API, intercepteur JWT, pipe euros
├── src/app/features/   recherche, connexion, carte produit, recommandations, panier, commandes
├── src/*.spec.ts       tests unitaires (Vitest)
└── nginx.conf          reverse proxy /api → Django, /semantic → FastAPI
```

Fonctionnalités : recherche en langage naturel avec filtres prix/stock, scores de pertinence, recommandations « produits similaires », panier persistant, passage de commande, historique des commandes, session JWT conservée entre les visites.

Pour développer le front en local : `cd frontend && npm install && npm start` (http://localhost:4200).

## Commandes utiles

```bash
make up          # docker compose up --build -d
make seed        # charger les produits + embeddings
make reindex     # recalculer tous les embeddings
make test        # suites de tests Django + FastAPI
make test-front  # suite de tests Angular
make logs        # suivre les logs
make down        # arrêter
```

Variables d'environnement (copie `.env.example` vers `.env` pour les personnaliser) : `EMBEDDING_MODEL` (doit produire des vecteurs de 384 dimensions, ex. `sentence-transformers/all-MiniLM-L6-v2` plus léger), `SEED_DATASET`, `SEED_LIMIT`, `JWT_SECRET`, `INTERNAL_API_KEY`.

## Structure

```
semanticshop/
├── docker-compose.yml
├── frontend/            (Angular 22 + nginx)
└── backend/
    ├── django/
    │   ├── config/      (settings, urls)
    │   ├── catalog/     (Product, Category, champ pgvector, signaux, seed HF)
    │   ├── orders/      (Order, OrderItem, décrément de stock atomique)
    │   └── accounts/    (UserProfile, émission/validation JWT)
    └── fastapi/
        └── app/         (embedder, repository SQLAlchemy/pgvector, auth, routes)
```

## Pistes V2

Celery + Redis pour l'indexation asynchrone, images produits avec CLIP, authentification OAuth, cache des requêtes fréquentes, index HNSW sur pgvector pour de très grands catalogues.
