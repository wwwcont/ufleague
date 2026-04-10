package tournament

import (
	"context"
	"errors"

	"football_ui/backend/internal/domain"
)

var (
	ErrForbidden = errors.New("forbidden")
)

type Repository interface {
	ListTeams(ctx context.Context) ([]domain.Team, error)
	GetTeam(ctx context.Context, id int64) (domain.Team, error)
	CreateTeam(ctx context.Context, team domain.Team) (domain.Team, error)
	UpdateTeam(ctx context.Context, id int64, team domain.Team) (domain.Team, error)
	CountTeamsByCaptain(ctx context.Context, userID int64) (int, error)

	ListPlayers(ctx context.Context) ([]domain.Player, error)
	GetPlayer(ctx context.Context, id int64) (domain.Player, error)
	CreatePlayer(ctx context.Context, player domain.Player) (domain.Player, error)
	UpdatePlayer(ctx context.Context, id int64, player domain.Player) (domain.Player, error)

	ListMatches(ctx context.Context) ([]domain.Match, error)
	GetMatch(ctx context.Context, id int64) (domain.Match, error)
	CreateMatch(ctx context.Context, match domain.Match) (domain.Match, error)
	UpdateMatch(ctx context.Context, id int64, match domain.Match) (domain.Match, error)
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return Service{repo: repo}
}

func hasRole(user domain.User, roles ...domain.Role) bool {
	for _, current := range user.Roles {
		for _, role := range roles {
			if current == role {
				return true
			}
		}
	}
	return false
}

func (s Service) ListTeams(ctx context.Context) ([]domain.Team, error) { return s.repo.ListTeams(ctx) }
func (s Service) GetTeam(ctx context.Context, id int64) (domain.Team, error) {
	return s.repo.GetTeam(ctx, id)
}

func (s Service) CreateTeam(ctx context.Context, actor domain.User, req domain.CreateTeamRequest) (domain.Team, error) {
	if !hasRole(actor, domain.RoleCaptain, domain.RoleAdmin, domain.RoleSuperadmin) {
		return domain.Team{}, ErrForbidden
	}
	if hasRole(actor, domain.RoleCaptain) && !hasRole(actor, domain.RoleAdmin, domain.RoleSuperadmin) {
		count, err := s.repo.CountTeamsByCaptain(ctx, actor.ID)
		if err != nil {
			return domain.Team{}, err
		}
		if count >= 1 {
			return domain.Team{}, ErrForbidden
		}
	}

	team := domain.Team{Name: req.Name, Slug: req.Slug, Description: req.Description, LogoURL: req.LogoURL, Socials: req.Socials}
	if hasRole(actor, domain.RoleCaptain) && !hasRole(actor, domain.RoleAdmin, domain.RoleSuperadmin) {
		team.CaptainUserID = &actor.ID
	}
	return s.repo.CreateTeam(ctx, team)
}

func (s Service) UpdateTeam(ctx context.Context, actor domain.User, id int64, req domain.UpdateTeamRequest) (domain.Team, error) {
	target, err := s.repo.GetTeam(ctx, id)
	if err != nil {
		return domain.Team{}, err
	}
	if hasRole(actor, domain.RoleCaptain) && !hasRole(actor, domain.RoleAdmin, domain.RoleSuperadmin) {
		if target.CaptainUserID == nil || *target.CaptainUserID != actor.ID {
			return domain.Team{}, ErrForbidden
		}
	} else if !hasRole(actor, domain.RoleAdmin, domain.RoleSuperadmin) {
		return domain.Team{}, ErrForbidden
	}
	patch := domain.Team{Name: req.Name, Slug: req.Slug, Description: req.Description, LogoURL: req.LogoURL, Socials: req.Socials}
	return s.repo.UpdateTeam(ctx, id, patch)
}

func (s Service) ListPlayers(ctx context.Context) ([]domain.Player, error) {
	return s.repo.ListPlayers(ctx)
}
func (s Service) GetPlayer(ctx context.Context, id int64) (domain.Player, error) {
	return s.repo.GetPlayer(ctx, id)
}

func (s Service) CreatePlayer(ctx context.Context, actor domain.User, req domain.CreatePlayerRequest) (domain.Player, error) {
	if !hasRole(actor, domain.RoleCaptain, domain.RoleAdmin, domain.RoleSuperadmin) {
		return domain.Player{}, ErrForbidden
	}
	if hasRole(actor, domain.RoleCaptain) && !hasRole(actor, domain.RoleAdmin, domain.RoleSuperadmin) {
		if req.TeamID == nil {
			return domain.Player{}, ErrForbidden
		}
		team, err := s.repo.GetTeam(ctx, *req.TeamID)
		if err != nil || team.CaptainUserID == nil || *team.CaptainUserID != actor.ID {
			return domain.Player{}, ErrForbidden
		}
	}
	return s.repo.CreatePlayer(ctx, domain.Player{
		TeamID: req.TeamID, FullName: req.FullName, Nickname: req.Nickname, AvatarURL: req.AvatarURL,
		Socials: req.Socials, Position: req.Position, ShirtNumber: req.ShirtNumber,
	})
}

func (s Service) UpdatePlayer(ctx context.Context, actor domain.User, id int64, req domain.UpdatePlayerRequest) (domain.Player, error) {
	if hasRole(actor, domain.RoleCaptain) && !hasRole(actor, domain.RoleAdmin, domain.RoleSuperadmin) {
		player, err := s.repo.GetPlayer(ctx, id)
		if err != nil || player.TeamID == nil {
			return domain.Player{}, ErrForbidden
		}
		team, err := s.repo.GetTeam(ctx, *player.TeamID)
		if err != nil || team.CaptainUserID == nil || *team.CaptainUserID != actor.ID {
			return domain.Player{}, ErrForbidden
		}
	} else if !hasRole(actor, domain.RoleAdmin, domain.RoleSuperadmin) {
		return domain.Player{}, ErrForbidden
	}
	return s.repo.UpdatePlayer(ctx, id, domain.Player{
		TeamID: req.TeamID, FullName: req.FullName, Nickname: req.Nickname, AvatarURL: req.AvatarURL,
		Socials: req.Socials, Position: req.Position, ShirtNumber: req.ShirtNumber,
	})
}

func (s Service) ListMatches(ctx context.Context) ([]domain.Match, error) {
	return s.repo.ListMatches(ctx)
}
func (s Service) GetMatch(ctx context.Context, id int64) (domain.Match, error) {
	return s.repo.GetMatch(ctx, id)
}

func (s Service) CreateMatch(ctx context.Context, actor domain.User, req domain.CreateMatchRequest) (domain.Match, error) {
	if !hasRole(actor, domain.RoleAdmin, domain.RoleSuperadmin) {
		return domain.Match{}, ErrForbidden
	}
	return s.repo.CreateMatch(ctx, domain.Match{
		HomeTeamID: req.HomeTeamID, AwayTeamID: req.AwayTeamID, StartAt: req.StartAt, Status: req.Status,
		HomeScore: req.HomeScore, AwayScore: req.AwayScore, ExtraTime: req.ExtraTime, Venue: req.Venue,
	})
}

func (s Service) UpdateMatch(ctx context.Context, actor domain.User, id int64, req domain.UpdateMatchRequest) (domain.Match, error) {
	if !hasRole(actor, domain.RoleAdmin, domain.RoleSuperadmin) {
		return domain.Match{}, ErrForbidden
	}
	return s.repo.UpdateMatch(ctx, id, domain.Match{
		HomeTeamID: req.HomeTeamID, AwayTeamID: req.AwayTeamID, StartAt: req.StartAt, Status: req.Status,
		HomeScore: req.HomeScore, AwayScore: req.AwayScore, ExtraTime: req.ExtraTime, Venue: req.Venue,
	})
}
