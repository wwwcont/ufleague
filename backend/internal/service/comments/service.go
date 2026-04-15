package comments

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"sync"
	"time"

	"football_ui/backend/internal/domain"
)

var (
	ErrForbidden   = errors.New("forbidden")
	ErrRestricted  = errors.New("comments restricted")
	ErrRateLimited = errors.New("rate limited")
)

type Repository interface {
	ListByEntity(ctx context.Context, entityType domain.CommentEntityType, entityID int64) ([]domain.Comment, error)
	GetByID(ctx context.Context, id int64) (domain.Comment, error)
	Create(ctx context.Context, c domain.Comment) (domain.Comment, error)
	UpdateBody(ctx context.Context, id int64, body string) (domain.Comment, error)
	SoftDelete(ctx context.Context, id int64) error
	SetReaction(ctx context.Context, commentID, userID int64, reaction domain.ReactionType) error
}

type Service struct {
	repo        Repository
	cooldown    time.Duration
	lastComment map[int64]time.Time
	mu          sync.Mutex
}

func NewService(repo Repository, cooldown time.Duration) Service {
	return Service{repo: repo, cooldown: cooldown, lastComment: map[int64]time.Time{}}
}

func (s Service) ListByEntity(ctx context.Context, entityType domain.CommentEntityType, entityID int64) ([]domain.Comment, error) {
	return s.repo.ListByEntity(ctx, entityType, entityID)
}

func (s Service) GetByID(ctx context.Context, id int64) (domain.Comment, error) {
	return s.repo.GetByID(ctx, id)
}

func (s Service) CreateComment(ctx context.Context, user domain.User, req domain.CreateCommentRequest) (domain.Comment, error) {
	if err := s.checkCanWrite(user); err != nil {
		return domain.Comment{}, err
	}
	if err := s.applyCooldown(user.ID); err != nil {
		return domain.Comment{}, err
	}
	return s.repo.Create(ctx, domain.Comment{EntityType: req.EntityType, EntityID: req.EntityID, AuthorUserID: user.ID, Body: strings.TrimSpace(req.Body)})
}

func (s Service) Reply(ctx context.Context, user domain.User, parentID int64, req domain.ReplyCommentRequest) (domain.Comment, error) {
	if err := s.checkCanWrite(user); err != nil {
		return domain.Comment{}, err
	}
	if err := s.applyCooldown(user.ID); err != nil {
		return domain.Comment{}, err
	}
	parent, err := s.repo.GetByID(ctx, parentID)
	if err != nil {
		return domain.Comment{}, err
	}
	return s.repo.Create(ctx, domain.Comment{EntityType: parent.EntityType, EntityID: parent.EntityID, ParentCommentID: &parent.ID, AuthorUserID: user.ID, Body: strings.TrimSpace(req.Body)})
}

func (s Service) UpdateComment(ctx context.Context, user domain.User, commentID int64, req domain.UpdateCommentRequest) (domain.Comment, error) {
	comment, err := s.repo.GetByID(ctx, commentID)
	if err != nil {
		return domain.Comment{}, err
	}
	if comment.AuthorUserID != user.ID {
		return domain.Comment{}, ErrForbidden
	}
	if time.Since(comment.CreatedAt) > 12*time.Hour {
		return domain.Comment{}, ErrForbidden
	}
	return s.repo.UpdateBody(ctx, commentID, strings.TrimSpace(req.Body))
}

func (s Service) DeleteComment(ctx context.Context, user domain.User, commentID int64) error {
	comment, err := s.repo.GetByID(ctx, commentID)
	if err != nil {
		return err
	}
	if comment.AuthorUserID == user.ID || hasRole(user, domain.RoleAdmin, domain.RoleSuperadmin) {
		return s.repo.SoftDelete(ctx, commentID)
	}
	return ErrForbidden
}

func (s Service) SetReaction(ctx context.Context, user domain.User, commentID int64, req domain.SetReactionRequest) error {
	if req.ReactionType != domain.ReactionLike && req.ReactionType != domain.ReactionDislike {
		return ErrForbidden
	}
	_, err := s.repo.GetByID(ctx, commentID)
	if err != nil {
		return err
	}
	return s.repo.SetReaction(ctx, commentID, user.ID, req.ReactionType)
}

func (s Service) checkCanWrite(user domain.User) error {
	for _, r := range user.Restrictions {
		if strings.HasPrefix(r, "comments:banned") {
			return ErrRestricted
		}
		if strings.HasPrefix(r, "comments:cooldown_until:") {
			ts := strings.TrimPrefix(r, "comments:cooldown_until:")
			if unix, err := strconv.ParseInt(ts, 10, 64); err == nil && time.Now().Before(time.Unix(unix, 0)) {
				return ErrRestricted
			}
		}
	}
	return nil
}

func (s Service) applyCooldown(userID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	last, ok := s.lastComment[userID]
	if ok && time.Since(last) < s.cooldown {
		return ErrRateLimited
	}
	s.lastComment[userID] = time.Now()
	return nil
}

func hasRole(user domain.User, roles ...domain.Role) bool {
	for _, r := range user.Roles {
		for _, x := range roles {
			if r == x {
				return true
			}
		}
	}
	return false
}
