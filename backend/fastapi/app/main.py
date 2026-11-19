import threading
import time
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .auth import get_current_user, require_staff_or_internal
from .config import settings
from .db import engine
from .embedder import Embedder, build_product_text
from .repository import ProductRepository


class IndexRequest(BaseModel):
    product_id: int


class BatchIndexRequest(BaseModel):
    product_ids: List[int] = Field(..., max_length=500)


def load_model_with_retry(embedder, attempts=20, delay=15):
    for _ in range(attempts):
        try:
            embedder.load()
            return
        except Exception:
            time.sleep(delay)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if app.state.injected:
        yield
        return
    app.state.embedder = Embedder(settings.embedding_model, settings.embedding_dim)
    app.state.repo = ProductRepository(engine)
    threading.Thread(target=load_model_with_retry, args=(app.state.embedder,), daemon=True).start()
    yield


def serialize_row(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "category": row["category"],
        "price": float(row["price"]),
        "stock": row["stock"],
        "score": round(max(0.0, float(row["score"])), 4),
    }


def ensure_ready(embedder):
    if embedder is None or not embedder.ready:
        detail = "Modèle d'embeddings indisponible"
        if embedder is not None and embedder.error:
            detail = f"{detail} : {embedder.error}"
        raise HTTPException(status_code=503, detail=detail)


def create_app(embedder=None, repo=None):
    app = FastAPI(title="SemanticShop - API sémantique", version="1.0.0", lifespan=lifespan)
    app.state.embedder = embedder
    app.state.repo = repo
    app.state.injected = embedder is not None or repo is not None
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    return app


def get_embedder(request: Request):
    return request.app.state.embedder


def get_repo(request: Request):
    return request.app.state.repo


router = APIRouter()


@router.get("/health")
def health(request: Request):
    embedder = request.app.state.embedder
    payload = {
        "status": "ok",
        "service": "semantic",
        "model_loaded": bool(embedder is not None and embedder.ready),
        "model": settings.embedding_model,
        "dimension": settings.embedding_dim,
    }
    if embedder is not None and embedder.error:
        payload["error"] = embedder.error
    return payload


@router.post("/embeddings/index", status_code=201)
def index_product(
    payload: IndexRequest,
    user=Depends(require_staff_or_internal),
    embedder=Depends(get_embedder),
    repo=Depends(get_repo),
):
    ensure_ready(embedder)
    product = repo.get_product(payload.product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    text = build_product_text(product["title"], product.get("description") or "", product.get("category") or "")
    vector = embedder.encode_one(text)
    repo.save_embedding(payload.product_id, [float(v) for v in vector], embedder.model_name)
    return {
        "product_id": payload.product_id,
        "model": embedder.model_name,
        "dimension": len(vector),
        "indexed": True,
    }


@router.post("/embeddings/index/batch")
def index_batch(
    payload: BatchIndexRequest,
    user=Depends(require_staff_or_internal),
    embedder=Depends(get_embedder),
    repo=Depends(get_repo),
):
    ensure_ready(embedder)
    results = []
    indexed = 0
    for product_id in payload.product_ids:
        product = repo.get_product(product_id)
        if product is None:
            results.append({"product_id": product_id, "indexed": False, "error": "Produit introuvable"})
            continue
        try:
            text = build_product_text(product["title"], product.get("description") or "", product.get("category") or "")
            vector = embedder.encode_one(text)
            repo.save_embedding(product_id, [float(v) for v in vector], embedder.model_name)
            indexed += 1
            results.append({"product_id": product_id, "indexed": True})
        except Exception as exc:
            results.append({"product_id": product_id, "indexed": False, "error": str(exc)})
    return {"requested": len(payload.product_ids), "indexed": indexed, "results": results}


@router.get("/search/semantic")
def search_semantic(
    q: str = Query(min_length=1),
    limit: int = Query(10, ge=1, le=50),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    in_stock: Optional[bool] = None,
    category: Optional[str] = None,
    user=Depends(get_current_user),
    embedder=Depends(get_embedder),
    repo=Depends(get_repo),
):
    ensure_ready(embedder)
    query = q.strip()
    if not query:
        raise HTTPException(status_code=422, detail="Requête vide")
    vector = embedder.encode_one(query)
    rows = repo.search(vector, limit, min_price=min_price, max_price=max_price, in_stock=in_stock, category=category)
    return {"query": query, "count": len(rows), "results": [serialize_row(row) for row in rows]}


@router.get("/recommendations/{product_id}")
def recommendations(
    product_id: int,
    limit: int = Query(5, ge=1, le=20),
    user=Depends(get_current_user),
    embedder=Depends(get_embedder),
    repo=Depends(get_repo),
):
    rows = repo.similar(product_id, limit)
    if rows is None:
        raise HTTPException(status_code=404, detail="Produit introuvable ou non indexé")
    return {"product_id": product_id, "count": len(rows), "results": [serialize_row(row) for row in rows]}


app = create_app()
