package comments

import (
	"context"
	"testing"
	"time"

	"football_ui/backend/internal/domain"
)

type fakeRepo struct {
	byID map[int64]domain.Comment
}

func (f *fakeRepo) ListByEntity(ctx context.Context, entityType domain.CommentEntityType, entityID int64) ([]domain.Comment, error) {
	return []domain.Comment{}, nil
}
func (f *fakeRepo) GetByID(ctx context.Context, id int64) (domain.Comment, error) {
	return f.byID[id], nil
}
func (f *fakeRepo) Create(ctx context.Context, c domain.Comment) (domain.Comment, error) {
	return c, nil
}
func (f *fakeRepo) SoftDelete(ctx context.Context, id int64) error { return nil }
func (f *fakeRepo) SetReaction(ctx context.Context, commentID, userID int64, reaction domain.ReactionType) error {
	return nil
}

func TestCreateCommentRestrictedUser(t *testing.T) {
	svc := NewService(&fakeRepo{byID: map[int64]domain.Comment{}}, 0)
	_, err := svc.CreateComment(context.Background(), domain.User{
		ID:           1,
		Restrictions: []string{"comments:banned"},
	}, domain.CreateCommentRequest{
		EntityType: domain.CommentEntityTeam,
		EntityID:   1001,
		Body:       "hi",
	})
	if err != ErrRestricted {
		t.Fatalf("expected ErrRestricted, got %v", err)
	}
}

func TestCreateCommentRespectsCooldown(t *testing.T) {
	svc := NewService(&fakeRepo{byID: map[int64]domain.Comment{}}, 5*time.Second)
	user := domain.User{ID: 1}
	_, firstErr := svc.CreateComment(context.Background(), user, domain.CreateCommentRequest{
		EntityType: domain.CommentEntityTeam,
		EntityID:   1001,
		Body:       "first",
	})
	if firstErr != nil {
		t.Fatalf("unexpected first create error: %v", firstErr)
	}

	_, secondErr := svc.CreateComment(context.Background(), user, domain.CreateCommentRequest{
		EntityType: domain.CommentEntityTeam,
		EntityID:   1001,
		Body:       "second",
	})
	if secondErr != ErrRateLimited {
		t.Fatalf("expected ErrRateLimited, got %v", secondErr)
	}
}

func TestDeleteCommentPermission(t *testing.T) {
	repo := &fakeRepo{byID: map[int64]domain.Comment{
		10: {ID: 10, AuthorUserID: 2},
	}}
	svc := NewService(repo, 0)
	err := svc.DeleteComment(context.Background(), domain.User{ID: 3, Roles: []domain.Role{domain.RolePlayer}}, 10)
	if err != ErrForbidden {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}
