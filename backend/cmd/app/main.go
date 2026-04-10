package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"

	"football_ui/backend/internal/app"
	"football_ui/backend/internal/platform/config"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	if err := app.Run(ctx, cfg); err != nil {
		log.Fatalf("run app: %v", err)
	}
}
