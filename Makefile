.PHONY: dev build docker lint type-check

dev:
	cd frontend && npm run dev

build:
	cd frontend && npm run build

docker:
	docker-compose up --build

lint:
	cd frontend && npm run lint

type-check:
	cd frontend && npm run type-check