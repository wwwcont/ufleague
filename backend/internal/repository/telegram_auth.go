package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"football_ui/backend/internal/domain"
)

func (r *AuthRepository) CreateTelegramLoginSession(ctx context.Context, sessionID string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO telegram_login_sessions (id, expires_at)
		VALUES ($1, $2)
	`, sessionID, expiresAt)
	return err
}

func (r *AuthRepository) StoreTelegramLoginCode(ctx context.Context, code domain.TelegramLoginCode) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO telegram_login_codes (
			login_session_id,
			code_hash,
			telegram_user_id,
			telegram_username,
			role_code,
			expires_at,
			issued_by
		) VALUES ($1,$2,$3,$4,$5,$6,$7)
	`, code.SessionID, code.CodeHash, code.TelegramUserID, code.TelegramUsername, code.Role, code.ExpiresAt, code.IssuedBy)
	if err != nil {
		return err
	}
	_, _ = r.pool.Exec(ctx, `
		INSERT INTO telegram_auth_audit_log(event_type, login_session_id, telegram_user_id, role_code, metadata)
		VALUES ('code_issued', $1, $2, $3, jsonb_build_object('issued_by', $4))
	`, code.SessionID, code.TelegramUserID, code.Role, code.IssuedBy)
	return nil
}

func (r *AuthRepository) ConsumeTelegramLoginCode(ctx context.Context, sessionID string, codeHash []byte) (domain.TelegramLoginCode, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return domain.TelegramLoginCode{}, err
	}
	defer tx.Rollback(ctx)

	var out domain.TelegramLoginCode
	err = tx.QueryRow(ctx, `
		UPDATE telegram_login_codes c
		SET consumed_at = NOW()
		FROM telegram_login_sessions s
		WHERE c.login_session_id = $1
			AND c.code_hash = $2
			AND c.consumed_at IS NULL
			AND s.id = c.login_session_id
			AND s.consumed_at IS NULL
			AND s.expires_at > NOW()
		RETURNING c.login_session_id, c.code_hash, c.telegram_user_id, COALESCE(c.telegram_username, ''), c.role_code, c.expires_at, c.issued_by, c.consumed_at
	`, sessionID, codeHash).Scan(&out.SessionID, &out.CodeHash, &out.TelegramUserID, &out.TelegramUsername, &out.Role, &out.ExpiresAt, &out.IssuedBy, &out.ConsumedAt)
	if err != nil {
		return domain.TelegramLoginCode{}, err
	}

	if _, err = tx.Exec(ctx, `UPDATE telegram_login_sessions SET consumed_at = NOW() WHERE id = $1`, sessionID); err != nil {
		return domain.TelegramLoginCode{}, err
	}
	if _, err = tx.Exec(ctx, `
		INSERT INTO telegram_auth_audit_log(event_type, login_session_id, telegram_user_id, role_code)
		VALUES ('code_consumed', $1, $2, $3)
	`, out.SessionID, out.TelegramUserID, out.Role); err != nil {
		return domain.TelegramLoginCode{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return domain.TelegramLoginCode{}, err
	}
	return out, nil
}

func (r *AuthRepository) UpsertTelegramUser(ctx context.Context, identity domain.TelegramIdentity) (domain.User, error) {
	username := identity.Username
	if username == "" {
		username = fmt.Sprintf("tg_%d", identity.TelegramID)
	}
	display := identity.FirstName
	if identity.LastName != "" {
		display = strings.TrimSpace(identity.FirstName + " " + identity.LastName)
	}
	if display == "" {
		display = username
	}

	_, err := r.pool.Exec(ctx, `
	INSERT INTO users (telegram_id, telegram_username, username, display_name, telegram_linked_at)
	VALUES ($1,$2,$3,$4,NOW())
	ON CONFLICT (telegram_id)
	DO UPDATE SET telegram_username=EXCLUDED.telegram_username, display_name=EXCLUDED.display_name, updated_at=NOW(), telegram_linked_at=NOW()`,
		identity.TelegramID, identity.Username, username, display)
	if err != nil {
		return domain.User{}, err
	}

	var id int64
	err = r.pool.QueryRow(ctx, `SELECT id FROM users WHERE telegram_id=$1`, identity.TelegramID).Scan(&id)
	if err != nil {
		return domain.User{}, err
	}
	return r.GetUserByID(ctx, id)
}
