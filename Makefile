VERSION := $(shell cat VERSION 2>/dev/null || echo "0.1.0")

.PHONY: dev build docker lint type-check version

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

version:
	@echo "$(VERSION)"
