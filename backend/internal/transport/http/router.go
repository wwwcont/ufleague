package http

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"math/rand"
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
	obs := middleware.NewObservabilityMiddleware()
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
		r.Get("/bracket", h.GetBracket)
		r.Get("/search", h.Search)
		r.Get("/events", h.ListEvents)
		r.Get("/events/{id}", h.GetEvent)
		r.Get("/comments", h.ListComments)
		r.Get("/comments/author-state", h.GetCommentAuthorState)
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
		r.With(sessionMW.RequireSession).Post("/superadmin/users/{id}/roles", h.SuperadminAssignRoles)
		r.With(sessionMW.RequireSession).Post("/superadmin/users/{id}/permissions", h.SuperadminAssignPermissions)
		r.With(sessionMW.RequireSession).Post("/superadmin/users/{id}/restrictions", h.SuperadminAssignRestrictions)
		r.With(sessionMW.RequireSession).Put("/superadmin/settings/{key}", h.SuperadminSetGlobalSetting)
		r.With(sessionMW.RequireSession).Post("/uploads/image", h.UploadImage)
		r.With(sessionMW.RequireSession).Post("/admin/brackets", h.CreatePlayoffBracket)
		r.With(sessionMW.RequireSession).Get("/admin/brackets/{tournamentId}", h.GetPlayoffBracket)
		r.With(sessionMW.RequireSession).Post("/admin/brackets/{bracketId}/layout", h.UpdatePlayoffLayout)
		r.With(sessionMW.RequireSession).Post("/admin/brackets/{bracketId}/ties", h.CreatePlayoffTie)
		r.With(sessionMW.RequireSession).Post("/admin/brackets/ties/attach-match", h.AttachMatchToTie)
		r.With(sessionMW.RequireSession).Post("/admin/brackets/ties/detach-match", h.DetachMatchFromTie)
		r.With(sessionMW.RequireSession).Patch("/admin/brackets/ties/{tieId}", h.MovePlayoffTie)
	})

	return r
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

	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		http.Error(w, "only image files are allowed", 400)
		return
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".jpg"
	}
	filename := fmt.Sprintf("%d_%06d%s", time.Now().UnixMilli(), rand.Intn(1000000), ext)
	targetPath := filepath.Join("uploads", filename)

	dst, err := os.Create(targetPath)
	if err != nil {
		http.Error(w, "failed to create file", 500)
		return
	}
	defer dst.Close()
	if _, err = io.Copy(dst, file); err != nil {
		http.Error(w, "failed to save file", 500)
		return
	}

	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto")); forwarded != "" {
		scheme = forwarded
	}
	writeJSON(w, 201, map[string]string{"url": fmt.Sprintf("%s://%s/uploads/%s", scheme, r.Host, filename)})
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
	if strings.TrimSpace(req.Code) == "" || strings.TrimSpace(req.RequestID) == "" {
		http.Error(w, "request_id and code are required", 400)
		return
	}
	user, err := h.telegramAuth.CompleteCode(r.Context(), req)
	if err != nil {
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
	setSessionCookie(w, h.session, rawToken, sess.ExpiresAt)
	writeJSON(w, 200, domain.MeResponse{User: user, Session: sess})
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

	seedByCode := map[string]string{
		"UFL-SUPERADMIN-2026": "superadmin",
		"UFL-ADMIN-2026":      "admin_test",
		"UFL-CAPTAIN-2026":    "captain_alpha",
		"UFL-PLAYER-2026":     "player_test",
	}
	if h.cfg.Features.TelegramMockCode != "" {
		seedByCode[h.cfg.Features.TelegramMockCode] = "superadmin"
	}

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
	teams, err := h.tournament.ListTeams(r.Context())
	if err != nil {
		http.Error(w, "failed", 500)
		return
	}
	matches, err := h.tournament.ListMatches(r.Context())
	if err != nil {
		http.Error(w, "failed", 500)
		return
	}

	stats := make(map[int64]*domain.StandingRow, len(teams))
	for _, team := range teams {
		stats[team.ID] = &domain.StandingRow{TeamID: team.ID}
	}

	for _, m := range matches {
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
			home.Points += 3
		case m.HomeScore < m.AwayScore:
			away.Won++
			home.Lost++
			away.Points += 3
		default:
			home.Drawn++
			away.Drawn++
			home.Points++
			away.Points++
		}
	}

	rows := make([]domain.StandingRow, 0, len(stats))
	for _, row := range stats {
		row.GoalDiff = row.GoalsFor - row.GoalsAgainst
		rows = append(rows, *row)
	}

	sort.Slice(rows, func(i, j int) bool {
		if rows[i].Points != rows[j].Points {
			return rows[i].Points > rows[j].Points
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

func (h Handler) GetBracket(w http.ResponseWriter, r *http.Request) {
	tournamentID := int64(1)
	if raw := strings.TrimSpace(r.URL.Query().Get("tournamentId")); raw != "" {
		if parsed, parseErr := parseID(raw); parseErr == nil && parsed > 0 {
			tournamentID = parsed
		}
	}
	if bracket, err := h.tournament.GetPlayoffBracket(r.Context(), tournamentID); err == nil {
		writeJSON(w, 200, mapPlayoffBracketToLegacyResponse(bracket))
		return
	}

	matches, err := h.tournament.ListMatches(r.Context())
	if err != nil {
		http.Error(w, "failed", 500)
		return
	}
	sort.Slice(matches, func(i, j int) bool { return matches[i].ID < matches[j].ID })

	teams, _ := h.tournament.ListTeams(r.Context())
	capacity := 16
	if len(teams) > 0 {
		nextPower := 1
		for nextPower < len(teams) {
			nextPower *= 2
		}
		switch {
		case nextPower <= 4:
			capacity = 4
		case nextPower <= 8:
			capacity = 8
		case nextPower <= 16:
			capacity = 16
		default:
			capacity = 32
		}
	}

	maxStageColumn := 1
	for _, match := range matches {
		if match.StageSlotColumn != nil && *match.StageSlotColumn > maxStageColumn {
			maxStageColumn = *match.StageSlotColumn
		}
	}

	stageCount := int(math.Log2(float64(capacity)))
	if maxStageColumn > stageCount {
		stageCount = maxStageColumn
	}

	rounds := make([]domain.BracketRound, 0, stageCount)
	for i := 1; i <= stageCount; i++ {
		matchesInStage := capacity / (1 << i)
		label := fmt.Sprintf("Stage %d", i)
		switch matchesInStage {
		case 8:
			label = "1/8 финала"
		case 4:
			label = "1/4 финала"
		case 2:
			label = "Полуфинал"
		case 1:
			label = "Финал"
		}
		rounds = append(rounds, domain.BracketRound{ID: fmt.Sprintf("stage_%d", i), Label: label, Order: i})
	}

	stageSlotCounters := map[int]int{}
	bracketMatches := make([]domain.BracketMatch, 0, len(matches))
	for _, match := range matches {
		stageColumn := 1
		if match.StageSlotColumn != nil && *match.StageSlotColumn > 0 {
			stageColumn = *match.StageSlotColumn
		}
		if stageColumn > stageCount {
			stageColumn = stageCount
		}

		slot := 0
		if match.StageSlotRow != nil && *match.StageSlotRow > 0 {
			slot = *match.StageSlotRow
		} else {
			stageSlotCounters[stageColumn]++
			slot = stageSlotCounters[stageColumn]
		}

		homeID, awayID := match.HomeTeamID, match.AwayTeamID
		out := domain.BracketMatch{
			ID:          strconv.FormatInt(match.ID, 10),
			RoundID:     fmt.Sprintf("stage_%d", stageColumn),
			Slot:        slot,
			StageColumn: match.StageSlotColumn,
			StageRow:    match.StageSlotRow,
			HomeTeamID:  &homeID,
			AwayTeamID:  &awayID,
			Status:      match.Status,
			LinkedMatch: strconv.FormatInt(match.ID, 10),
			HomeScore:   &match.HomeScore,
			AwayScore:   &match.AwayScore,
		}
		if match.Status == "finished" {
			if match.HomeScore > match.AwayScore {
				out.WinnerTeamID = &homeID
			} else if match.AwayScore > match.HomeScore {
				out.WinnerTeamID = &awayID
			}
		}
		bracketMatches = append(bracketMatches, out)
	}

	writeJSON(w, 200, domain.BracketResponse{
		Settings: map[string]any{"team_capacity": capacity},
		Rounds:   rounds,
		Matches:  bracketMatches,
	})
}

func (h Handler) CreatePlayoffBracket(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	var req domain.CreatePlayoffBracketRequest
	if err := decodeJSONStrict(r, &req); err != nil {
		http.Error(w, "invalid json body", 400)
		return
	}
	bracket, err := h.tournament.CreatePlayoffBracket(r.Context(), current.User, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 201, bracket)
}

func (h Handler) GetPlayoffBracket(w http.ResponseWriter, r *http.Request) {
	tournamentID, err := parseID(chi.URLParam(r, "tournamentId"))
	if err != nil {
		http.Error(w, "bad tournament id", 400)
		return
	}
	bracket, err := h.tournament.GetPlayoffBracket(r.Context(), tournamentID)
	if err != nil {
		http.Error(w, "not found", 404)
		return
	}
	writeJSON(w, 200, bracket)
}

func (h Handler) UpdatePlayoffLayout(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	bracketID, err := parseID(chi.URLParam(r, "bracketId"))
	if err != nil {
		http.Error(w, "bad bracket id", 400)
		return
	}
	var req domain.UpdatePlayoffLayoutRequest
	if err = decodeJSONStrict(r, &req); err != nil {
		http.Error(w, "invalid json body", 400)
		return
	}
	if err = h.tournament.UpdatePlayoffLayout(r.Context(), current.User, bracketID, req); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}

func (h Handler) CreatePlayoffTie(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	bracketID, err := parseID(chi.URLParam(r, "bracketId"))
	if err != nil {
		http.Error(w, "bad bracket id", 400)
		return
	}
	var req domain.CreatePlayoffTieRequest
	if err = decodeJSONStrict(r, &req); err != nil {
		http.Error(w, "invalid json body", 400)
		return
	}
	req.BracketID = bracketID
	tie, err := h.tournament.CreatePlayoffTie(r.Context(), current.User, req)
	if err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 201, tie)
}

func (h Handler) AttachMatchToTie(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	var req domain.AttachMatchToTieRequest
	if err := decodeJSONStrict(r, &req); err != nil {
		http.Error(w, "invalid json body", 400)
		return
	}
	if err := h.tournament.AttachMatchToTie(r.Context(), current.User, req); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}

func (h Handler) DetachMatchFromTie(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	var req domain.DetachMatchFromTieRequest
	if err := decodeJSONStrict(r, &req); err != nil {
		http.Error(w, "invalid json body", 400)
		return
	}
	if err := h.tournament.DetachMatchFromTie(r.Context(), current.User, req); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}

func (h Handler) MovePlayoffTie(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	tieID, err := parseID(chi.URLParam(r, "tieId"))
	if err != nil {
		http.Error(w, "bad tie id", 400)
		return
	}
	var req domain.MovePlayoffTieRequest
	if err = decodeJSONStrict(r, &req); err != nil {
		http.Error(w, "invalid json body", 400)
		return
	}
	req.TieID = tieID
	if err = h.tournament.MovePlayoffTie(r.Context(), current.User, req); err != nil {
		handleDomainErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}

func mapPlayoffBracketToLegacyResponse(bracket domain.PlayoffBracket) domain.BracketResponse {
	rounds := make([]domain.BracketRound, 0, len(bracket.Stages))
	for _, stage := range bracket.Stages {
		rounds = append(rounds, domain.BracketRound{
			ID:    fmt.Sprintf("stage_%d", stage.Order),
			Label: stage.Label,
			Order: stage.Order,
		})
	}

	matches := make([]domain.BracketMatch, 0, len(bracket.Ties))
	for _, tie := range bracket.Ties {
		stageColumn := tie.StageSlotColumn
		stageRow := tie.StageSlotRow
		slot := tie.Slot
		if stageRow != nil && *stageRow > 0 {
			slot = *stageRow
		}

		payload := domain.BracketMatch{
			ID:           fmt.Sprintf("tie_%d", tie.ID),
			RoundID:      findLegacyRoundID(bracket.Stages, tie.StageID),
			Slot:         slot,
			StageColumn:  stageColumn,
			StageRow:     stageRow,
			HomeTeamID:   tie.HomeTeamID,
			AwayTeamID:   tie.AwayTeamID,
			WinnerTeamID: tie.WinnerTeamID,
			Status:       "scheduled",
		}
		if len(tie.Matches) == 1 {
			leg := tie.Matches[0]
			payload.LinkedMatch = strconv.FormatInt(leg.MatchID, 10)
			payload.Status = leg.Status
			payload.HomeScore = &leg.HomeScore
			payload.AwayScore = &leg.AwayScore
		} else if len(tie.Matches) > 1 && tie.Total != nil {
			homeScore, awayScore := tie.Total.Home, tie.Total.Away
			payload.HomeScore = &homeScore
			payload.AwayScore = &awayScore
			payload.Status = "finished"
		}
		if tie.ResolvedWinnerID != nil {
			payload.WinnerTeamID = tie.ResolvedWinnerID
		}
		matches = append(matches, payload)
	}
	return domain.BracketResponse{
		Settings: map[string]any{"team_capacity": bracket.TeamCapacity},
		Rounds:   rounds,
		Matches:  matches,
	}
}

func findLegacyRoundID(stages []domain.PlayoffStage, stageID int64) string {
	for _, stage := range stages {
		if stage.ID == stageID {
			return fmt.Sprintf("stage_%d", stage.Order)
		}
	}
	return "stage_1"
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
