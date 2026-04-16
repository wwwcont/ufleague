package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"football_ui/backend/internal/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrSessionNotFound = errors.New("session not found")

type SessionWithUser struct {
	Session domain.Session
	User    domain.User
}

func (r *AuthRepository) GetPublicUserCard(ctx context.Context, userID int64) (domain.PublicUserCard, error) {
	var card domain.PublicUserCard
	var lastSeen *time.Time
	err := r.pool.QueryRow(ctx, `
		SELECT u.id, u.display_name, COALESCE(u.telegram_username, ''),
		       MAX(s.last_seen_at) FILTER (WHERE s.revoked_at IS NULL AND s.expires_at > NOW()) AS last_seen_at
		FROM users u
		LEFT JOIN sessions s ON s.user_id = u.id
		WHERE u.id = $1
		GROUP BY u.id, u.display_name, u.telegram_username
	`, userID).Scan(&card.ID, &card.DisplayName, &card.TelegramUsername, &lastSeen)
	if err != nil {
		return domain.PublicUserCard{}, err
	}

	roles, err := queryStrings(ctx, r.pool, `
		SELECT r.code
		FROM user_roles ur
		JOIN roles r ON r.id = ur.role_id
		WHERE ur.user_id = $1
		ORDER BY r.code
	`, userID)
	if err != nil {
		return domain.PublicUserCard{}, err
	}
	card.Roles = make([]domain.Role, 0, len(roles))
	for _, role := range roles {
		card.Roles = append(card.Roles, domain.Role(role))
	}

	if lastSeen != nil {
		card.LastSeenAt = lastSeen
		card.IsOnline = time.Since(*lastSeen) <= 5*time.Minute
	}

	var playerID, teamID *int64
	_ = r.pool.QueryRow(ctx, `SELECT id, team_id FROM players WHERE user_id = $1 LIMIT 1`, userID).Scan(&playerID, &teamID)
	if playerID != nil {
		card.PlayerID = playerID
	}

	if teamID == nil {
		_ = r.pool.QueryRow(ctx, `SELECT id FROM teams WHERE captain_user_id = $1 LIMIT 1`, userID).Scan(&teamID)
	}
	if teamID != nil {
		card.TeamID = teamID
	}

	return card, nil
}

func (r *AuthRepository) GetPublicUserCardByTelegramUsername(ctx context.Context, username string) (domain.PublicUserCard, error) {
	normalized := normalizeTelegramUsername(username)
	if normalized == "" {
		return domain.PublicUserCard{}, pgx.ErrNoRows
	}
	var userID int64
	if err := r.pool.QueryRow(ctx, `SELECT id FROM users WHERE lower(telegram_username) = $1`, normalized).Scan(&userID); err != nil {
		return domain.PublicUserCard{}, err
	}
	return r.GetPublicUserCard(ctx, userID)
}

func (r *AuthRepository) SearchPublicUserCardsByTelegramUsername(ctx context.Context, username string, limit int) ([]domain.PublicUserCard, error) {
	normalized := normalizeTelegramUsername(username)
	if normalized == "" {
		return []domain.PublicUserCard{}, nil
	}
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id
		FROM users
		WHERE lower(telegram_username) LIKE $1
		ORDER BY telegram_username ASC, id ASC
		LIMIT $2
	`, normalized+"%", limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cards := make([]domain.PublicUserCard, 0, limit)
	for rows.Next() {
		var userID int64
		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}
		card, err := r.GetPublicUserCard(ctx, userID)
		if err != nil {
			return nil, err
		}
		cards = append(cards, card)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return cards, nil
}

func normalizeTelegramUsername(raw string) string {
	return strings.TrimPrefix(strings.ToLower(strings.TrimSpace(raw)), "@")
}

type CreateSessionParams struct {
	UserID    int64
	TokenHash []byte
	UserAgent string
	IPAddress string
	ExpiresAt string
}

type AuthRepository struct {
	pool *pgxpool.Pool
}

func NewAuthRepository(pool *pgxpool.Pool) *AuthRepository {
	return &AuthRepository{pool: pool}
}

func (r *AuthRepository) ReplaceUserRoles(ctx context.Context, userID int64, roles []domain.Role) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err = replaceUserRolesTx(ctx, tx, userID, roles); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func replaceUserRolesTx(ctx context.Context, tx pgx.Tx, userID int64, roles []domain.Role) error {
	if _, err := tx.Exec(ctx, `DELETE FROM user_roles WHERE user_id = $1`, userID); err != nil {
		return err
	}
	for _, role := range roles {
		if _, err := tx.Exec(ctx, `
			INSERT INTO user_roles (user_id, role_id)
			SELECT $1, id FROM roles WHERE code = $2
		`, userID, role); err != nil {
			return err
		}
	}
	return nil
}

func (r *AuthRepository) GetUserByID(ctx context.Context, userID int64) (domain.User, error) {
	var user domain.User
	err := r.pool.QueryRow(ctx, `
		SELECT id, telegram_id, COALESCE(telegram_username,''), username, display_name, is_active, created_at
		FROM users WHERE id = $1
	`, userID).Scan(&user.ID, &user.TelegramID, &user.TelegramName, &user.Username, &user.DisplayName, &user.IsActive, &user.CreatedAt)
	if err != nil {
		return domain.User{}, err
	}

	roles, err := queryStrings(ctx, r.pool, `
		SELECT r.code
		FROM user_roles ur
		JOIN roles r ON r.id = ur.role_id
		WHERE ur.user_id = $1
		ORDER BY r.code
	`, userID)
	if err != nil {
		return domain.User{}, err
	}
	user.Roles = make([]domain.Role, 0, len(roles))
	for _, role := range roles {
		user.Roles = append(user.Roles, domain.Role(role))
	}

	if user.Permissions, err = queryStrings(ctx, r.pool, `SELECT permission FROM user_permissions WHERE user_id = $1 ORDER BY permission`, userID); err != nil {
		return domain.User{}, err
	}
	if user.Restrictions, err = queryStrings(ctx, r.pool, `SELECT restriction FROM user_restrictions WHERE user_id = $1 ORDER BY restriction`, userID); err != nil {
		return domain.User{}, err
	}
	_ = r.pool.QueryRow(ctx, `SELECT id, team_id FROM players WHERE user_id = $1 LIMIT 1`, userID).Scan(&user.PlayerID, &user.TeamID)
	if user.TeamID == nil {
		_ = r.pool.QueryRow(ctx, `SELECT id FROM teams WHERE captain_user_id = $1 LIMIT 1`, userID).Scan(&user.TeamID)
	}

	return user, nil
}

func (r *AuthRepository) GetUserByUsername(ctx context.Context, username string) (domain.User, error) {
	var id int64
	err := r.pool.QueryRow(ctx, `SELECT id FROM users WHERE username = $1`, username).Scan(&id)
	if err != nil {
		return domain.User{}, err
	}
	return r.GetUserByID(ctx, id)
}

func (r *AuthRepository) CreateSession(ctx context.Context, params CreateSessionParams) (domain.Session, error) {
	var sess domain.Session
	err := r.pool.QueryRow(ctx, `
		INSERT INTO sessions (user_id, token_hash, user_agent, ip, expires_at)
		VALUES ($1, $2, $3, NULLIF($4, '')::inet, $5::timestamptz)
		RETURNING id::text, user_id, expires_at, created_at
	`, params.UserID, params.TokenHash, params.UserAgent, params.IPAddress, params.ExpiresAt).Scan(&sess.ID, &sess.UserID, &sess.ExpiresAt, &sess.CreatedAt)
	return sess, err
}

func (r *AuthRepository) GetSessionWithUserByHash(ctx context.Context, tokenHash []byte) (SessionWithUser, error) {
	var out SessionWithUser
	err := r.pool.QueryRow(ctx, `
		SELECT s.id::text, s.user_id, s.expires_at, s.created_at,
		       u.id, u.telegram_id, COALESCE(u.telegram_username,''), u.username, u.display_name, u.is_active, u.created_at
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = $1
		  AND s.revoked_at IS NULL
		  AND s.expires_at > NOW()
	`, tokenHash).Scan(
		&out.Session.ID,
		&out.Session.UserID,
		&out.Session.ExpiresAt,
		&out.Session.CreatedAt,
		&out.User.ID,
		&out.User.TelegramID,
		&out.User.TelegramName,
		&out.User.Username,
		&out.User.DisplayName,
		&out.User.IsActive,
		&out.User.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return SessionWithUser{}, ErrSessionNotFound
	}
	if err != nil {
		return SessionWithUser{}, err
	}

	user, err := r.GetUserByID(ctx, out.User.ID)
	if err != nil {
		return SessionWithUser{}, err
	}
	out.User = user

	_, _ = r.pool.Exec(ctx, `UPDATE sessions SET last_seen_at = NOW() WHERE id = $1::uuid`, out.Session.ID)

	return out, nil
}

func (r *AuthRepository) RevokeSessionByHash(ctx context.Context, tokenHash []byte) error {
	ct, err := r.pool.Exec(ctx, `
		UPDATE sessions
		SET revoked_at = NOW()
		WHERE token_hash = $1 AND revoked_at IS NULL
	`, tokenHash)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrSessionNotFound
	}
	return nil
}

func queryStrings(ctx context.Context, pool *pgxpool.Pool, query string, args ...any) ([]string, error) {
	rows, err := pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]string, 0)
	for rows.Next() {
		var value string
		if err = rows.Scan(&value); err != nil {
			return nil, err
		}
		out = append(out, value)
	}
	if rows.Err() != nil {
		return nil, fmt.Errorf("iterate rows: %w", rows.Err())
	}
	return out, nil
}
