.PHONY: up seed reindex logs test test-front down

up:
	docker compose up --build -d

seed:
	docker compose exec django python manage.py seed_products

reindex:
	docker compose exec django python manage.py reindex

logs:
	docker compose logs -f

test:
	docker compose exec django python manage.py test
	docker compose exec fastapi pytest -q

test-front:
	cd frontend && npm install && npm run test:ci

down:
	docker compose down
