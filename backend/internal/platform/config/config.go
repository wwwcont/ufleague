package config

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv   string `env:"APP_ENV" envDefault:"development"`
	HTTP     HTTPConfig
	Log      LogConfig
	DB       DBConfig
	Session  SessionConfig
	Security SecurityConfig
	Features FeaturesConfig
	Telegram TelegramConfig
}

type HTTPConfig struct {
	Host            string        `env:"HTTP_HOST" envDefault:"0.0.0.0"`
	Port            int           `env:"HTTP_PORT" envDefault:"8080"`
	ShutdownTimeout time.Duration `env:"HTTP_SHUTDOWN_TIMEOUT" envDefault:"10s"`
}

type LogConfig struct {
	Level  string `env:"LOG_LEVEL" envDefault:"info"`
	Format string `env:"LOG_FORMAT" envDefault:"json"`
}

type DBConfig struct {
	URL             string        `env:"DATABASE_URL,required"`
	MaxConns        int32         `env:"DB_MAX_CONNS" envDefault:"10"`
	MinConns        int32         `env:"DB_MIN_CONNS" envDefault:"2"`
	ConnectTimeout  time.Duration `env:"DB_CONNECT_TIMEOUT" envDefault:"5s"`
	HealthcheckTime time.Duration `env:"DB_HEALTHCHECK_PERIOD" envDefault:"30s"`
}

type SessionConfig struct {
	CookieName string        `env:"SESSION_COOKIE_NAME" envDefault:"football_session"`
	TTL        time.Duration `env:"SESSION_TTL" envDefault:"24h"`
	Secure     bool          `env:"SESSION_SECURE" envDefault:"false"`
	Domain     string        `env:"SESSION_DOMAIN" envDefault:""`
}

type SecurityConfig struct {
	CORSAllowedOrigins string `env:"CORS_ALLOWED_ORIGINS" envDefault:"http://localhost:5173,http://127.0.0.1:5173"`
	TrustedProxies     string `env:"TRUSTED_PROXIES" envDefault:"127.0.0.1/32,::1/128"`
	BodyLimitBytes     int64  `env:"BODY_LIMIT_BYTES" envDefault:"1048576"`
	RateLimitPerMinute int    `env:"RATE_LIMIT_PER_MINUTE" envDefault:"240"`
}

type FeaturesConfig struct {
	DevLoginEnabled          bool          `env:"DEV_LOGIN_ENABLED" envDefault:"false"`
	TelegramMockLoginEnabled bool          `env:"TELEGRAM_MOCK_LOGIN_ENABLED" envDefault:"false"`
	TelegramMockCode         string        `env:"TELEGRAM_MOCK_CODE" envDefault:"UFL-SUPERADMIN-2026"`
	CommentsCooldown         time.Duration `env:"COMMENTS_COOLDOWN" envDefault:"3s"`
}

func (h HTTPConfig) Address() string {
	return fmt.Sprintf("%s:%d", h.Host, h.Port)
}

func Load() (Config, error) {
	_ = godotenv.Load()

	cfg := Config{}
	if err := env.Parse(&cfg); err != nil {
		return Config{}, err
	}
	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func (c Config) IsProduction() bool {
	return strings.EqualFold(strings.TrimSpace(c.AppEnv), "production")
}

func (c Config) AllowedOrigins() []string {
	return splitCSV(c.Security.CORSAllowedOrigins)
}

func (c Config) TrustedProxyCIDRs() []string {
	return splitCSV(c.Security.TrustedProxies)
}

func (c Config) Validate() error {
	if c.IsProduction() {
		if c.Features.DevLoginEnabled {
			return errors.New("DEV_LOGIN_ENABLED must be false in production")
		}
		if c.Features.TelegramMockLoginEnabled {
			return errors.New("TELEGRAM_MOCK_LOGIN_ENABLED must be false in production")
		}
		if !c.Session.Secure {
			return errors.New("SESSION_SECURE must be true in production")
		}
		if len(c.AllowedOrigins()) == 0 {
			return errors.New("CORS_ALLOWED_ORIGINS must be configured in production")
		}
	}
	if c.Security.BodyLimitBytes <= 0 {
		return errors.New("BODY_LIMIT_BYTES must be > 0")
	}
	if c.Security.RateLimitPerMinute <= 0 {
		return errors.New("RATE_LIMIT_PER_MINUTE must be > 0")
	}
	return nil
}

func splitCSV(raw string) []string {
	items := strings.Split(raw, ",")
	out := make([]string, 0, len(items))
	for _, item := range items {
		trimmed := strings.TrimSpace(item)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

type TelegramConfig struct {
	MiniAppAuthURL  string `env:"TELEGRAM_MINIAPP_AUTH_URL" envDefault:"https://t.me/ufleague_auth_bot"`
	BotToken        string `env:"TELEGRAM_BOT_TOKEN" envDefault:""`
	WebhookSecret   string `env:"TELEGRAM_WEBHOOK_SECRET" envDefault:""`
	ErrorFlowChatID int64  `env:"TELEGRAM_ERROR_FLOW_CHAT_ID" envDefault:"373717705"`
}
