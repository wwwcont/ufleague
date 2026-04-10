package http

import (
	"encoding/json"
	"errors"
	"net/http"
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
	sec := middleware.NewSecurityMiddleware()
	r.Use(sec.RateLimit)
	r.Use(sec.BodyLimit)
	r.Use(sec.CSRFSimple)
	r.Get("/healthz", h.Healthcheck)
	sessionMW := middleware.NewSessionMiddleware(authRepo, sessionManager)

	r.Route("/api/auth", func(r chi.Router) {
		r.With(sessionMW.RequireSession).Get("/me", h.Me)
		r.With(sessionMW.RequireSession).Post("/logout", h.Logout)
		if cfg.Features.DevLoginEnabled {
			r.Post("/dev-login", h.DevLogin)
		}
		r.Post("/telegram/start", h.TelegramAuthStart)
		r.Post("/telegram/complete", h.TelegramAuthComplete)
	})

	r.Route("/api", func(r chi.Router) {
		r.Get("/teams", h.ListTeams)
		r.Get("/teams/{id}", h.GetTeam)
		r.Get("/players", h.ListPlayers)
		r.Get("/players/{id}", h.GetPlayer)
		r.Get("/matches", h.ListMatches)
		r.Get("/matches/{id}", h.GetMatch)
		r.Get("/events", h.ListEvents)
		r.Get("/events/{id}", h.GetEvent)
		r.Get("/comments", h.ListComments)

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
		r.With(sessionMW.RequireSession).Delete("/comments/{id}", h.DeleteComment)
		r.With(sessionMW.RequireSession).Post("/comments/{id}/reactions", h.SetCommentReaction)

		r.With(sessionMW.RequireSession).Get("/me/profile", h.GetMyProfile)
		r.With(sessionMW.RequireSession).Patch("/me/profile", h.UpdateMyProfile)
		r.With(sessionMW.RequireSession).Post("/captain/teams/{id}/invite", h.CaptainInviteByUsername)
		r.With(sessionMW.RequireSession).Patch("/captain/teams/{id}/socials", h.CaptainUpdateTeamSocials)
		r.With(sessionMW.RequireSession).Patch("/captain/teams/{id}/roster/{playerId}", h.CaptainSetRosterVisibility)
		r.With(sessionMW.RequireSession).Post("/admin/comments/{id}/moderate-delete", h.AdminModerateComment)
		r.With(sessionMW.RequireSession).Post("/admin/teams/{id}/transfer-captain", h.AdminTransferCaptain)
		r.With(sessionMW.RequireSession).Post("/admin/users/{id}/comment-block", h.AdminBlockComments)
		r.With(sessionMW.RequireSession).Post("/superadmin/users/{id}/roles", h.SuperadminAssignRoles)
		r.With(sessionMW.RequireSession).Post("/superadmin/users/{id}/permissions", h.SuperadminAssignPermissions)
		r.With(sessionMW.RequireSession).Post("/superadmin/users/{id}/restrictions", h.SuperadminAssignRestrictions)
		r.With(sessionMW.RequireSession).Put("/superadmin/settings/{key}", h.SuperadminSetGlobalSetting)
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
func (h Handler) Me(w http.ResponseWriter, r *http.Request) {
	current, ok := middleware.CurrentSession(r.Context())
	if !ok {
		http.Error(w, "unauthorized", 401)
		return
	}
	writeJSON(w, 200, domain.MeResponse{User: current.User, Session: current.Session})
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
	var req domain.DevLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
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

func (h Handler) TelegramAuthStart(w http.ResponseWriter, r *http.Request) {
	resp, err := h.telegramAuth.Start(r.Context())
	if err != nil {
		http.Error(w, "failed to start telegram auth", 500)
		return
	}
	writeJSON(w, 200, resp)
}

func (h Handler) TelegramAuthComplete(w http.ResponseWriter, r *http.Request) {
	var req domain.TelegramAuthCompleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", 400)
		return
	}
	user, err := h.telegramAuth.Complete(r.Context(), req)
	if err != nil {
		http.Error(w, "telegram auth failed", 401)
		return
	}
	rawToken, tokenHash, err := h.session.GenerateToken()
	if err != nil {
		http.Error(w, "failed to create session", 500)
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
