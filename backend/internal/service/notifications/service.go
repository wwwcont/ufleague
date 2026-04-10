package notifications

import (
	"context"

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

func (s Service) ClaimPending(ctx context.Context, limit int) ([]domain.NotificationJob, error) {
	return s.repo.ClaimPending(ctx, limit)
}
