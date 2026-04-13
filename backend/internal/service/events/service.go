package events

import (
	"context"
	"errors"
	"strings"

	"football_ui/backend/internal/domain"
)

var (
	ErrForbidden = errors.New("forbidden")
	ErrInvalid   = errors.New("invalid event scope")
)

type Repository interface {
	ListEvents(ctx context.Context) ([]domain.EventFeedItem, error)
	GetEvent(ctx context.Context, id int64) (domain.EventFeedItem, error)
	CreateEvent(ctx context.Context, ev domain.EventFeedItem) (domain.EventFeedItem, error)
	UpdateEvent(ctx context.Context, id int64, ev domain.EventFeedItem) (domain.EventFeedItem, error)
	SoftDeleteEvent(ctx context.Context, id int64) error
	TeamCaptainByTeamID(ctx context.Context, teamID int64) (*int64, error)
	TeamCaptainByPlayerID(ctx context.Context, playerID int64) (*int64, error)
	EventAuthor(ctx context.Context, eventID int64) (int64, error)
}

type Service struct{ repo Repository }

func NewService(repo Repository) Service { return Service{repo: repo} }

func has(user domain.User, roles ...domain.Role) bool {
	for _, r := range user.Roles {
		for _, x := range roles {
			if r == x {
				return true
			}
		}
	}
	return false
}

func (s Service) ListEvents(ctx context.Context) ([]domain.EventFeedItem, error) {
	return s.repo.ListEvents(ctx)
}
func (s Service) GetEvent(ctx context.Context, id int64) (domain.EventFeedItem, error) {
	return s.repo.GetEvent(ctx, id)
}

func (s Service) CreateEvent(ctx context.Context, actor domain.User, req domain.CreateEventRequest) (domain.EventFeedItem, error) {
	for _, restriction := range actor.Restrictions {
		if strings.HasPrefix(restriction, "events:banned") {
			return domain.EventFeedItem{}, ErrForbidden
		}
	}
	if req.ScopeType == domain.EventScopeGlobal && req.ScopeID != nil {
		return domain.EventFeedItem{}, ErrInvalid
	}
	if req.ScopeType != domain.EventScopeGlobal && req.ScopeID == nil {
		return domain.EventFeedItem{}, ErrInvalid
	}

	switch {
	case has(actor, domain.RoleSuperadmin):
		// all scopes
	case has(actor, domain.RoleAdmin):
		if req.ScopeType != domain.EventScopeGlobal && req.ScopeType != domain.EventScopeTeam && req.ScopeType != domain.EventScopePlayer && req.ScopeType != domain.EventScopeMatch {
			return domain.EventFeedItem{}, ErrForbidden
		}
	case has(actor, domain.RoleCaptain):
		if req.ScopeType != domain.EventScopeTeam || req.ScopeID == nil {
			return domain.EventFeedItem{}, ErrForbidden
		}
		captain, err := s.repo.TeamCaptainByTeamID(ctx, *req.ScopeID)
		if err != nil || captain == nil || *captain != actor.ID {
			return domain.EventFeedItem{}, ErrForbidden
		}
	default:
		return domain.EventFeedItem{}, ErrForbidden
	}

	return s.repo.CreateEvent(ctx, domain.EventFeedItem{ScopeType: req.ScopeType, ScopeID: req.ScopeID, AuthorUserID: actor.ID, Title: req.Title, Body: req.Body, Metadata: req.Metadata, Visibility: req.Visibility, IsPinned: req.IsPinned})
}

func (s Service) UpdateEvent(ctx context.Context, actor domain.User, id int64, req domain.UpdateEventRequest) (domain.EventFeedItem, error) {
	if err := s.canMutate(ctx, actor, id, req.ScopeType, req.ScopeID); err != nil {
		return domain.EventFeedItem{}, err
	}
	return s.repo.UpdateEvent(ctx, id, domain.EventFeedItem{ScopeType: req.ScopeType, ScopeID: req.ScopeID, Title: req.Title, Body: req.Body, Metadata: req.Metadata, Visibility: req.Visibility, IsPinned: req.IsPinned})
}

func (s Service) DeleteEvent(ctx context.Context, actor domain.User, id int64) error {
	if err := s.canMutate(ctx, actor, id, "", nil); err != nil {
		return err
	}
	return s.repo.SoftDeleteEvent(ctx, id)
}

func (s Service) canMutate(ctx context.Context, actor domain.User, eventID int64, scope domain.EventScope, scopeID *int64) error {
	if has(actor, domain.RoleSuperadmin, domain.RoleAdmin) {
		return nil
	}
	if !has(actor, domain.RoleCaptain) {
		return ErrForbidden
	}

	author, err := s.repo.EventAuthor(ctx, eventID)
	if err != nil || author != actor.ID {
		return ErrForbidden
	}

	if scope == "" {
		return nil
	}
	if scope != domain.EventScopeTeam || scopeID == nil {
		return ErrForbidden
	}
	captain, err := s.repo.TeamCaptainByTeamID(ctx, *scopeID)
	if err != nil || captain == nil || *captain != actor.ID {
		return ErrForbidden
	}
	return nil
}
