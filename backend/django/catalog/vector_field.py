from django.db.models import Field


class EmbeddingVectorField(Field):
    description = "Embedding pgvector"

    def __init__(self, dimensions=384, **kwargs):
        self.dimensions = dimensions
        super().__init__(**kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        kwargs["dimensions"] = self.dimensions
        return name, path, args, kwargs

    def db_type(self, connection):
        if connection.vendor == "postgresql":
            return f"vector({self.dimensions})"
        return "text"

    def get_prep_value(self, value):
        if value is None:
            return None
        if isinstance(value, (list, tuple)):
            return "[" + ",".join(str(float(v)) for v in value) + "]"
        return value

    def from_db_value(self, value, expression, connection):
        return value

    def value_to_string(self, obj):
        return self.get_prep_value(getattr(obj, self.attname))
