from sqlalchemy import and_, func, select, update

from .db import categories, products


class ProductRepository:
    def __init__(self, engine):
        self.engine = engine

    def get_product(self, product_id):
        stmt = (
            select(
                products.c.id,
                products.c.title,
                products.c.description,
                products.c.price,
                products.c.stock,
                categories.c.name.label("category"),
            )
            .join(categories, products.c.category_id == categories.c.id, isouter=True)
            .where(products.c.id == product_id)
        )
        with self.engine.connect() as conn:
            row = conn.execute(stmt).mappings().first()
        return dict(row) if row else None

    def save_embedding(self, product_id, vector, model_name):
        stmt = (
            update(products)
            .where(products.c.id == product_id)
            .values(embedding=vector, embedding_model=model_name, embedding_updated_at=func.now())
        )
        with self.engine.begin() as conn:
            result = conn.execute(stmt)
        return result.rowcount

    def search(self, query_vector, limit, min_price=None, max_price=None, in_stock=None, category=None):
        distance = products.c.embedding.cosine_distance(query_vector)
        conditions = [products.c.embedding.is_not(None), products.c.is_active.is_(True)]
        if min_price is not None:
            conditions.append(products.c.price >= min_price)
        if max_price is not None:
            conditions.append(products.c.price <= max_price)
        if in_stock:
            conditions.append(products.c.stock > 0)
        if category:
            conditions.append(categories.c.name.ilike(f"%{category}%"))
        stmt = (
            select(
                products.c.id,
                products.c.title,
                products.c.description,
                products.c.price,
                products.c.stock,
                categories.c.name.label("category"),
                (1.0 - distance).label("score"),
            )
            .join(categories, products.c.category_id == categories.c.id, isouter=True)
            .where(and_(*conditions))
            .order_by(distance.asc())
            .limit(limit)
        )
        with self.engine.connect() as conn:
            rows = conn.execute(stmt).mappings().all()
        return [dict(row) for row in rows]

    def get_embedding(self, product_id):
        stmt = select(products.c.embedding).where(products.c.id == product_id)
        with self.engine.connect() as conn:
            value = conn.execute(stmt).scalar()
        return value

    def similar(self, product_id, limit):
        base = self.get_embedding(product_id)
        if base is None:
            return None
        distance = products.c.embedding.cosine_distance(base)
        stmt = (
            select(
                products.c.id,
                products.c.title,
                products.c.description,
                products.c.price,
                products.c.stock,
                categories.c.name.label("category"),
                (1.0 - distance).label("score"),
            )
            .join(categories, products.c.category_id == categories.c.id, isouter=True)
            .where(
                products.c.embedding.is_not(None),
                products.c.is_active.is_(True),
                products.c.id != product_id,
            )
            .order_by(distance.asc())
            .limit(limit)
        )
        with self.engine.connect() as conn:
            rows = conn.execute(stmt).mappings().all()
        return [dict(row) for row in rows]
