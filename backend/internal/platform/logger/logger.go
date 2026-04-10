package logger

import (
	"io"
	"log/slog"
	"os"
	"strings"
)

func New(level string, format string) *slog.Logger {
	handlerOpts := &slog.HandlerOptions{Level: parseLevel(level)}
	writer := io.Writer(os.Stdout)

	if strings.EqualFold(format, "text") {
		return slog.New(slog.NewTextHandler(writer, handlerOpts))
	}

	return slog.New(slog.NewJSONHandler(writer, handlerOpts))
}

func parseLevel(level string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
