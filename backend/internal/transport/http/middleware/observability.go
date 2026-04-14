package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"sync/atomic"
	"time"
)

const requestIDHeader = "X-Request-ID"

type Metrics struct {
	RequestsTotal uint64 `json:"requests_total"`
	Errors4xx     uint64 `json:"errors_4xx"`
	Errors5xx     uint64 `json:"errors_5xx"`
}

type ObservabilityMiddleware struct {
	reqCount uint64
	err4xx   uint64
	err5xx   uint64
	onError  func(context.Context, ErrorFlowReport)
}

type ErrorFlowReport struct {
	OccurredAt       time.Time
	RequestID        string
	Method           string
	Path             string
	Query            string
	RemoteAddr       string
	UserAgent        string
	Referer          string
	BusinessCase     string
	Status           int
	DurationMS       int64
	RequestContentTy string
	ResponsePreview  string
}

func NewObservabilityMiddleware(onError func(context.Context, ErrorFlowReport)) *ObservabilityMiddleware {
	return &ObservabilityMiddleware{onError: onError}
}

func (m *ObservabilityMiddleware) RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get(requestIDHeader)
		if id == "" {
			id = strconv.FormatInt(time.Now().UnixNano(), 36)
		}
		w.Header().Set(requestIDHeader, id)
		next.ServeHTTP(w, r)
	})
}

func (m *ObservabilityMiddleware) RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		useCase := detectBusinessCase(r.Method, r.URL.Path)
		requestID := r.Header.Get(requestIDHeader)
		rec := &statusRecorder{ResponseWriter: w, statusCode: http.StatusOK, maxPreview: 1024}
		slog.Info("http_request_started",
			"method", r.Method,
			"path", r.URL.Path,
			"query", r.URL.RawQuery,
			"request_id", requestID,
			"business_case", useCase,
			"remote_addr", r.RemoteAddr,
		)
		next.ServeHTTP(rec, r)

		durationMS := time.Since(start).Milliseconds()
		atomic.AddUint64(&m.reqCount, 1)
		if rec.statusCode >= 400 && rec.statusCode < 500 {
			atomic.AddUint64(&m.err4xx, 1)
		}
		if rec.statusCode >= 500 {
			atomic.AddUint64(&m.err5xx, 1)
		}

		attrs := []any{
			"method", r.Method,
			"path", r.URL.Path,
			"query", r.URL.RawQuery,
			"status", rec.statusCode,
			"duration_ms", durationMS,
			"request_id", rec.Header().Get(requestIDHeader),
			"business_case", useCase,
			"request_content_type", strings.TrimSpace(r.Header.Get("Content-Type")),
			"response_preview", rec.preview(),
			"remote_addr", r.RemoteAddr,
			"user_agent", r.UserAgent(),
			"referer", r.Referer(),
		}
		switch {
		case rec.statusCode >= 500:
			slog.Error("http_request", attrs...)
			if m.onError != nil {
				report := ErrorFlowReport{
					OccurredAt:       time.Now().UTC(),
					RequestID:        rec.Header().Get(requestIDHeader),
					Method:           r.Method,
					Path:             r.URL.Path,
					Query:            r.URL.RawQuery,
					RemoteAddr:       r.RemoteAddr,
					UserAgent:        r.UserAgent(),
					Referer:          r.Referer(),
					BusinessCase:     useCase,
					Status:           rec.statusCode,
					DurationMS:       durationMS,
					RequestContentTy: strings.TrimSpace(r.Header.Get("Content-Type")),
					ResponsePreview:  rec.preview(),
				}
				go m.onError(context.Background(), report)
			}
		case rec.statusCode >= 400:
			slog.Warn("http_request", attrs...)
		default:
			slog.Info("http_request", attrs...)
		}
	})
}

func (m *ObservabilityMiddleware) Snapshot() Metrics {
	return Metrics{
		RequestsTotal: atomic.LoadUint64(&m.reqCount),
		Errors4xx:     atomic.LoadUint64(&m.err4xx),
		Errors5xx:     atomic.LoadUint64(&m.err5xx),
	}
}

type statusRecorder struct {
	http.ResponseWriter
	statusCode    int
	responseBytes []byte
	maxPreview    int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.statusCode = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *statusRecorder) Write(data []byte) (int, error) {
	if r.maxPreview > 0 && len(r.responseBytes) < r.maxPreview {
		remaining := r.maxPreview - len(r.responseBytes)
		if len(data) > remaining {
			r.responseBytes = append(r.responseBytes, data[:remaining]...)
		} else {
			r.responseBytes = append(r.responseBytes, data...)
		}
	}
	return r.ResponseWriter.Write(data)
}

func (r *statusRecorder) preview() string {
	if len(r.responseBytes) == 0 {
		return ""
	}
	return strings.TrimSpace(string(r.responseBytes))
}

func detectBusinessCase(method, path string) string {
	normalized := strings.TrimSpace(path)
	if normalized == "" {
		return "unknown"
	}
	switch {
	case method == http.MethodPost && normalized == "/api/events":
		return "event_create"
	case method == http.MethodPatch && strings.HasPrefix(normalized, "/api/events/"):
		return "event_update"
	case method == http.MethodDelete && strings.HasPrefix(normalized, "/api/events/"):
		return "event_delete"
	case method == http.MethodPost && normalized == "/api/auth/telegram/start":
		return "telegram_auth_start"
	case method == http.MethodPost && normalized == "/api/auth/telegram/complete-code":
		return "telegram_auth_complete_code"
	case method == http.MethodPost && normalized == "/api/auth/telegram/mock-code-login":
		return "telegram_auth_mock_code_login"
	case method == http.MethodPost && strings.HasPrefix(normalized, "/api/comments"):
		return "comment_write"
	case strings.HasPrefix(normalized, "/api/admin/"):
		return "admin_operation"
	case strings.HasPrefix(normalized, "/api/superadmin/"):
		return "superadmin_operation"
	default:
		return fmt.Sprintf("%s %s", method, normalized)
	}
}
