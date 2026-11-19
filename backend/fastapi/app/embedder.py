import threading


class Embedder:
    def __init__(self, model_name, dimension):
        self.model_name = model_name
        self.dimension = dimension
        self.ready = False
        self.error = None
        self._model = None
        self._lock = threading.Lock()

    def load(self):
        with self._lock:
            if self.ready:
                return
            try:
                from sentence_transformers import SentenceTransformer

                model = SentenceTransformer(self.model_name)
                get_dim = getattr(model, "get_embedding_dimension", None) or model.get_sentence_embedding_dimension
                dim = get_dim()
                if dim != self.dimension:
                    raise RuntimeError(
                        f"Dimension du modèle ({dim}) incompatible avec la colonne pgvector ({self.dimension})"
                    )
                self._model = model
                self.ready = True
                self.error = None
            except Exception as exc:
                self.error = str(exc)
                raise

    def encode(self, texts):
        if not self.ready:
            self.load()
        vectors = self._model.encode(
            list(texts), normalize_embeddings=True, convert_to_numpy=True, batch_size=32, show_progress_bar=False
        )
        return vectors

    def encode_one(self, text):
        return self.encode([text])[0]


def build_product_text(title, description, category):
    parts = [title.strip(), (description or "").strip()]
    if category:
        parts.append(f"catégorie: {category}")
    return ". ".join(part for part in parts if part)
