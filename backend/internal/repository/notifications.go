package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"football_ui/backend/internal/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type NotificationsRepository struct{ pool *pgxpool.Pool }

func NewNotificationsRepository(pool *pgxpool.Pool) *NotificationsRepository {
	return &NotificationsRepository{pool: pool}
}

func (r *NotificationsRepository) CreateSubscription(ctx context.Context, sub domain.NotificationSubscription) error {
	_, err := r.pool.Exec(ctx, `
	INSERT INTO notification_subscriptions (user_id, notification_type, scope_type, scope_id, telegram_chat_id, is_enabled)
	VALUES ($1,$2,NULLIF($3,''),$4,$5,$6)`, sub.UserID, sub.NotificationType, sub.ScopeType, sub.ScopeID, sub.TelegramChatID, sub.IsEnabled)
	return err
}

func (r *NotificationsRepository) EnsureDefaultTelegramSubscriptions(ctx context.Context, userID int64, chatID int64) error {
	types := []domain.NotificationType{
		domain.NotificationTeamEvent,
		domain.NotificationGlobalEvent,
		domain.NotificationMatchEvent,
		domain.NotificationPlayerEvent,
		domain.NotificationCommentReply,
		domain.NotificationPlayerCommentNew,
	}
	for _, nt := range types {
		_, err := r.pool.Exec(ctx, `
			INSERT INTO notification_subscriptions (user_id, notification_type, scope_type, scope_id, telegram_chat_id, is_enabled)
			SELECT $1, $2, NULL, NULL, $3, TRUE
			WHERE NOT EXISTS (
				SELECT 1
				FROM notification_subscriptions
				WHERE user_id = $1
				  AND notification_type = $2
				  AND scope_type IS NULL
				  AND scope_id IS NULL
				  AND telegram_chat_id = $3
			)
		`, userID, nt, chatID)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *NotificationsRepository) ReplaceUserPreferenceSubscriptions(ctx context.Context, userID int64, prefs domain.NotificationPreferences) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err = tx.Exec(ctx, `
		DELETE FROM notification_subscriptions
		WHERE user_id=$1
		  AND notification_type IN ($2,$3,$4,$5)
	`, userID, domain.NotificationGlobalEvent, domain.NotificationMatchEvent, domain.NotificationTeamEvent, domain.NotificationPlayerEvent); err != nil {
		return err
	}

	if prefs.MuteGlobalFeed {
		if _, err = tx.Exec(ctx, `
			INSERT INTO notification_subscriptions (user_id, notification_type, scope_type, scope_id, telegram_chat_id, is_enabled)
			VALUES ($1,$2,'global',NULL,NULL,FALSE)
		`, userID, domain.NotificationGlobalEvent); err != nil {
			return err
		}
	}

	for _, matchID := range prefs.MutedMatchIDs {
		if _, err = tx.Exec(ctx, `
			INSERT INTO notification_subscriptions (user_id, notification_type, scope_type, scope_id, telegram_chat_id, is_enabled)
			VALUES ($1,$2,'match',$3,NULL,FALSE)
		`, userID, domain.NotificationMatchEvent, matchID); err != nil {
			return err
		}
	}
	for _, teamID := range prefs.FavoriteTeamIDs {
		if _, err = tx.Exec(ctx, `
			INSERT INTO notification_subscriptions (user_id, notification_type, scope_type, scope_id, telegram_chat_id, is_enabled)
			VALUES ($1,$2,'team',$3,NULL,TRUE)
		`, userID, domain.NotificationTeamEvent, teamID); err != nil {
			return err
		}
	}
	for _, playerID := range prefs.FavoritePlayerIDs {
		if _, err = tx.Exec(ctx, `
			INSERT INTO notification_subscriptions (user_id, notification_type, scope_type, scope_id, telegram_chat_id, is_enabled)
			VALUES ($1,$2,'player',$3,NULL,TRUE)
		`, userID, domain.NotificationPlayerEvent, playerID); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *NotificationsRepository) ListEventRecipients(ctx context.Context, scopeType string, scopeID *int64) ([]int64, error) {
	if scopeType == "" {
		return nil, nil
	}
	var rows pgx.Rows
	var err error
	switch scopeType {
	case "global":
		rows, err = r.pool.Query(ctx, `
			SELECT u.id
			FROM users u
			WHERE u.telegram_id IS NOT NULL
			  AND NOT EXISTS (
				SELECT 1 FROM notification_subscriptions s
				WHERE s.user_id=u.id
				  AND s.notification_type=$1
				  AND s.scope_type='global'
				  AND s.scope_id IS NULL
				  AND s.is_enabled=FALSE
			  )
		`, domain.NotificationGlobalEvent)
	case "match":
		if scopeID == nil {
			return nil, nil
		}
		rows, err = r.pool.Query(ctx, `
			SELECT u.id
			FROM users u
			WHERE u.telegram_id IS NOT NULL
			  AND NOT EXISTS (
				SELECT 1 FROM notification_subscriptions s
				WHERE s.user_id=u.id
				  AND s.notification_type=$1
				  AND s.scope_type='match'
				  AND s.scope_id=$2
				  AND s.is_enabled=FALSE
			  )
		`, domain.NotificationMatchEvent, *scopeID)
	case "team":
		if scopeID == nil {
			return nil, nil
		}
		rows, err = r.pool.Query(ctx, `
			SELECT DISTINCT u.id
			FROM users u
			JOIN notification_subscriptions s ON s.user_id=u.id
			WHERE u.telegram_id IS NOT NULL
			  AND s.notification_type=$1
			  AND s.scope_type='team'
			  AND s.scope_id=$2
			  AND s.is_enabled=TRUE
		`, domain.NotificationTeamEvent, *scopeID)
	case "player":
		if scopeID == nil {
			return nil, nil
		}
		rows, err = r.pool.Query(ctx, `
			SELECT DISTINCT u.id
			FROM users u
			JOIN notification_subscriptions s ON s.user_id=u.id
			WHERE u.telegram_id IS NOT NULL
			  AND s.notification_type=$1
			  AND s.scope_type='player'
			  AND s.scope_id=$2
			  AND s.is_enabled=TRUE
		`, domain.NotificationPlayerEvent, *scopeID)
	default:
		return nil, fmt.Errorf("unsupported scope type: %s", scopeType)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []int64{}
	for rows.Next() {
		var userID int64
		if err = rows.Scan(&userID); err != nil {
			return nil, err
		}
		out = append(out, userID)
	}
	return out, rows.Err()
}

func (r *NotificationsRepository) IsCommentReplyEnabled(ctx context.Context, userID int64) (bool, error) {
	var disabled bool
	if err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM notification_subscriptions
			WHERE user_id=$1
			  AND notification_type=$2
			  AND is_enabled=FALSE
			ORDER BY id DESC
			LIMIT 1
		)
	`, userID, domain.NotificationCommentReply).Scan(&disabled); err != nil {
		return false, err
	}
	return !disabled, nil
}

func (r *NotificationsRepository) TelegramChatIDByUserID(ctx context.Context, userID int64) (*int64, error) {
	var chatID *int64
	if err := r.pool.QueryRow(ctx, `SELECT telegram_id FROM users WHERE id=$1`, userID).Scan(&chatID); err != nil {
		return nil, err
	}
	return chatID, nil
}

func (r *NotificationsRepository) Enqueue(ctx context.Context, userID int64, nt domain.NotificationType, payload map[string]any) error {
	data, _ := json.Marshal(payload)
	_, err := r.pool.Exec(ctx, `
	INSERT INTO notification_jobs (user_id, notification_type, payload)
	VALUES ($1,$2,$3)`, userID, nt, data)
	return err
}

func (r *NotificationsRepository) ClaimPending(ctx context.Context, limit int) ([]domain.NotificationJob, error) {
	rows, err := r.pool.Query(ctx, `
	UPDATE notification_jobs
	SET status='processing', attempts=attempts+1, locked_at=NOW(), updated_at=NOW()
	WHERE id IN (
		SELECT id FROM notification_jobs WHERE status='pending' AND available_at<=NOW() ORDER BY id ASC LIMIT $1 FOR UPDATE SKIP LOCKED
	)
	RETURNING id,user_id,notification_type,payload,status,attempts,available_at,created_at`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.NotificationJob{}
	for rows.Next() {
		var job domain.NotificationJob
		var payload []byte
		if err = rows.Scan(&job.ID, &job.UserID, &job.NotificationType, &payload, &job.Status, &job.Attempts, &job.AvailableAt, &job.CreatedAt); err != nil {
			return nil, err
		}
		job.Payload = map[string]any{}
		_ = json.Unmarshal(payload, &job.Payload)
		out = append(out, job)
	}
	return out, rows.Err()
}

func (r *NotificationsRepository) MarkSent(ctx context.Context, jobID int64) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE notification_jobs
		SET status='sent', sent_at=NOW(), updated_at=NOW(), last_error=''
		WHERE id=$1
	`, jobID)
	return err
}

func (r *NotificationsRepository) MarkRetry(ctx context.Context, jobID int64, retryAfter time.Duration, lastErr string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE notification_jobs
		SET status='pending', available_at=NOW() + ($2 * INTERVAL '1 second'), updated_at=NOW(), last_error=$3
		WHERE id=$1
	`, jobID, int64(retryAfter.Seconds()), lastErr)
	return err
}
