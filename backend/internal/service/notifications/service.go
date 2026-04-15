package notifications

import (
	"context"
	"fmt"
	"time"

	"football_ui/backend/internal/domain"
	"football_ui/backend/internal/repository"
)

type Service struct {
	repo *repository.NotificationsRepository
}

func NewService(repo *repository.NotificationsRepository) Service { return Service{repo: repo} }

func (s Service) Subscribe(ctx context.Context, sub domain.NotificationSubscription) error {
	return s.repo.CreateSubscription(ctx, sub)
}

func (s Service) EnqueueTeamEvent(ctx context.Context, userID int64, payload map[string]any) error {
	return s.repo.Enqueue(ctx, userID, domain.NotificationTeamEvent, payload)
}
func (s Service) EnqueueGlobalEvent(ctx context.Context, userID int64, payload map[string]any) error {
	return s.repo.Enqueue(ctx, userID, domain.NotificationGlobalEvent, payload)
}
func (s Service) EnqueueCommentReply(ctx context.Context, userID int64, payload map[string]any) error {
	return s.repo.Enqueue(ctx, userID, domain.NotificationCommentReply, payload)
}
func (s Service) EnqueuePlayerCommentNew(ctx context.Context, userID int64, payload map[string]any) error {
	return s.repo.Enqueue(ctx, userID, domain.NotificationPlayerCommentNew, payload)
}

func (s Service) EnsureDefaultTelegramSubscriptions(ctx context.Context, userID int64, chatID int64) error {
	return s.repo.EnsureDefaultTelegramSubscriptions(ctx, userID, chatID)
}

func (s Service) SyncUserPreferences(ctx context.Context, userID int64, prefs domain.NotificationPreferences) error {
	return s.repo.ReplaceUserPreferenceSubscriptions(ctx, userID, prefs)
}

func (s Service) EnqueueEventNotifications(ctx context.Context, scopeType string, scopeID *int64, payload map[string]any) error {
	recipients, err := s.repo.ListEventRecipients(ctx, scopeType, scopeID)
	if err != nil {
		return err
	}
	var nt domain.NotificationType
	switch scopeType {
	case "global":
		nt = domain.NotificationGlobalEvent
	case "match":
		nt = domain.NotificationMatchEvent
	case "team":
		nt = domain.NotificationTeamEvent
	case "player":
		nt = domain.NotificationPlayerEvent
	default:
		return nil
	}
	for _, userID := range recipients {
		if err = s.repo.Enqueue(ctx, userID, nt, payload); err != nil {
			return err
		}
	}
	return nil
}

func (s Service) EnqueueCommentReplyNotification(ctx context.Context, receiverUserID int64, payload map[string]any) error {
	enabled, err := s.repo.IsCommentReplyEnabled(ctx, receiverUserID)
	if err != nil || !enabled {
		return err
	}
	return s.repo.Enqueue(ctx, receiverUserID, domain.NotificationCommentReply, payload)
}

func (s Service) ResolveTelegramChatID(ctx context.Context, userID int64) (*int64, error) {
	return s.repo.TelegramChatIDByUserID(ctx, userID)
}

func (s Service) ClaimPending(ctx context.Context, limit int) ([]domain.NotificationJob, error) {
	return s.repo.ClaimPending(ctx, limit)
}

type TelegramDeliveryAdapter interface {
	Deliver(ctx context.Context, job domain.NotificationJob) error
}

func (s Service) ProcessPending(ctx context.Context, limit int, adapter TelegramDeliveryAdapter) error {
	jobs, err := s.repo.ClaimPending(ctx, limit)
	if err != nil {
		return err
	}
	for _, job := range jobs {
		if err = adapter.Deliver(ctx, job); err != nil {
			_ = s.repo.MarkRetry(ctx, job.ID, 30*time.Second, fmt.Sprintf("delivery_error: %v", err))
			continue
		}
		_ = s.repo.MarkSent(ctx, job.ID)
	}
	return nil
}
