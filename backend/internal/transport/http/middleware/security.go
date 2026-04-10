package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"sync"
	"time"
)

type SecurityMiddleware struct {
	mu   sync.Mutex
	hits map[string][]time.Time
}

func NewSecurityMiddleware() *SecurityMiddleware {
	return &SecurityMiddleware{hits: map[string][]time.Time{}}
}

func (m *SecurityMiddleware) RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		now := time.Now()
		m.mu.Lock()
		window := now.Add(-1 * time.Minute)
		arr := m.hits[ip]
		f := arr[:0]
		for _, t := range arr {
			if t.After(window) {
				f = append(f, t)
			}
		}
		if len(f) >= 120 {
			m.mu.Unlock()
			http.Error(w, "rate limit", http.StatusTooManyRequests)
			return
		}
		m.hits[ip] = append(f, now)
		m.mu.Unlock()
		next.ServeHTTP(w, r)
	})
}

func (m *SecurityMiddleware) CSRFSimple(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, _ := r.Cookie("csrf_token")
		if cookie == nil || cookie.Value == "" {
			token := randomToken(16)
			http.SetCookie(w, &http.Cookie{
				Name:     "csrf_token",
				Value:    token,
				Path:     "/",
				HttpOnly: false,
				SameSite: http.SameSiteLaxMode,
			})
			cookie = &http.Cookie{Name: "csrf_token", Value: token}
		}
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}
		head := r.Header.Get("X-CSRF-Token")
		if cookie == nil || cookie.Value == "" || head == "" || head != cookie.Value {
			http.Error(w, "csrf", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func randomToken(bytesN int) string {
	buf := make([]byte, bytesN)
	if _, err := rand.Read(buf); err != nil {
		return "dev-csrf-token"
	}
	return hex.EncodeToString(buf)
}

func (m *SecurityMiddleware) BodyLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
		next.ServeHTTP(w, r)
	})
}
