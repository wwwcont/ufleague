package repository

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"football_ui/backend/internal/domain"

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

func (r *NotificationsRepository) ListTelegramChatIDs(ctx context.Context, nt domain.NotificationType, scopeType string, scopeID *int64) ([]int64, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT telegram_chat_id
		FROM notification_subscriptions
		WHERE notification_type = $1
		  AND is_enabled = TRUE
		  AND telegram_chat_id IS NOT NULL
		  AND (
			(scope_type IS NULL AND scope_id IS NULL)
			OR (scope_type = NULLIF($2, '') AND (scope_id IS NULL OR scope_id = $3))
		  )
	`, nt, scopeType, scopeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]int64, 0)
	for rows.Next() {
		var chatID int64
		if err = rows.Scan(&chatID); err != nil {
			return nil, err
		}
		out = append(out, chatID)
	}
	return out, rows.Err()
}

func (r *NotificationsRepository) ListTelegramRecipients(ctx context.Context, nt domain.NotificationType, scopeType string, scopeID *int64) ([]domain.TelegramRecipient, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT user_id, telegram_chat_id
		FROM notification_subscriptions
		WHERE notification_type = $1
		  AND is_enabled = TRUE
		  AND telegram_chat_id IS NOT NULL
		  AND (
			(scope_type IS NULL AND scope_id IS NULL)
			OR (scope_type = NULLIF($2, '') AND (scope_id IS NULL OR scope_id = $3))
		  )
	`, nt, scopeType, scopeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.TelegramRecipient, 0)
	for rows.Next() {
		var item domain.TelegramRecipient
		if err = rows.Scan(&item.UserID, &item.ChatID); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
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

func (r *NotificationsRepository) ListUserNotifications(ctx context.Context, userID int64, limit int) ([]domain.UserNotificationItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, notification_type, payload, status, created_at
		FROM notification_jobs
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.UserNotificationItem, 0, limit)
	for rows.Next() {
		var (
			item       domain.UserNotificationItem
			payloadRaw []byte
			createdAt  time.Time
		)
		if err = rows.Scan(&item.ID, &item.NotificationType, &payloadRaw, &item.Status, &createdAt); err != nil {
			return nil, err
		}
		payload := map[string]any{}
		_ = json.Unmarshal(payloadRaw, &payload)
		item.Title = strings.TrimSpace(asString(payload["title"]))
		item.Body = strings.TrimSpace(asString(payload["body"]))
		item.Route = strings.TrimSpace(asString(payload["route"]))
		item.CreatedAt = createdAt.Unix()
		out = append(out, item)
	}
	return out, rows.Err()
}

func asString(value any) string {
	if value == nil {
		return ""
	}
	switch typed := value.(type) {
	case string:
		return typed
	default:
		return ""
	}
}
