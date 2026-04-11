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
func (f *fakeRepo) UpdateBody(ctx context.Context, id int64, body string) (domain.Comment, error) {
	item := f.byID[id]
	item.Body = body
	return item, nil
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

func TestUpdateCommentOnlyOwnerWithinWindow(t *testing.T) {
	now := time.Now()
	repo := &fakeRepo{byID: map[int64]domain.Comment{
		10: {ID: 10, AuthorUserID: 2, CreatedAt: now.Add(-2 * time.Hour)},
		11: {ID: 11, AuthorUserID: 2, CreatedAt: now.Add(-13 * time.Hour)},
	}}
	svc := NewService(repo, 0)

	if _, err := svc.UpdateComment(context.Background(), domain.User{ID: 3}, 10, domain.UpdateCommentRequest{Body: "new"}); err != ErrForbidden {
		t.Fatalf("expected ErrForbidden for non-owner, got %v", err)
	}

	if _, err := svc.UpdateComment(context.Background(), domain.User{ID: 2}, 11, domain.UpdateCommentRequest{Body: "new"}); err != ErrForbidden {
		t.Fatalf("expected ErrForbidden for expired window, got %v", err)
	}

	updated, err := svc.UpdateComment(context.Background(), domain.User{ID: 2}, 10, domain.UpdateCommentRequest{Body: "new body"})
	if err != nil {
		t.Fatalf("expected successful update, got %v", err)
	}
	if updated.Body != "new body" {
		t.Fatalf("expected updated body, got %q", updated.Body)
	}
}
