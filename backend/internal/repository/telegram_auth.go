package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"football_ui/backend/internal/domain"
)

func (r *AuthRepository) CreateTelegramChallenge(ctx context.Context, state, nonce string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO telegram_auth_challenges (state, nonce, expires_at) VALUES ($1,$2,$3)`, state, nonce, expiresAt)
	return err
}

func (r *AuthRepository) ConsumeTelegramChallenge(ctx context.Context, state string) error {
	ct, err := r.pool.Exec(ctx, `
	UPDATE telegram_auth_challenges
	SET consumed_at=NOW()
	WHERE state=$1 AND consumed_at IS NULL AND expires_at > NOW()`, state)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return fmt.Errorf("challenge invalid")
	}
	return nil
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
