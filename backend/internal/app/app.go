package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"football_ui/backend/internal/app/session"
	"football_ui/backend/internal/platform/config"
	"football_ui/backend/internal/platform/logger"
	"football_ui/backend/internal/platform/postgres"
	"football_ui/backend/internal/repository"
	cabinetadmin "football_ui/backend/internal/service/cabinetadmin"
	commentservice "football_ui/backend/internal/service/comments"
	eventservice "football_ui/backend/internal/service/events"
	notifservice "football_ui/backend/internal/service/notifications"
	telegramauth "football_ui/backend/internal/service/telegramauth"
	"football_ui/backend/internal/service/tournament"
	transporthttp "football_ui/backend/internal/transport/http"
)

func Run(ctx context.Context, cfg config.Config) error {
	log := logger.New(cfg.Log.Level, cfg.Log.Format)
	slog.SetDefault(log)

	dbPool, err := postgres.NewPool(ctx, cfg.DB)
	if err != nil {
		return err
	}
	defer dbPool.Close()

	authRepo := repository.NewAuthRepository(dbPool)
	tournamentRepo := repository.NewTournamentRepository(dbPool)
	tournamentSvc := tournament.NewService(tournamentRepo)
	eventsRepo := repository.NewEventsRepository(dbPool)
	eventsSvc := eventservice.NewService(eventsRepo)
	commentsRepo := repository.NewCommentsRepository(dbPool)
	commentsSvc := commentservice.NewService(commentsRepo, cfg.Features.CommentsCooldown)
	cabinetRepo := repository.NewCabinetAdminRepository(dbPool)
	cabinetSvc := cabinetadmin.NewService(cabinetRepo)
	notificationsRepo := repository.NewNotificationsRepository(dbPool)
	notificationsSvc := notifservice.NewService(notificationsRepo)
	telegramAuthSvc := telegramauth.NewService(authRepo, cfg.Telegram.MiniAppAuthURL)
	sessionManager := session.NewManager(cfg.Session.CookieName, cfg.Session.TTL, cfg.Session.Secure, cfg.Session.Domain)

	srv := &http.Server{
		Addr:              cfg.HTTP.Address(),
		Handler:           transporthttp.NewRouter(cfg, dbPool, authRepo, tournamentSvc, eventsSvc, commentsSvc, notificationsSvc, telegramAuthSvc, cabinetSvc, sessionManager),
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Info("http server started", "address", cfg.HTTP.Address(), "env", cfg.AppEnv)
		if serveErr := srv.ListenAndServe(); serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			errCh <- fmt.Errorf("listen and serve: %w", serveErr)
		}
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.HTTP.ShutdownTimeout)
		defer cancel()
		log.Info("shutting down server")
		if shutdownErr := srv.Shutdown(shutdownCtx); shutdownErr != nil {
			return fmt.Errorf("shutdown server: %w", shutdownErr)
		}
		return nil
	case err := <-errCh:
		return err
	}
}
