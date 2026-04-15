package http

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math/rand"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"football_ui/backend/internal/app/session"
	"football_ui/backend/internal/domain"
	"football_ui/backend/internal/platform/config"
	"football_ui/backend/internal/repository"
	cabinetadmin "football_ui/backend/internal/service/cabinetadmin"
	commentservice "football_ui/backend/internal/service/comments"
	eventsservice "football_ui/backend/internal/service/events"
	notifservice "football_ui/backend/internal/service/notifications"
	telegramauth "football_ui/backend/internal/service/telegramauth"
	"football_ui/backend/internal/service/tournament"
	"football_ui/backend/internal/transport/http/middleware"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	healthRepo    repository.Pinger
	authRepo      *repository.AuthRepository
	tournament    tournament.Service
	events        eventsservice.Service
	comments      commentservice.Service
	notifications notifservice.Service
	telegramAuth  telegramauth.Service
	cabinet       cabinetadmin.Service
	session       session.Manager
	cfg           config.Config
}

func NewRouter(cfg config.Config, healthRepo repository.Pinger, authRepo *repository.AuthRepository, tournamentSvc tournament.Service, eventsSvc eventsservice.Service, commentsSvc commentservice.Service, notificationsSvc notifservice.Service, telegramAuthSvc telegramauth.Service, cabinetSvc cabinetadmin.Service, sessionManager session.Manager) http.Handler {
	h := Handler{healthRepo: healthRepo, authRepo: authRepo, tournament: tournamentSvc, events: eventsSvc, comments: commentsSvc, notifications: notificationsSvc, telegramAuth: telegramAuthSvc, cabinet: cabinetSvc, session: sessionManager, cfg: cfg}
	r := chi.NewRouter()
	obs := middleware.NewObservabilityMiddleware(h.reportHTTPErrorFlow)
	sec := middleware.NewSecurityMiddleware(cfg)
	r.Use(obs.RequestID)
	r.Use(obs.RequestLogger)
	r.Use(sec.SecurityHeaders)
	r.Use(sec.CORS)
	r.Use(sec.RateLimit)
	r.Use(sec.BodyLimit)
	r.Use(sec.CSRFSimple)
	r.Get("/healthz", h.Healthcheck)
	r.Get("/readyz", h.Readyz)
	r.Get("/metricsz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, obs.Snapshot())
	})
	_ = os.MkdirAll("uploads", 0o755)
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))
	sessionMW := middleware.NewSessionMiddleware(authRepo, sessionManager)

	r.Route("/api/auth", func(r chi.Router) {
		r.With(sessionMW.RequireSession).Get("/me", h.Me)
		r.With(sessionMW.RequireSession).Post("/logout", h.Logout)
		if cfg.Features.DevLoginEnabled {
			r.Post("/dev-login", h.DevLogin)
		}
		r.Post("/telegram/start", h.TelegramAuthStart)
		r.Post("/telegram/bot/issue-code", h.TelegramIssueCode)
		r.Post("/telegram/webhook", h.TelegramWebhook)
		r.Post("/telegram/webhook/{secret}", h.TelegramWebhook)
		r.Post("/telegram/complete-code", h.TelegramCodeLogin)
		if cfg.Features.TelegramMockLoginEnabled {
			r.Post("/telegram/mock-code-login", h.TelegramMockCodeLogin)
		}
	})

	r.Route("/api", func(r chi.Router) {
		r.Get("/teams", h.ListTeams)
		r.Get("/teams/{id}", h.GetTeam)
		r.Get("/players", h.ListPlayers)
		r.Get("/players/{id}", h.GetPlayer)
		r.Get("/matches", h.ListMatches)
		r.Get("/matches/{id}", h.GetMatch)
		r.Get("/standings", h.GetStandings)
		r.Get("/tournament/cycles", h.GetTournamentCycles)
		r.Get("/playoff-grid/{tournamentId}", h.GetPlayoffGrid)
		r.Get("/search", h.Search)
		r.Get("/events", h.ListEvents)
		r.Get("/events/{id}", h.GetEvent)
		r.Get("/comments", h.ListComments)
		r.Get("/comments/author-state", h.GetCommentAuthorState)
		r.Get("/users/search", h.SearchUsersByTelegramUsername)
		r.Get("/users/by-telegram/{username}", h.GetUserCardByTelegramUsername)
		r.Get("/users/{id}", h.GetUserCard)

		r.With(sessionMW.RequireSession).Post("/teams", h.CreateTeam)
		r.With(sessionMW.RequireSession).Patch("/teams/{id}", h.UpdateTeam)
		r.With(sessionMW.RequireSession).Post("/players", h.CreatePlayer)
		r.With(sessionMW.RequireSession).Patch("/players/{id}", h.UpdatePlayer)
		r.With(sessionMW.RequireSession).Post("/matches", h.CreateMatch)
		r.With(sessionMW.RequireSession).Patch("/matches/{id}", h.UpdateMatch)
		r.With(sessionMW.RequireSession).Post("/events", h.CreateEvent)
		r.With(sessionMW.RequireSession).Patch("/events/{id}", h.UpdateEvent)
		r.With(sessionMW.RequireSession).Delete("/events/{id}", h.DeleteEvent)
		r.With(sessionMW.RequireSession).Post("/comments", h.CreateComment)
		r.With(sessionMW.RequireSession).Post("/comments/{id}/reply", h.ReplyComment)
		r.With(sessionMW.RequireSession).Patch("/comments/{id}", h.UpdateComment)
		r.With(sessionMW.RequireSession).Delete("/comments/{id}", h.DeleteComment)
		r.With(sessionMW.RequireSession).Post("/comments/{id}/reactions", h.SetCommentReaction)

		r.With(sessionMW.RequireSession).Get("/me/profile", h.GetMyProfile)
		r.With(sessionMW.RequireSession).Get("/me/actions", h.GetMyActions)
		r.With(sessionMW.RequireSession).Patch("/me/profile", h.UpdateMyProfile)
		r.With(sessionMW.RequireSession).Post("/captain/teams/{id}/invite", h.CaptainInviteByUsername)
		r.With(sessionMW.RequireSession).Patch("/captain/teams/{id}/socials", h.CaptainUpdateTeamSocials)
		r.With(sessionMW.RequireSession).Patch("/captain/teams/{id}/roster/{playerId}", h.CaptainSetRosterVisibility)
		r.With(sessionMW.RequireSession).Post("/admin/comments/{id}/moderate-delete", h.AdminModerateComment)
		r.With(sessionMW.RequireSession).Post("/admin/teams/{id}/transfer-captain", h.AdminTransferCaptain)
		r.With(sessionMW.RequireSession).Get("/admin/users/{id}/profile", h.AdminGetUserProfile)
		r.With(sessionMW.RequireSession).Patch("/admin/users/{id}/profile", h.AdminUpdateUserProfile)
		r.With(sessionMW.RequireSession).Post("/admin/users/{id}/comment-block", h.AdminBlockComments)
		r.With(sessionMW.RequireSession).Post("/admin/users/{id}/captain-role", h.AdminAssignCaptainRole)
		r.With(sessionMW.RequireSession).Delete("/admin/users/{id}/captain-role", h.AdminRevokeCaptainRole)
		r.With(sessionMW.RequireSession).Delete("/admin/users/{id}/player", h.AdminRemovePlayerFromUser)
		r.With(sessionMW.RequireSession).Post("/superadmin/users/{id}/roles", h.SuperadminAssignRoles)
		r.With(sessionMW.RequireSession).Post("/superadmin/users/{id}/permissions", h.SuperadminAssignPermissions)
		r.With(sessionMW.RequireSession).Post("/superadmin/users/{id}/restrictions", h.SuperadminAssignRestrictions)
		r.With(sessionMW.RequireSession).Put("/superadmin/settings/{key}", h.SuperadminSetGlobalSetting)
		r.With(sessionMW.RequireSession).Post("/uploads/image", h.UploadImage)
		r.With(sessionMW.RequireSession).Post("/admin/playoff-grid/{tournamentId}/draft-validate", h.ValidatePlayoffGridDraft)
		r.With(sessionMW.RequireSession).Post("/admin/playoff-grid/{tournamentId}/save", h.SavePlayoffGrid)
		r.With(sessionMW.RequireSession).Get("/admin/playoff-grid/{tournamentId}/match-candidates", h.GetPlayoffMatchCandidates)
		r.With(sessionMW.RequireSession).Post("/admin/playoff-grid/attach-match", h.AttachPlayoffMatch)
		r.With(sessionMW.RequireSession).Post("/admin/playoff-grid/detach-match", h.DetachPlayoffMatch)
		r.With(sessionMW.RequireSession).Post("/admin/tournament/cycles", h.CreateTournamentCycle)
		r.With(sessionMW.RequireSession).Post("/admin/tournament/cycles/{id}/activate", h.ActivateTournamentCycle)
		r.With(sessionMW.RequireSession).Patch("/admin/tournament/cycles/{id}/settings", h.UpdateTournamentBracketSettings)
	})

	return r
}

func (h Handler) reportHTTPErrorFlow(ctx context.Context, report middleware.ErrorFlowReport) {
	flowLine := strings.Join([]string{
		fmt.Sprintf("time=%s", report.OccurredAt.Format(time.RFC3339)),
		fmt.Sprintf("request_id=%s", report.RequestID),
		fmt.Sprintf("business_case=%s", report.BusinessCase),
		fmt.Sprintf("method=%s", report.Method),
		fmt.Sprintf("path=%s", report.Path),
		fmt.Sprintf("query=%s", report.Query),
		fmt.Sprintf("status=%d", report.Status),
		fmt.Sprintf("duration_ms=%d", report.DurationMS),
		fmt.Sprintf("remote_addr=%s", report.RemoteAddr),
		fmt.Sprintf("user_agent=%q", report.UserAgent),
		fmt.Sprintf("referer=%q", report.Referer),
		fmt.Sprintf("request_content_type=%q", report.RequestContentTy),
		fmt.Sprintf("response_preview=%q", report.ResponsePreview),
	}, "\n")

	if err := os.MkdirAll("error_flows", 0o755); err != nil {
		slog.Error("error_flow_report_mkdir_failed", "err", err)
		return
	}
	filename := fmt.Sprintf("error_flows/%s_%d.log", strings.ReplaceAll(report.RequestID, "/", "_"), report.OccurredAt.Unix())
	if err := os.WriteFile(filename, []byte(flowLine+"\n"), 0o644); err != nil {
		slog.Error("error_flow_report_write_failed", "err", err, "request_id", report.RequestID)
		return
	}
	slog.Info("error_flow_report_saved", "request_id", report.RequestID, "path", filename, "business_case", report.BusinessCase)

	if strings.TrimSpace(h.cfg.Telegram.BotToken) == "" {
		slog.Warn("error_flow_report_telegram_skipped", "reason", "empty_bot_token", "request_id", report.RequestID)
		return
	}
	chatID := h.cfg.Telegram.ErrorFlowChatID
	if chatID == 0 {
		slog.Warn("error_flow_report_telegram_skipped", "reason", "empty_chat_id", "request_id", report.RequestID)
		return
	}
	if err := h.sendTelegramDocument(ctx, chatID, filename, "error_flow.log", fmt.Sprintf("🚨 HTTP 5xx\ncase=%s\nrequest_id=%s\nstatus=%d", report.BusinessCase, report.RequestID, report.Status)); err != nil {
		slog.Error("error_flow_report_telegram_failed", "err", err, "request_id", report.RequestID, "chat_id", chatID)
		return
	}
	slog.Info("error_flow_report_telegram_sent", "request_id", report.RequestID, "chat_id", chatID)
}

func (h Handler) Healthcheck(w http.ResponseWriter, r *http.Request) {
	if err := h.healthRepo.Ping(r.Context()); err != nil {
		writeJSON(w, 503, domain.HealthStatus{Status: "degraded"})
		return
	}
	writeJSON(w, 200, domain.HealthStatus{Status: "ok"})
}

func (h Handler) Readyz(w http.ResponseWriter, r *http.Request) {
	if err := h.healthRepo.Ping(r.Context()); err != nil {
		writeJSON(w, 503, map[string]string{"status": "not_ready"})
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ready"})
}
func (h Handler) Me(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	writeJSON(w, 200, domain.MeResponse{User: current.User, Session: current.Session})
}

func (h Handler) GetUserCard(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	item, err := h.authRepo.GetPublicUserCard(r.Context(), id)
	if err != nil {
		http.Error(w, "not found", 404)
		return
	}
	writeJSON(w, 200, item)
}

func (h Handler) GetUserCardByTelegramUsername(w http.ResponseWriter, r *http.Request) {
	username := strings.TrimSpace(chi.URLParam(r, "username"))
	if username == "" {
		http.Error(w, "bad username", 400)
		return
	}
	item, err := h.authRepo.GetPublicUserCardByTelegramUsername(r.Context(), username)
	if err != nil {
		http.Error(w, "not found", 404)
		return
	}
	writeJSON(w, 200, item)
}

func (h Handler) SearchUsersByTelegramUsername(w http.ResponseWriter, r *http.Request) {
	username := strings.TrimSpace(r.URL.Query().Get("telegram"))
	if username == "" {
		writeJSON(w, 200, []domain.PublicUserCard{})
		return
	}
	items, err := h.authRepo.SearchPublicUserCardsByTelegramUsername(r.Context(), username, 20)
	if err != nil {
		slog.Error("search_users_failed", "err", err, "username", username)
		http.Error(w, "failed", 500)
		return
	}
	writeJSON(w, 200, items)
}

func (h Handler) UploadImage(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		http.Error(w, "invalid multipart form", 400)
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "file is required", 400)
		return
	}
	defer file.Close()

	raw, err := io.ReadAll(io.LimitReader(file, 8<<20))
	if err != nil {
		http.Error(w, "failed to read file", 400)
		return
	}
	if len(raw) == 0 {
		http.Error(w, "empty file", 400)
		return
	}
	contentType := detectImageContentType(raw, header.Header.Get("Content-Type"), header.Filename)
	if contentType == "" {
		http.Error(w, "unsupported image format", 400)
		return
	}

	ext := extensionByContentType(contentType)
	filename := fmt.Sprintf("%d_%06d%s", time.Now().UnixMilli(), rand.Intn(1000000), ext)
	if err = os.MkdirAll("uploads", 0o755); err != nil {
		http.Error(w, "failed to prepare upload dir", 500)
		return
	}
	targetPath := filepath.Join("uploads", filename)

	dst, err := os.Create(targetPath)
	if err != nil {
		http.Error(w, "failed to create file", 500)
		return
	}
	defer dst.Close()
	if _, err = io.Copy(dst, bytes.NewReader(raw)); err != nil {
		http.Error(w, "failed to save file", 500)
		return
	}

	writeJSON(w, 201, map[string]string{"url": fmt.Sprintf("/uploads/%s", filename)})
}

func detectImageContentType(raw []byte, headerContentType, filename string) string {
	sniffed := strings.ToLower(strings.TrimSpace(http.DetectContentType(raw)))
	if strings.HasPrefix(sniffed, "image/") {
		return sniffed
	}

	declared := strings.ToLower(strings.TrimSpace(headerContentType))
	if strings.HasPrefix(declared, "image/") {
		return declared
	}

	ext := strings.ToLower(strings.TrimSpace(filepath.Ext(filename)))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".svg":
		return "image/svg+xml"
	case ".heic":
		return "image/heic"
	case ".heif":
		return "image/heif"
	case ".avif":
		return "image/avif"
	default:
		return ""
	}
}

func extensionByContentType(contentType string) string {
	switch strings.ToLower(strings.TrimSpace(contentType)) {
	case "image/jpeg", "image/jpg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	case "image/svg+xml":
		return ".svg"
	case "image/heic":
		return ".heic"
	case "image/heif":
		return ".heif"
	case "image/avif":
		return ".avif"
	default:
		return ".jpg"
	}
}
func (h Handler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(h.session.CookieName())
	if err == nil && cookie.Value != "" {
		_ = h.authRepo.RevokeSessionByHash(r.Context(), h.session.HashToken(cookie.Value))
	}
	http.SetCookie(w, &http.Cookie{Name: h.session.CookieName(), Value: "", Path: "/", HttpOnly: true, Secure: h.session.Secure(), SameSite: http.SameSiteLaxMode, Expires: time.Unix(0, 0), MaxAge: -1})
	writeJSON(w, 200, map[string]string{"status": "ok"})
}
func (h Handler) DevLogin(w http.ResponseWriter, r *http.Request) {
	if !h.cfg.Features.DevLoginEnabled || h.cfg.IsProduction() {
		http.NotFound(w, r)
		return
	}
	var req domain.DevLoginRequest
	if err := decodeJSONStrict(r, &req); err != nil {
		http.Error(w, "invalid json body", 400)
		return
	}
	req.Username, req.DisplayName = strings.TrimSpace(req.Username), strings.TrimSpace(req.DisplayName)
	if req.Username == "" || req.DisplayName == "" {
		http.Error(w, "username and display_name are required", 400)
		return
	}
	if len(req.Roles) == 0 {
		req.Roles = []domain.Role{domain.RoleGuest}
	}
	user, err := h.authRepo.UpsertDevUser(r.Context(), req)
	if err != nil {
		http.Error(w, "failed to upsert user", 500)
		return
	}
	rawToken, tokenHash, err := h.session.GenerateToken()
	if err != nil {
		http.Error(w, "failed to create session token", 500)
		return
	}
	sess, err := h.authRepo.CreateSession(r.Context(), repository.CreateSessionParams{UserID: user.ID, TokenHash: tokenHash, UserAgent: r.UserAgent(), IPAddress: clientIP(r), ExpiresAt: time.Now().UTC().Add(h.session.TTL()).Format(time.RFC3339)})
	if err != nil {
		http.Error(w, "failed to create session", 500)
		return
	}
	setSessionCookie(w, h.session, rawToken, sess.ExpiresAt)
	writeJSON(w, 200, domain.MeResponse{User: user, Session: sess})
}

func (h Handler) TelegramCodeLogin(w http.ResponseWriter, r *http.Request) {
	var req domain.TelegramCodeLoginRequest
	if err := decodeJSONStrict(r, &req); err != nil {
		http.Error(w, "bad request", 400)
		return
	}
	req.Code = strings.TrimSpace(req.Code)
	req.RequestID = strings.TrimSpace(req.RequestID)
	if req.Code == "" || req.RequestID == "" {
		if h.cfg.Features.TelegramMockLoginEnabled && !h.cfg.IsProduction() && req.Code != "" {
			if h.loginAsTelegramMockCodeUser(w, r, req.Code) {
				return
			}
		}
		http.Error(w, "request_id and code are required", 400)
		return
	}
	user, err := h.telegramAuth.CompleteCode(r.Context(), req)
	if err != nil {
		if h.cfg.Features.TelegramMockLoginEnabled && !h.cfg.IsProduction() {
			if h.loginAsTelegramMockCodeUser(w, r, req.Code) {
				return
			}
		}
		if errors.Is(err, telegramauth.ErrExpiredCode) {
			http.Error(w, "expired code", 410)
			return
		}
		http.Error(w, "invalid code", 401)
		return
	}
	rawToken, tokenHash, err := h.session.GenerateToken()
	if err != nil {
		http.Error(w, "failed to create session token", 500)
		return
	}
	sess, err := h.authRepo.CreateSession(r.Context(), repository.CreateSessionParams{
		UserID:    user.ID,
		TokenHash: tokenHash,
		UserAgent: r.UserAgent(),
		IPAddress: clientIP(r),
		ExpiresAt: time.Now().UTC().Add(h.session.TTL()).Format(time.RFC3339),
	})
	if err != nil {
		http.Error(w, "failed to create session", 500)
		return
	}
	if user.TelegramID != nil {
		_ = h.notifications.EnsureDefaultTelegramSubscriptions(r.Context(), user.ID, *user.TelegramID)
	}
	setSessionCookie(w, h.session, rawToken, sess.ExpiresAt)
	writeJSON(w, 200, domain.MeResponse{User: user, Session: sess})
}

func (h Handler) loginAsTelegramMockCodeUser(w http.ResponseWriter, r *http.Request, code string) bool {
	username, ok := telegramMockSeedUsersByCode(h.cfg.Features.TelegramMockCode)[strings.TrimSpace(code)]
	if !ok {
		return false
	}
	user, err := h.authRepo.GetUserByUsername(r.Context(), username)
	if err != nil {
		return false
	}
	rawToken, tokenHash, err := h.session.GenerateToken()
	if err != nil {
		http.Error(w, "failed to create session token", 500)
		return true
	}
	sess, err := h.authRepo.CreateSession(r.Context(), repository.CreateSessionParams{
		UserID:    user.ID,
		TokenHash: tokenHash,
		UserAgent: r.UserAgent(),
		IPAddress: clientIP(r),
		ExpiresAt: time.Now().UTC().Add(h.session.TTL()).Format(time.RFC3339),
	})
	if err != nil {
		http.Error(w, "failed to create session", 500)
		return true
	}
	setSessionCookie(w, h.session, rawToken, sess.ExpiresAt)
	writeJSON(w, 200, domain.MeResponse{User: user, Session: sess})
	return true
}

func (h Handler) TelegramIssueCode(w http.ResponseWriter, r *http.Request) {
	var req domain.TelegramIssueCodeRequest
	if err := decodeJSONStrict(r, &req); err != nil {
		http.Error(w, "bad request", 400)
		return
	}
	botToken := strings.TrimSpace(h.cfg.Telegram.BotToken)
	if botToken != "" && strings.TrimSpace(r.Header.Get("X-Telegram-Bot-Token")) != botToken {
		http.Error(w, "unauthorized", 401)
		return
	}
	resp, err := h.telegramAuth.IssueCode(r.Context(), req)
	if err != nil {
		if errors.Is(err, telegramauth.ErrSessionExpired) {
			http.Error(w, "expired login session", 410)
			return
		}
		http.Error(w, "failed to issue code", 400)
		return
	}
	writeJSON(w, 200, resp)
}

func (h Handler) TelegramWebhook(w http.ResponseWriter, r *http.Request) {
	if strings.TrimSpace(h.cfg.Telegram.BotToken) == "" {
		http.Error(w, "telegram bot is not configured", 503)
		return
	}
	webhookSecret := strings.TrimSpace(h.cfg.Telegram.WebhookSecret)
	if webhookSecret != "" {
		pathSecret := strings.TrimSpace(chi.URLParam(r, "secret"))
		if pathSecret != webhookSecret {
			http.Error(w, "unauthorized", 401)
			return
		}
	}

	var update telegramUpdate
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		http.Error(w, "bad request", 400)
		return
	}
	if update.Message == nil {
		writeJSON(w, 200, map[string]string{"status": "ignored"})
		return
	}
	msg := update.Message
	payload, ok := extractTelegramStartPayload(msg.Text)
	if !ok || !strings.HasPrefix(payload, "login_") {
		writeJSON(w, 200, map[string]string{"status": "ignored"})
		return
	}
	requestID := strings.TrimPrefix(payload, "login_")
	if requestID == "" {
		sendErr := h.sendTelegramMessage(r.Context(), msg.Chat.ID, "Не удалось распознать login payload. Нажмите «Войти через Telegram» на сайте и попробуйте снова.")
		h.writeTelegramWebhookStatus(w, "bad_payload", sendErr)
		return
	}
	resp, err := h.telegramAuth.IssueCode(r.Context(), domain.TelegramIssueCodeRequest{
		RequestID:        requestID,
		TelegramUserID:   msg.From.ID,
		TelegramUsername: msg.From.Username,
		FirstName:        msg.From.FirstName,
		LastName:         msg.From.LastName,
	})
	if err != nil {
		if errors.Is(err, telegramauth.ErrSessionExpired) {
			sendErr := h.sendTelegramMessage(r.Context(), msg.Chat.ID, "Сессия входа истекла. Вернитесь на сайт и нажмите «Войти через Telegram» заново.")
			h.writeTelegramWebhookStatus(w, "expired", sendErr)
			return
		}
		sendErr := h.sendTelegramMessage(r.Context(), msg.Chat.ID, "Не удалось выдать код входа. Попробуйте еще раз через сайт.")
		h.writeTelegramWebhookStatus(w, "issue_failed", sendErr)
		return
	}
	sendErr := h.sendTelegramMessage(r.Context(), msg.Chat.ID, fmt.Sprintf("Код входа: %s\nДействует до: %s UTC", resp.Code, resp.ExpiresAt.UTC().Format("2006-01-02 15:04")))
	h.writeTelegramWebhookStatus(w, "ok", sendErr)
}

func extractTelegramStartPayload(text string) (string, bool) {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return "", false
	}
	parts := strings.Fields(trimmed)
	if len(parts) < 2 {
		return "", false
	}
	command := strings.TrimSpace(parts[0])
	if command != "/start" && !strings.HasPrefix(command, "/start@") {
		return "", false
	}
	return strings.TrimSpace(parts[1]), true
}

func (h Handler) sendTelegramMessage(ctx context.Context, chatID int64, text string) error {
	body, _ := json.Marshal(map[string]any{
		"chat_id": chatID,
		"text":    strings.TrimSpace(text),
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", strings.TrimSpace(h.cfg.Telegram.BotToken)), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("telegram sendMessage failed: %s", strings.TrimSpace(string(raw)))
	}
	return nil
}

func (h Handler) sendTelegramDocument(ctx context.Context, chatID int64, filePath, fileName, caption string) error {
	raw, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	_ = writer.WriteField("chat_id", strconv.FormatInt(chatID, 10))
	if strings.TrimSpace(caption) != "" {
		_ = writer.WriteField("caption", strings.TrimSpace(caption))
	}
	part, err := writer.CreateFormFile("document", fileName)
	if err != nil {
		return err
	}
	if _, err = part.Write(raw); err != nil {
		return err
	}
	if err = writer.Close(); err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("https://api.telegram.org/bot%s/sendDocument", strings.TrimSpace(h.cfg.Telegram.BotToken)), &body)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		rawErr, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("telegram sendDocument failed: %s", strings.TrimSpace(string(rawErr)))
	}
	return nil
}

func (h Handler) writeTelegramWebhookStatus(w http.ResponseWriter, status string, sendErr error) {
	if sendErr == nil {
		writeJSON(w, 200, map[string]string{"status": status})
		return
	}
	fmt.Printf("telegram webhook sendMessage failed: status=%s err=%v\n", status, sendErr)
	writeJSON(w, 200, map[string]string{
		"status": "telegram_send_failed",
		"stage":  status,
		"error":  sendErr.Error(),
	})
}

type telegramUpdate struct {
	Message *telegramMessage `json:"message"`
}

type telegramMessage struct {
	Text string       `json:"text"`
	Chat telegramChat `json:"chat"`
	From telegramUser `json:"from"`
}

type telegramChat struct {
	ID int64 `json:"id"`
}

type telegramUser struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

func (h Handler) TelegramMockCodeLogin(w http.ResponseWriter, r *http.Request) {
	if !h.cfg.Features.TelegramMockLoginEnabled || h.cfg.IsProduction() {
		http.NotFound(w, r)
		return
	}
	var req domain.TelegramMockCodeLoginRequest
	if err := decodeJSONStrict(r, &req); err != nil {
		http.Error(w, "bad request", 400)
		return
	}
	code := strings.TrimSpace(req.Code)
	if code == "" {
		http.Error(w, "code is required", 400)
		return
	}

	seedByCode := telegramMockSeedUsersByCode(h.cfg.Features.TelegramMockCode)

	username, ok := seedByCode[code]
	if !ok {
		http.Error(w, "invalid code", 401)
		return
	}
	user, err := h.authRepo.GetUserByUsername(r.Context(), username)
	if err != nil {
		http.Error(w, "seed user not found", 404)
		return
	}

	rawToken, tokenHash, err := h.session.GenerateToken()
	if err != nil {
		http.Error(w, "failed to create session token", 500)
		return
	}
	sess, err := h.authRepo.CreateSession(r.Context(), repository.CreateSessionParams{
		UserID:    user.ID,
		TokenHash: tokenHash,
		UserAgent: r.UserAgent(),
		IPAddress: clientIP(r),
		ExpiresAt: time.Now().UTC().Add(h.session.TTL()).Format(time.RFC3339),
	})
	if err != nil {
		http.Error(w, "failed to create session", 500)
		return
	}
	setSessionCookie(w, h.session, rawToken, sess.ExpiresAt)
	writeJSON(w, 200, domain.MeResponse{User: user, Session: sess})
}

func telegramMockSeedUsersByCode(configuredMockCode string) map[string]string {
	seedByCode := map[string]string{
		"1111": "superadmin",
		"2222": "admin_test",
		"3333": "captain_alpha",
		"4444": "player_test",

		"UFL-SUPERADMIN-2026": "superadmin",
		"UFL-ADMIN-2026":      "admin_test",
		"UFL-CAPTAIN-2026":    "captain_alpha",
		"UFL-PLAYER-2026":     "player_test",
	}
	if configuredMockCode = strings.TrimSpace(configuredMockCode); configuredMockCode != "" {
		seedByCode[configuredMockCode] = "superadmin"
	}
	return seedByCode
}

func (h Handler) TelegramAuthStart(w http.ResponseWriter, r *http.Request) {
	var req domain.TelegramAuthStartRequest
	if r.ContentLength > 0 {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}
	resp, err := h.telegramAuth.Start(r.Context(), req)
	if err != nil {
		http.Error(w, "failed to start telegram auth", 500)
		return
	}
	writeJSON(w, 200, resp)
}
func (h Handler) ListTeams(w http.ResponseWriter, r *http.Request) {
	items, err := h.tournament.ListTeams(r.Context())
	if err != nil {
		slog.Error("list_teams_failed", "err", err)
		http.Error(w, "failed", 500)
		return
	}
	writeJSON(w, 200, items)
}
func (h Handler) GetTeam(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	item, err := h.tournament.GetTeam(r.Context(), id)
	if err != nil {
		http.Error(w, "not found", 404)
		return
	}
	writeJSON(w, 200, item)
}
func (h Handler) CreateTeam(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	var req domain.CreateTeamRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	item, err := h.tournament.CreateTeam(r.Context(), current.User, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	if item.CaptainUserID != nil {
		_ = h.cabinet.EnsureCaptainPlayerProfile(r.Context(), *item.CaptainUserID, item.ID, current.User.DisplayName)
	}
	writeJSON(w, 201, item)
}
func (h Handler) UpdateTeam(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req domain.UpdateTeamRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	item, err := h.tournament.UpdateTeam(r.Context(), current.User, id, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, item)
}
func (h Handler) ListPlayers(w http.ResponseWriter, r *http.Request) {
	items, err := h.tournament.ListPlayers(r.Context())
	if err != nil {
		slog.Error("list_players_failed", "err", err)
		http.Error(w, "failed", 500)
		return
	}
	writeJSON(w, 200, items)
}
func (h Handler) GetPlayer(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	item, err := h.tournament.GetPlayer(r.Context(), id)
	if err != nil {
		http.Error(w, "not found", 404)
		return
	}
	writeJSON(w, 200, item)
}
func (h Handler) CreatePlayer(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	var req domain.CreatePlayerRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	item, err := h.tournament.CreatePlayer(r.Context(), current.User, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 201, item)
}
func (h Handler) UpdatePlayer(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req domain.UpdatePlayerRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	item, err := h.tournament.UpdatePlayer(r.Context(), current.User, id, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, item)
}
func (h Handler) ListMatches(w http.ResponseWriter, r *http.Request) {
	items, err := h.tournament.ListMatches(r.Context())
	if err != nil {
		slog.Error("list_matches_failed", "err", err)
		http.Error(w, "failed", 500)
		return
	}
	writeJSON(w, 200, items)
}
func (h Handler) GetMatch(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	item, err := h.tournament.GetMatch(r.Context(), id)
	if err != nil {
		http.Error(w, "not found", 404)
		return
	}
	writeJSON(w, 200, item)
}

func (h Handler) GetStandings(w http.ResponseWriter, r *http.Request) {
	targetCycleID := int64(0)
	if rawCycle := strings.TrimSpace(r.URL.Query().Get("tournamentId")); rawCycle != "" {
		parsed, err := strconv.ParseInt(rawCycle, 10, 64)
		if err != nil || parsed <= 0 {
			http.Error(w, "bad tournamentId", 400)
			return
		}
		targetCycleID = parsed
	} else {
		active, err := h.tournament.GetActiveTournamentCycle(r.Context())
		if err == nil {
			targetCycleID = active.ID
		}
	}

	teams, err := h.tournament.ListTeams(r.Context())
	if err != nil {
		slog.Error("standings_list_teams_failed", "err", err, "tournament_id", targetCycleID)
		http.Error(w, "failed", 500)
		return
	}
	matches, err := h.tournament.ListMatches(r.Context())
	if err != nil {
		slog.Error("standings_list_matches_failed", "err", err, "tournament_id", targetCycleID)
		http.Error(w, "failed", 500)
		return
	}

	stats := make(map[int64]*domain.StandingRow, len(teams))
	for _, team := range teams {
		stats[team.ID] = &domain.StandingRow{TeamID: team.ID}
	}

	for _, m := range matches {
		if targetCycleID > 0 && m.TournamentID != targetCycleID {
			continue
		}
		if m.Status == "scheduled" {
			continue
		}
		home := stats[m.HomeTeamID]
		away := stats[m.AwayTeamID]
		if home == nil || away == nil {
			continue
		}

		home.Played++
		away.Played++
		home.GoalsFor += m.HomeScore
		home.GoalsAgainst += m.AwayScore
		away.GoalsFor += m.AwayScore
		away.GoalsAgainst += m.HomeScore

		switch {
		case m.HomeScore > m.AwayScore:
			home.Won++
			away.Lost++
		case m.HomeScore < m.AwayScore:
			away.Won++
			home.Lost++
		default:
			home.Drawn++
			away.Drawn++
		}
	}

	rows := make([]domain.StandingRow, 0, len(stats))
	for _, row := range stats {
		row.GoalDiff = row.GoalsFor - row.GoalsAgainst
		row.Points = row.GoalDiff + row.Won
		rows = append(rows, *row)
	}

	sort.Slice(rows, func(i, j int) bool {
		if rows[i].Points != rows[j].Points {
			return rows[i].Points > rows[j].Points
		}
		if rows[i].Won != rows[j].Won {
			return rows[i].Won > rows[j].Won
		}
		if rows[i].GoalDiff != rows[j].GoalDiff {
			return rows[i].GoalDiff > rows[j].GoalDiff
		}
		if rows[i].GoalsFor != rows[j].GoalsFor {
			return rows[i].GoalsFor > rows[j].GoalsFor
		}
		return rows[i].TeamID < rows[j].TeamID
	})

	for i := range rows {
		rows[i].Position = i + 1
	}
	writeJSON(w, 200, rows)
}

func (h Handler) GetTournamentCycles(w http.ResponseWriter, r *http.Request) {
	items, err := h.tournament.ListTournamentCycles(r.Context())
	if err != nil {
		http.Error(w, "failed", 500)
		return
	}
	writeJSON(w, 200, items)
}

func (h Handler) CreateTournamentCycle(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	var req domain.CreateTournamentCycleRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	item, err := h.tournament.CreateTournamentCycle(r.Context(), current.User, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 201, item)
}

func (h Handler) ActivateTournamentCycle(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	if err = h.tournament.ActivateTournamentCycle(r.Context(), current.User, id); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}

func (h Handler) UpdateTournamentBracketSettings(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req domain.UpdateTournamentBracketSettingsRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	if err = h.tournament.UpdateTournamentBracketSettings(r.Context(), current.User, id, req); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}

func (h Handler) GetPlayoffGrid(w http.ResponseWriter, r *http.Request) {
	tournamentID, err := parseID(chi.URLParam(r, "tournamentId"))
	if err != nil {
		http.Error(w, "bad tournament id", 400)
		return
	}
	grid, err := h.tournament.GetPlayoffGrid(r.Context(), tournamentID)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, grid)
}

func (h Handler) ValidatePlayoffGridDraft(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	tournamentID, err := parseID(chi.URLParam(r, "tournamentId"))
	if err != nil {
		http.Error(w, "bad tournament id", 400)
		return
	}
	var req domain.SavePlayoffGridRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	if err = h.tournament.ValidatePlayoffGridDraft(r.Context(), current.User, tournamentID, req); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true})
}

func (h Handler) SavePlayoffGrid(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	tournamentID, err := parseID(chi.URLParam(r, "tournamentId"))
	if err != nil {
		http.Error(w, "bad tournament id", 400)
		return
	}
	var req domain.SavePlayoffGridRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	grid, err := h.tournament.SavePlayoffGrid(r.Context(), current.User, tournamentID, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, grid)
}

func (h Handler) GetPlayoffMatchCandidates(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	tournamentID, err := parseID(chi.URLParam(r, "tournamentId"))
	if err != nil {
		http.Error(w, "bad tournament id", 400)
		return
	}
	matchID, err := parseID(r.URL.Query().Get("matchId"))
	if err != nil {
		http.Error(w, "bad match id", 400)
		return
	}
	items, err := h.tournament.GetPlayoffMatchCandidates(r.Context(), current.User, tournamentID, matchID)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"cells": items})
}

type attachPlayoffMatchRequest struct {
	PlayoffCellID int64 `json:"playoff_cell_id"`
	MatchID       int64 `json:"match_id"`
}

func (h Handler) AttachPlayoffMatch(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	var req attachPlayoffMatchRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil || req.PlayoffCellID <= 0 || req.MatchID <= 0 {
		http.Error(w, "bad request", 400)
		return
	}
	if err := h.tournament.AttachMatchToPlayoffCell(r.Context(), current.User, req.PlayoffCellID, req.MatchID); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true})
}

func (h Handler) DetachPlayoffMatch(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	var req attachPlayoffMatchRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil || req.PlayoffCellID <= 0 || req.MatchID <= 0 {
		http.Error(w, "bad request", 400)
		return
	}
	if err := h.tournament.DetachMatchFromPlayoffCell(r.Context(), current.User, req.PlayoffCellID, req.MatchID); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true})
}

func (h Handler) Search(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("q")))
	if query == "" {
		writeJSON(w, 200, []domain.SearchResult{})
		return
	}

	results := make([]domain.SearchResult, 0, 30)
	teamNameByID := map[int64]string{}
	teams, _ := h.tournament.ListTeams(r.Context())
	for _, team := range teams {
		teamNameByID[team.ID] = team.Name
		if strings.Contains(strings.ToLower(team.Name+" "+team.Description), query) {
			results = append(results, domain.SearchResult{
				ID:       "team_" + strconv.FormatInt(team.ID, 10),
				Type:     "team",
				EntityID: strconv.FormatInt(team.ID, 10),
				Title:    team.Name,
				Subtitle: team.Description,
				Route:    "/teams/" + strconv.FormatInt(team.ID, 10),
			})
		}
	}
	players, _ := h.tournament.ListPlayers(r.Context())
	for _, player := range players {
		if strings.Contains(strings.ToLower(player.FullName+" "+player.Position), query) {
			results = append(results, domain.SearchResult{
				ID:       "player_" + strconv.FormatInt(player.ID, 10),
				Type:     "player",
				EntityID: strconv.FormatInt(player.ID, 10),
				Title:    player.FullName,
				Subtitle: player.Position,
				Route:    "/players/" + strconv.FormatInt(player.ID, 10),
			})
		}
	}
	matches, _ := h.tournament.ListMatches(r.Context())
	for _, match := range matches {
		homeName := teamNameByID[match.HomeTeamID]
		awayName := teamNameByID[match.AwayTeamID]
		raw := strings.ToLower(strings.Join([]string{
			match.Venue,
			match.Status,
			match.StartAt.Format(time.DateOnly),
			homeName,
			awayName,
		}, " "))
		if strings.Contains(raw, query) {
			results = append(results, domain.SearchResult{
				ID:       "match_" + strconv.FormatInt(match.ID, 10),
				Type:     "match",
				EntityID: strconv.FormatInt(match.ID, 10),
				Title:    strings.TrimSpace(homeName + " — " + awayName),
				Subtitle: strings.TrimSpace(match.StartAt.Format(time.DateTime) + " • " + match.Venue),
				Route:    "/matches/" + strconv.FormatInt(match.ID, 10),
			})
		}
	}
	events, _ := h.events.ListEvents(r.Context())
	for _, event := range events {
		raw := strings.ToLower(strings.Join([]string{
			event.Title,
			event.Body,
			string(event.ScopeType),
		}, " "))
		if strings.Contains(raw, query) {
			results = append(results, domain.SearchResult{
				ID:       "event_" + strconv.FormatInt(event.ID, 10),
				Type:     "event",
				EntityID: strconv.FormatInt(event.ID, 10),
				Title:    event.Title,
				Subtitle: string(event.ScopeType),
				Route:    "/events/" + strconv.FormatInt(event.ID, 10),
			})
		}
	}

	writeJSON(w, 200, results)
}
func (h Handler) CreateMatch(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	var req domain.CreateMatchRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	item, err := h.tournament.CreateMatch(r.Context(), current.User, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 201, item)
}
func (h Handler) UpdateMatch(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req domain.UpdateMatchRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	item, err := h.tournament.UpdateMatch(r.Context(), current.User, id, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, item)
}

func (h Handler) ListEvents(w http.ResponseWriter, r *http.Request) {
	items, err := h.events.ListEvents(r.Context())
	if err != nil {
		slog.Error("list_events_failed", "err", err)
		http.Error(w, "failed", 500)
		return
	}
	writeJSON(w, 200, items)
}
func (h Handler) GetEvent(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	item, err := h.events.GetEvent(r.Context(), id)
	if err != nil {
		http.Error(w, "not found", 404)
		return
	}
	writeJSON(w, 200, item)
}
func (h Handler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	var req domain.CreateEventRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	item, err := h.events.CreateEvent(r.Context(), current.User, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 201, item)
}
func (h Handler) UpdateEvent(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req domain.UpdateEventRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	item, err := h.events.UpdateEvent(r.Context(), current.User, id, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, item)
}
func (h Handler) DeleteEvent(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	if err = h.events.DeleteEvent(r.Context(), current.User, id); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}

func (h Handler) ListComments(w http.ResponseWriter, r *http.Request) {
	entityType := domain.CommentEntityType(strings.TrimSpace(r.URL.Query().Get("entityType")))
	entityID, err := parseID(r.URL.Query().Get("entityId"))
	if err != nil {
		http.Error(w, "entityId required", 400)
		return
	}
	items, err := h.comments.ListByEntity(r.Context(), entityType, entityID)
	if err != nil {
		http.Error(w, "failed", 500)
		return
	}
	writeJSON(w, 200, items)
}

func (h Handler) GetCommentAuthorState(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		writeJSON(w, 200, domain.CommentAuthorState{
			ID:             0,
			Name:           "Guest",
			Role:           domain.RoleGuest,
			IsGuest:        true,
			CanComment:     true,
			CooldownSecond: int(h.cfg.Features.CommentsCooldown.Seconds()),
		})
		return
	}

	role := strongestRole(current.User.Roles)

	state := domain.CommentAuthorState{
		ID:             current.User.ID,
		Name:           current.User.DisplayName,
		Role:           role,
		IsGuest:        role == domain.RoleGuest,
		CanComment:     true,
		CooldownSecond: 0,
	}

	for _, restriction := range current.User.Restrictions {
		if strings.HasPrefix(restriction, "comments:banned") {
			state.CanComment = false
			state.BlockedReason = "Комментарии временно отключены для вашего аккаунта"
		}
	}
	if state.IsGuest {
		state.CooldownSecond = int(h.cfg.Features.CommentsCooldown.Seconds())
	}

	writeJSON(w, 200, state)
}
func (h Handler) CreateComment(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	var req domain.CreateCommentRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	item, err := h.comments.CreateComment(r.Context(), current.User, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 201, item)
}
func (h Handler) ReplyComment(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req domain.ReplyCommentRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	item, err := h.comments.Reply(r.Context(), current.User, id, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 201, item)
}
func (h Handler) UpdateComment(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req domain.UpdateCommentRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	item, err := h.comments.UpdateComment(r.Context(), current.User, id, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, item)
}

func (h Handler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	if err = h.comments.DeleteComment(r.Context(), current.User, id); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}
func (h Handler) SetCommentReaction(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req domain.SetReactionRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	if err = h.comments.SetReaction(r.Context(), current.User, id, req); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}

func (h Handler) GetMyProfile(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	item, err := h.cabinet.GetMyProfile(r.Context(), current.User)
	if err != nil {
		http.Error(w, "failed", 400)
		return
	}
	writeJSON(w, 200, item)
}
func (h Handler) GetMyActions(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	limit := 50
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			limit = parsed
		}
	}
	items, err := h.cabinet.GetMyActions(r.Context(), current.User, limit)
	if err != nil {
		http.Error(w, "failed", 400)
		return
	}
	writeJSON(w, 200, items)
}
func (h Handler) UpdateMyProfile(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	var req domain.UpdateProfileRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	item, err := h.cabinet.UpdateMyProfile(r.Context(), current.User, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, item)
}
func (h Handler) CaptainInviteByUsername(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	teamID, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req domain.CaptainInviteRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	if err = h.cabinet.CaptainInviteByUsername(r.Context(), current.User, teamID, strings.TrimSpace(req.Username)); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}
func (h Handler) CaptainUpdateTeamSocials(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	teamID, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req struct {
		Socials map[string]string `json:"socials"`
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	if err = h.cabinet.CaptainUpdateTeamSocials(r.Context(), current.User, teamID, req.Socials); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}
func (h Handler) CaptainSetRosterVisibility(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	teamID, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	playerID, err := parseID(chi.URLParam(r, "playerId"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req struct {
		Visible bool `json:"visible"`
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	if err = h.cabinet.CaptainManageRosterVisibility(r.Context(), current.User, teamID, playerID, req.Visible); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}
func (h Handler) AdminModerateComment(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	id, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	if err = h.cabinet.AdminModerateComment(r.Context(), current.User, id); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}
func (h Handler) AdminTransferCaptain(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	teamID, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req domain.TransferCaptainRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	if err = h.cabinet.AdminTransferCaptain(r.Context(), current.User, teamID, req.NewCaptainUserID); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}
func (h Handler) AdminBlockComments(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	userID, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req domain.CommentBlockRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	if err = h.cabinet.AdminBlockComments(r.Context(), current.User, userID, req); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}
func (h Handler) AdminAssignCaptainRole(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	userID, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	if err = h.cabinet.AdminAssignCaptainRole(r.Context(), current.User, userID); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}
func (h Handler) AdminRevokeCaptainRole(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	userID, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	if err = h.cabinet.AdminRevokeCaptainRole(r.Context(), current.User, userID); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}
func (h Handler) AdminRemovePlayerFromUser(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	userID, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	if err = h.cabinet.AdminRemovePlayerFromUser(r.Context(), current.User, userID); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}
func (h Handler) AdminGetUserProfile(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	userID, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	item, err := h.cabinet.AdminGetUserProfile(r.Context(), current.User, userID)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, item)
}
func (h Handler) AdminUpdateUserProfile(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	userID, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req domain.UpdateProfileRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	item, err := h.cabinet.AdminUpdateUserProfile(r.Context(), current.User, userID, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, item)
}
func (h Handler) SuperadminAssignRoles(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	userID, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req domain.AssignRolesRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	if err = h.cabinet.SuperadminAssignRoles(r.Context(), current.User, userID, req); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}
func (h Handler) SuperadminAssignPermissions(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	userID, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req domain.AssignPermissionsRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	if err = h.cabinet.SuperadminAssignPermissions(r.Context(), current.User, userID, req); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}
func (h Handler) SuperadminAssignRestrictions(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	userID, err := parseID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "bad id", 400)
		return
	}
	var req domain.AssignRestrictionsRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	if err = h.cabinet.SuperadminAssignRestrictions(r.Context(), current.User, userID, req); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}
func (h Handler) SuperadminSetGlobalSetting(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	var req domain.UpdateGlobalSettingRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "bad request", 400)
		return
	}
	if err := h.cabinet.SuperadminSetGlobalSetting(r.Context(), current.User, chi.URLParam(r, "key"), req); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}
func handleDomainErr(w http.ResponseWriter, err error) {
	if errors.Is(err, tournament.ErrForbidden) || errors.Is(err, eventsservice.ErrForbidden) || errors.Is(err, commentservice.ErrForbidden) || strings.Contains(err.Error(), "forbidden") {
		http.Error(w, "forbidden", 403)
		return
	}
	if errors.Is(err, eventsservice.ErrInvalid) {
		http.Error(w, "invalid scope", 400)
		return
	}
	if errors.Is(err, commentservice.ErrRestricted) {
		http.Error(w, "comments restricted", 403)
		return
	}
	if errors.Is(err, commentservice.ErrRateLimited) {
		http.Error(w, "rate limited", 429)
		return
	}
	http.Error(w, "failed", 400)
}

func strongestRole(roles []domain.Role) domain.Role {
	order := map[domain.Role]int{
		domain.RoleGuest:      0,
		domain.RolePlayer:     1,
		domain.RoleCaptain:    2,
		domain.RoleAdmin:      3,
		domain.RoleSuperadmin: 4,
	}
	top := domain.RoleGuest
	for _, role := range roles {
		if order[role] > order[top] {
			top = role
		}
	}
	return top
}

func parseID(raw string) (int64, error) { return strconv.ParseInt(strings.TrimSpace(raw), 10, 64) }
func setSessionCookie(w http.ResponseWriter, manager session.Manager, token string, expiresAt time.Time) {
	cookie := &http.Cookie{Name: manager.CookieName(), Value: token, Path: "/", HttpOnly: true, Secure: manager.Secure(), SameSite: http.SameSiteLaxMode, Expires: expiresAt}
	if manager.Domain() != "" {
		cookie.Domain = manager.Domain()
	}
	http.SetCookie(w, cookie)
}
func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
func clientIP(r *http.Request) string {
	xff := strings.TrimSpace(strings.Split(r.Header.Get("X-Forwarded-For"), ",")[0])
	if xff != "" {
		return xff
	}
	parts := strings.Split(r.RemoteAddr, ":")
	if len(parts) > 0 {
		return parts[0]
	}
	return ""
}

func decodeJSONStrict(r *http.Request, dst any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(dst); err != nil {
		return err
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("unexpected trailing json")
	}
	return nil
}
