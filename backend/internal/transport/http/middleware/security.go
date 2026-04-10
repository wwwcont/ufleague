package middleware

import (
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
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}
		cookie, _ := r.Cookie("csrf_token")
		head := r.Header.Get("X-CSRF-Token")
		if cookie == nil || cookie.Value == "" || head == "" || head != cookie.Value {
			http.Error(w, "csrf", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (m *SecurityMiddleware) BodyLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
		next.ServeHTTP(w, r)
	})
}
