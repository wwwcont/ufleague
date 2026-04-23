package tournament

import (
	"context"
	"errors"
	"testing"
	"time"

	"football_ui/backend/internal/domain"
)

type stubRepo struct {
	playerByID   map[int64]domain.Player
	teamByID     map[int64]domain.Team
	matchByID    map[int64]domain.Match
	updated      domain.Player
	updatedID    int64
	updateCalled bool
	matchUpdated bool
}

func (s *stubRepo) ListTeams(context.Context) ([]domain.Team, error) { return nil, nil }
func (s *stubRepo) GetTeam(_ context.Context, id int64) (domain.Team, error) {
	return s.teamByID[id], nil
}
func (s *stubRepo) CreateTeam(context.Context, domain.Team) (domain.Team, error) {
	return domain.Team{}, nil
}
func (s *stubRepo) UpdateTeam(context.Context, int64, domain.Team) (domain.Team, error) {
	return domain.Team{}, nil
}
func (s *stubRepo) CountTeamsByCaptain(context.Context, int64) (int, error) { return 0, nil }
func (s *stubRepo) ListPlayers(context.Context) ([]domain.Player, error)    { return nil, nil }
func (s *stubRepo) GetPlayer(_ context.Context, id int64) (domain.Player, error) {
	return s.playerByID[id], nil
}
func (s *stubRepo) CreatePlayer(context.Context, domain.Player) (domain.Player, error) {
	return domain.Player{}, nil
}
func (s *stubRepo) ListMatches(context.Context) ([]domain.Match, error) { return nil, nil }
func (s *stubRepo) GetMatch(_ context.Context, id int64) (domain.Match, error) {
	return s.matchByID[id], nil
}
func (s *stubRepo) CreateMatch(context.Context, domain.Match) (domain.Match, error) {
	return domain.Match{}, nil
}
func (s *stubRepo) UpdateMatch(_ context.Context, id int64, match domain.Match) (domain.Match, error) {
	s.matchUpdated = true
	match.ID = id
	return match, nil
}

func (s *stubRepo) AutoFinishExpiredMatches(context.Context, time.Time) ([]int64, error) {
	return nil, nil
}
func (s *stubRepo) ListTournamentCycles(context.Context) ([]domain.TournamentCycle, error) {
	return nil, nil
}
func (s *stubRepo) CreateTournamentCycle(context.Context, domain.CreateTournamentCycleRequest) (domain.TournamentCycle, error) {
	return domain.TournamentCycle{}, nil
}
func (s *stubRepo) DeleteTournamentCycle(context.Context, int64) error { return nil }
func (s *stubRepo) ActivateTournamentCycle(context.Context, int64) error {
	return nil
}
func (s *stubRepo) UpdateTournamentCycleBracketSettings(context.Context, int64, int) error {
	return nil
}
func (s *stubRepo) GetActiveTournamentCycle(context.Context) (domain.TournamentCycle, error) {
	return domain.TournamentCycle{}, nil
}
func (s *stubRepo) ListPlayoffGrid(context.Context, int64) (domain.PlayoffGridResponse, error) {
	return domain.PlayoffGridResponse{}, nil
}
func (s *stubRepo) SavePlayoffGrid(context.Context, int64, domain.SavePlayoffGridRequest) error {
	return nil
}
func (s *stubRepo) FindPlayoffMatchCandidates(context.Context, int64, int64) ([]domain.PlayoffGridCell, error) {
	return nil, nil
}
func (s *stubRepo) AttachMatchToPlayoffCell(context.Context, int64, int64) error { return nil }
func (s *stubRepo) DetachMatchFromPlayoffCell(context.Context, int64, int64) error {
	return nil
}
func (s *stubRepo) GetPlayoffCell(context.Context, int64) (domain.PlayoffGridCell, error) {
	return domain.PlayoffGridCell{}, nil
}
func (s *stubRepo) UpdatePlayer(_ context.Context, id int64, player domain.Player) (domain.Player, error) {
	s.updatedID = id
	s.updated = player
	s.updateCalled = true
	return domain.Player{
		ID:          id,
		UserID:      player.UserID,
		TeamID:      player.TeamID,
		FullName:    player.FullName,
		Nickname:    player.Nickname,
		AvatarURL:   player.AvatarURL,
		Socials:     player.Socials,
		Position:    player.Position,
		ShirtNumber: player.ShirtNumber,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}, nil
}

func TestUpdatePlayer_AllowsOwnerPlayerProfileWithoutUserTeamInPayload(t *testing.T) {
	uid := int64(7)
	teamID := int64(10)
	number := 99
	repo := &stubRepo{
		playerByID: map[int64]domain.Player{
			11: {ID: 11, UserID: &uid, TeamID: &teamID, Position: "MF"},
		},
	}
	svc := NewService(repo)
	actor := domain.User{ID: uid, Roles: []domain.Role{domain.RolePlayer}}

	_, err := svc.UpdatePlayer(context.Background(), actor, 11, domain.UpdatePlayerRequest{
		Position:    "GK",
		ShirtNumber: &number,
	})
	if err != nil {
		t.Fatalf("expected player owner update to be allowed, got error: %v", err)
	}
	if !repo.updateCalled {
		t.Fatalf("expected update to be called")
	}
	if repo.updated.UserID == nil || *repo.updated.UserID != uid {
		t.Fatalf("expected user_id to be preserved from existing player")
	}
	if repo.updated.TeamID == nil || *repo.updated.TeamID != teamID {
		t.Fatalf("expected team_id to be preserved from existing player")
	}
}

func TestUpdatePlayer_AllowsCaptainForOwnTeam(t *testing.T) {
	captainID := int64(42)
	playerUserID := int64(55)
	teamID := int64(3)
	number := 8
	repo := &stubRepo{
		playerByID: map[int64]domain.Player{
			77: {ID: 77, UserID: &playerUserID, TeamID: &teamID, Position: "DF"},
		},
		teamByID: map[int64]domain.Team{
			teamID: {ID: teamID, CaptainUserID: &captainID},
		},
	}
	svc := NewService(repo)
	actor := domain.User{ID: captainID, Roles: []domain.Role{domain.RoleCaptain}}

	_, err := svc.UpdatePlayer(context.Background(), actor, 77, domain.UpdatePlayerRequest{
		Position:    "MF",
		ShirtNumber: &number,
	})
	if err != nil {
		t.Fatalf("expected captain update to be allowed, got error: %v", err)
	}
	if !repo.updateCalled {
		t.Fatalf("expected update to be called")
	}
}

func TestUpdateMatch_ForbidsCaptain(t *testing.T) {
	repo := &stubRepo{}
	svc := NewService(repo)
	actor := domain.User{ID: 7, Roles: []domain.Role{domain.RoleCaptain}}

	_, err := svc.UpdateMatch(context.Background(), actor, 10, domain.UpdateMatchRequest{})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected forbidden for captain, got: %v", err)
	}
	if repo.matchUpdated {
		t.Fatalf("expected match update not to be called")
	}
}

func TestUpdateMatch_AllowsAdmin(t *testing.T) {
	repo := &stubRepo{}
	svc := NewService(repo)
	actor := domain.User{ID: 1, Roles: []domain.Role{domain.RoleAdmin}, Permissions: []string{domain.PermMatchScoreManage}}
	startAt := time.Now().UTC()

	_, err := svc.UpdateMatch(context.Background(), actor, 10, domain.UpdateMatchRequest{
		HomeTeamID: 11,
		AwayTeamID: 12,
		StartAt:    startAt,
		Status:     "live",
	})
	if err != nil {
		t.Fatalf("expected admin update to be allowed, got: %v", err)
	}
	if !repo.matchUpdated {
		t.Fatalf("expected match update to be called")
	}
}

func TestCreateMatchRequiresMatchCreatePermission(t *testing.T) {
	repo := &stubRepo{}
	svc := NewService(repo)
	actor := domain.User{ID: 1, Roles: []domain.Role{domain.RoleAdmin}}

	_, err := svc.CreateMatch(context.Background(), actor, domain.CreateMatchRequest{})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected forbidden when match.create permission is missing, got: %v", err)
	}
}

func TestCreateTournamentCycleRequiresTournamentEditPermission(t *testing.T) {
	repo := &stubRepo{}
	svc := NewService(repo)
	actor := domain.User{ID: 1, Roles: []domain.Role{domain.RoleAdmin}}

	_, err := svc.CreateTournamentCycle(context.Background(), actor, domain.CreateTournamentCycleRequest{Name: "Summer", BracketTeamCapacity: 16})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected forbidden when tournament.edit permission is missing, got: %v", err)
	}
}
