package repository

import (
	"context"
	"encoding/json"
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
