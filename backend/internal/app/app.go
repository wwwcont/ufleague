package app

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"football_ui/backend/internal/app/session"
	"football_ui/backend/internal/domain"
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

type telegramJobAdapter struct {
	botToken      string
	notifications notifservice.Service
	httpClient    *http.Client
}

func (a telegramJobAdapter) Deliver(ctx context.Context, job domain.NotificationJob) error {
	chatID, err := a.notifications.ResolveTelegramChatID(ctx, job.UserID)
	if err != nil {
		return err
	}
	if chatID == nil || *chatID == 0 {
		return nil
	}
	title := strings.TrimSpace(fmt.Sprintf("%v", job.Payload["title"]))
	body := strings.TrimSpace(fmt.Sprintf("%v", job.Payload["body"]))
	link := strings.TrimSpace(fmt.Sprintf("%v", job.Payload["link"]))
	scope := strings.TrimSpace(fmt.Sprintf("%v", job.Payload["scope"]))
	text := strings.TrimSpace(fmt.Sprintf("🔔 %s\n%s\n%s", title, body, link))
	if text == "" || text == "🔔" {
		text = fmt.Sprintf("🔔 Новое уведомление (%s)", scope)
	}
	return sendTelegramMessage(ctx, a.httpClient, a.botToken, *chatID, text)
}

func sendTelegramMessage(ctx context.Context, client *http.Client, botToken string, chatID int64, text string) error {
	body, _ := json.Marshal(map[string]any{"chat_id": chatID, "text": text})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", strings.TrimSpace(botToken)), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
	return fmt.Errorf("telegram sendMessage failed: status=%s body=%s", resp.Status, strings.TrimSpace(string(raw)))
}

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
	telegramAuthSvc := telegramauth.NewService(authRepo, cfg.Telegram.MiniAppAuthURL, cfg.Features.TelegramMockLoginEnabled, cfg.Features.TelegramMockCode)
	sessionManager := session.NewManager(cfg.Session.CookieName, cfg.Session.TTL, cfg.Session.Secure, cfg.Session.Domain)

	srv := &http.Server{
		Addr:              cfg.HTTP.Address(),
		Handler:           transporthttp.NewRouter(cfg, dbPool, authRepo, tournamentSvc, eventsSvc, commentsSvc, notificationsSvc, telegramAuthSvc, cabinetSvc, sessionManager),
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	if strings.TrimSpace(cfg.Telegram.BotToken) != "" {
		adapter := telegramJobAdapter{
			botToken:      cfg.Telegram.BotToken,
			notifications: notificationsSvc,
			httpClient:    &http.Client{Timeout: 8 * time.Second},
		}
		go func() {
			ticker := time.NewTicker(3 * time.Second)
			defer ticker.Stop()
			for {
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					if processErr := notificationsSvc.ProcessPending(ctx, 50, adapter); processErr != nil {
						log.Warn("notification_worker_failed", "err", processErr)
					}
				}
			}
		}()
	}

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
