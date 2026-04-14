package middleware

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"football_ui/backend/internal/app/session"
	"football_ui/backend/internal/repository"
)

type contextKey string

const contextSession contextKey = "current_session"

type SessionMiddleware struct {
	repo    *repository.AuthRepository
	manager session.Manager
}

func NewSessionMiddleware(repo *repository.AuthRepository, manager session.Manager) SessionMiddleware {
	return SessionMiddleware{repo: repo, manager: manager}
}

func (m SessionMiddleware) RequireSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(m.manager.CookieName())
		if err != nil || cookie.Value == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		sessionData, err := m.repo.GetSessionWithUserByHash(r.Context(), m.manager.HashToken(cookie.Value))
		if err != nil {
			if errors.Is(err, repository.ErrSessionNotFound) {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			slog.Error("session_middleware_load_failed", "err", err, "path", r.URL.Path, "method", r.Method)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		ctx := context.WithValue(r.Context(), contextSession, sessionData)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func CurrentSession(ctx context.Context) (repository.SessionWithUser, bool) {
	value := ctx.Value(contextSession)
	if value == nil {
		return repository.SessionWithUser{}, false
	}
	current, ok := value.(repository.SessionWithUser)
	return current, ok
}
