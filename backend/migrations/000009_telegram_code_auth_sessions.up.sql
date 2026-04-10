CREATE TABLE IF NOT EXISTS telegram_login_sessions (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS telegram_login_codes (
    id BIGSERIAL PRIMARY KEY,
    login_session_id TEXT NOT NULL REFERENCES telegram_login_sessions(id) ON DELETE CASCADE,
    code_hash BYTEA NOT NULL,
    telegram_user_id BIGINT NOT NULL,
    telegram_username TEXT,
    role_code TEXT NOT NULL,
    issued_by TEXT NOT NULL DEFAULT 'bot_adapter',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    UNIQUE (login_session_id, code_hash)
);

CREATE TABLE IF NOT EXISTS telegram_auth_audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    login_session_id TEXT,
    telegram_user_id BIGINT,
    role_code TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tg_login_sessions_expires ON telegram_login_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_tg_login_codes_lookup ON telegram_login_codes(login_session_id, code_hash) WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tg_audit_created ON telegram_auth_audit_log(created_at DESC);
