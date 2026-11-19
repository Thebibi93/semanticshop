import os


class Settings:
    def __init__(self):
        self.database_url = os.getenv(
            "DATABASE_URL", "postgresql://semanticshop:semanticshop@localhost:5432/semanticshop"
        )
        self.jwt_secret = os.getenv("JWT_SECRET", "dev-jwt-change-me")
        self.internal_api_key = os.getenv("INTERNAL_API_KEY", "internal-service-key")
        self.embedding_model = os.getenv(
            "EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )
        self.embedding_dim = int(os.getenv("EMBEDDING_DIM", "384"))
        self.jwt_issuer = os.getenv("JWT_ISSUER", "semanticshop")


settings = Settings()
