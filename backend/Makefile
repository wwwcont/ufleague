APP_NAME=football-backend

.PHONY: deps run build test fmt migrate-up migrate-down

deps:
	go mod tidy

run:
	go run ./cmd/app

build:
	go build -o bin/$(APP_NAME) ./cmd/app

test:
	go test ./...

fmt:
	gofmt -w ./cmd ./internal

migrate-up:
	migrate -path ./migrations -database "$$DATABASE_URL" up

migrate-down:
	migrate -path ./migrations -database "$$DATABASE_URL" down 1
