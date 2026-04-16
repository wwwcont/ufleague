package config

import "testing"

func TestValidateProductionRejectsDevAuthFlags(t *testing.T) {
	cfg := Config{
		AppEnv: "production",
		Session: SessionConfig{
			Secure: true,
		},
		Security: SecurityConfig{
			CORSAllowedOrigins: "https://ufleague.example",
			BodyLimitBytes:     1024,
			RateLimitPerMinute: 60,
		},
		Features: FeaturesConfig{
			DevLoginEnabled: true,
		},
	}
	if err := cfg.Validate(); err == nil {
		t.Fatalf("expected validation error for production dev-login")
	}
}

func TestValidateProductionRequiresSecureSessionAndOrigins(t *testing.T) {
	cfg := Config{
		AppEnv: "production",
		Session: SessionConfig{
			Secure: false,
		},
		Security: SecurityConfig{
			CORSAllowedOrigins: "",
			BodyLimitBytes:     1024,
			RateLimitPerMinute: 60,
		},
	}
	if err := cfg.Validate(); err == nil {
		t.Fatalf("expected validation error for insecure production config")
	}
}

func TestValidateDevelopmentAllowsMockFlags(t *testing.T) {
	cfg := Config{
		AppEnv: "development",
		Session: SessionConfig{
			Secure: false,
		},
		Security: SecurityConfig{
			CORSAllowedOrigins: "http://localhost:5173",
			BodyLimitBytes:     1024,
			RateLimitPerMinute: 60,
		},
		Features: FeaturesConfig{
			DevLoginEnabled:          true,
			TelegramMockLoginEnabled: true,
		},
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("unexpected validation error in development: %v", err)
	}
}

func TestFirstNonEmptyEnvReturnsFirstPresentValue(t *testing.T) {
	t.Setenv("BOT_TOKEN", "")
	t.Setenv("TELEGRAM_TOKEN", "legacy-token")
	if got := firstNonEmptyEnv("BOT_TOKEN", "TELEGRAM_TOKEN"); got != "legacy-token" {
		t.Fatalf("expected legacy token fallback, got %q", got)
	}
}

func TestNormalizeTelegramBotToken(t *testing.T) {
	tests := []struct {
		name string
		in   string
		out  string
	}{
		{
			name: "raw token untouched",
			in:   "123456:ABCDEF",
			out:  "123456:ABCDEF",
		},
		{
			name: "bot prefix removed",
			in:   "bot123456:ABCDEF",
			out:  "123456:ABCDEF",
		},
		{
			name: "full api url token extracted",
			in:   "https://api.telegram.org/bot123456:ABCDEF/sendMessage",
			out:  "123456:ABCDEF",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := normalizeTelegramBotToken(tt.in); got != tt.out {
				t.Fatalf("normalizeTelegramBotToken(%q) = %q, want %q", tt.in, got, tt.out)
			}
		})
	}
}
