package config

import (
	"fmt"
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

type FeaturesConfig struct {
	DevLoginEnabled          bool          `env:"DEV_LOGIN_ENABLED" envDefault:"true"`
	TelegramMockLoginEnabled bool          `env:"TELEGRAM_MOCK_LOGIN_ENABLED" envDefault:"true"`
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

	return cfg, nil
}

type TelegramConfig struct {
	MiniAppAuthURL string `env:"TELEGRAM_MINIAPP_AUTH_URL" envDefault:"https://example.com/tg-auth"`
	BotToken       string `env:"TELEGRAM_BOT_TOKEN" envDefault:""`
}
