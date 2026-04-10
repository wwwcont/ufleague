package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"football_ui/backend/internal/platform/config"

	"golang.org/x/time/rate"
)

type SecurityMiddleware struct {
	bodyLimit int64

	csrfCookieSecure bool
	allowedOrigins   map[string]struct{}

	rateLimiterMu sync.Mutex
	rateLimiters  map[string]*rate.Limiter
	ratePerMinute int

	trustedProxies []*net.IPNet
}

func NewSecurityMiddleware(cfg config.Config) *SecurityMiddleware {
	allowedOrigins := map[string]struct{}{}
	for _, origin := range cfg.AllowedOrigins() {
		allowedOrigins[origin] = struct{}{}
	}

	return &SecurityMiddleware{
		bodyLimit:        cfg.Security.BodyLimitBytes,
		csrfCookieSecure: cfg.Session.Secure,
		allowedOrigins:   allowedOrigins,
		rateLimiters:     map[string]*rate.Limiter{},
		ratePerMinute:    cfg.Security.RateLimitPerMinute,
		trustedProxies:   parseTrustedProxies(cfg.TrustedProxyCIDRs()),
	}
}

func (m *SecurityMiddleware) SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		w.Header().Set("X-XSS-Protection", "0")
		next.ServeHTTP(w, r)
	})
}

func (m *SecurityMiddleware) RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clientIP := m.extractClientIP(r)
		limiter := m.getOrCreateLimiter(clientIP)
		if !limiter.Allow() {
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (m *SecurityMiddleware) getOrCreateLimiter(key string) *rate.Limiter {
	m.rateLimiterMu.Lock()
	defer m.rateLimiterMu.Unlock()

	if limiter, ok := m.rateLimiters[key]; ok {
		return limiter
	}
	eventsPerSecond := float64(m.ratePerMinute) / 60.0
	limiter := rate.NewLimiter(rate.Limit(eventsPerSecond), m.ratePerMinute)
	m.rateLimiters[key] = limiter
	return limiter
}

func (m *SecurityMiddleware) CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && m.isAllowedOrigin(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token, X-Request-ID")
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS")
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
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
				Secure:   m.csrfCookieSecure,
			})
			cookie = &http.Cookie{Name: "csrf_token", Value: token}
		}
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}
		head := r.Header.Get("X-CSRF-Token")
		if cookie == nil || cookie.Value == "" || head == "" || head != cookie.Value {
			http.Error(w, "csrf validation failed", http.StatusForbidden)
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

func (m *SecurityMiddleware) isAllowedOrigin(origin string) bool {
	_, ok := m.allowedOrigins[origin]
	return ok
}

func (m *SecurityMiddleware) BodyLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, m.bodyLimit)
		next.ServeHTTP(w, r)
	})
}

func (m *SecurityMiddleware) extractClientIP(r *http.Request) string {
	remoteHost, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err != nil {
		remoteHost = strings.TrimSpace(r.RemoteAddr)
	}
	remoteIP := net.ParseIP(remoteHost)

	if remoteIP != nil && m.isTrustedProxy(remoteIP) {
		if xff := strings.TrimSpace(strings.Split(r.Header.Get("X-Forwarded-For"), ",")[0]); xff != "" {
			return xff
		}
		if xrip := strings.TrimSpace(r.Header.Get("X-Real-IP")); xrip != "" {
			return xrip
		}
	}

	if remoteHost != "" {
		return remoteHost
	}
	return "unknown"
}

func (m *SecurityMiddleware) isTrustedProxy(ip net.IP) bool {
	for _, n := range m.trustedProxies {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

func parseTrustedProxies(values []string) []*net.IPNet {
	out := make([]*net.IPNet, 0, len(values))
	for _, value := range values {
		_, netw, err := net.ParseCIDR(value)
		if err == nil {
			out = append(out, netw)
		}
	}
	return out
}

func (m *SecurityMiddleware) CleanupLimiters(interval time.Duration, ttl time.Duration, stop <-chan struct{}) {
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-stop:
			return
		case <-t.C:
			m.rateLimiterMu.Lock()
			if ttl <= 0 {
				m.rateLimiters = map[string]*rate.Limiter{}
				m.rateLimiterMu.Unlock()
				continue
			}
			// x/time/rate doesn't expose last hit time; periodic full reset is acceptable.
			m.rateLimiters = map[string]*rate.Limiter{}
			m.rateLimiterMu.Unlock()
		}
	}
}
