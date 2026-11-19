from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, MetaData, Numeric, String, Table, Text, create_engine

from pgvector.sqlalchemy import Vector

from .config import settings

metadata = MetaData()

categories = Table(
    "catalog_category",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(120), nullable=False),
    Column("slug", String(140), nullable=False),
)

products = Table(
    "catalog_product",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("category_id", Integer, ForeignKey("catalog_category.id")),
    Column("title", String(255), nullable=False),
    Column("description", Text),
    Column("price", Numeric(10, 2), nullable=False),
    Column("stock", Integer, nullable=False),
    Column("is_active", Boolean, nullable=False),
    Column("embedding", Vector(settings.embedding_dim)),
    Column("embedding_model", String(160)),
    Column("embedding_updated_at", DateTime),
    Column("created_at", DateTime),
    Column("updated_at", DateTime),
)

engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
