package middleware

import (
	"log/slog"
	"net/http"
	"strconv"
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
}

func NewObservabilityMiddleware() *ObservabilityMiddleware {
	return &ObservabilityMiddleware{}
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
		rec := &statusRecorder{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(rec, r)

		atomic.AddUint64(&m.reqCount, 1)
		if rec.statusCode >= 400 && rec.statusCode < 500 {
			atomic.AddUint64(&m.err4xx, 1)
		}
		if rec.statusCode >= 500 {
			atomic.AddUint64(&m.err5xx, 1)
		}

		slog.Info("http_request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.statusCode,
			"duration_ms", time.Since(start).Milliseconds(),
			"request_id", rec.Header().Get(requestIDHeader),
		)
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
	statusCode int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.statusCode = code
	r.ResponseWriter.WriteHeader(code)
}
