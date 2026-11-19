
import catalog.vector_field
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("catalog", "0001_enable_pgvector"),
    ]

    operations = [
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120, unique=True, verbose_name='Nom')),
                ('slug', models.SlugField(max_length=140, unique=True, verbose_name='Slug')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Catégorie',
                'verbose_name_plural': 'Catégories',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255, unique=True, verbose_name='Titre')),
                ('description', models.TextField(blank=True, default='', verbose_name='Description')),
                ('price', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='Prix')),
                ('stock', models.PositiveIntegerField(default=0, verbose_name='Stock')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('embedding', catalog.vector_field.EmbeddingVectorField(blank=True, dimensions=384, null=True)),
                ('embedding_model', models.CharField(blank=True, default='', max_length=160, verbose_name="Modèle d'embedding")),
                ('embedding_updated_at', models.DateTimeField(blank=True, null=True, verbose_name='Embedding mis à jour le')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='products', to='catalog.category', verbose_name='Catégorie')),
            ],
            options={
                'verbose_name': 'Produit',
                'verbose_name_plural': 'Produits',
                'ordering': ['-created_at'],
            },
        ),
    ]
