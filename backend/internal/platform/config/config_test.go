package config

import "testing"

func TestValidateProductionRequiresSecureSession(t *testing.T) {
	cfg := Config{
		AppEnv: "production",
		Session: SessionConfig{
			Secure: false,
		},
		Security: SecurityConfig{
			CORSAllowedOrigins: "https://ufleague.example",
			BodyLimitBytes:     1024,
			RateLimitPerMinute: 60,
		},
	}
	if err := cfg.Validate(); err == nil {
		t.Fatalf("expected validation error for insecure production config")
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

func TestValidateDevelopmentAllowsBasicConfig(t *testing.T) {
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
