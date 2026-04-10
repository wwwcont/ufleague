APP_NAME=football-backend
MIGRATE_RUN=go run ./tools/migrate
MIGRATE_DATABASE_URL?=postgres://postgres:postgres@localhost:5432/football_ui?sslmode=disable
.RECIPEPREFIX := >

.PHONY: deps run build test fmt migrate-up migrate-down

deps:
> go mod tidy

run:
> go run ./cmd/app

build:
> go build -o bin/$(APP_NAME) ./cmd/app

test:
> go test ./...

fmt:
> gofmt -w ./cmd ./internal ./tools

migrate-up:
> $(MIGRATE_RUN) -path ./migrations -database "$(MIGRATE_DATABASE_URL)" up

migrate-down:
> $(MIGRATE_RUN) -path ./migrations -database "$(MIGRATE_DATABASE_URL)" down 1
