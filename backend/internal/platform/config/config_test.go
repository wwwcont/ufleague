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
