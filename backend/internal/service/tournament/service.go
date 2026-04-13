package tournament

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"unicode"

	"football_ui/backend/internal/domain"
	"football_ui/backend/internal/domain/authz"
)

var (
	ErrForbidden = errors.New("forbidden")
	slugRegex    = regexp.MustCompile(`[^a-z0-9]+`)
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
	ListPlayoffGrid(ctx context.Context, tournamentID int64) (domain.PlayoffGridResponse, error)
	SavePlayoffGrid(ctx context.Context, tournamentID int64, payload domain.SavePlayoffGridRequest) error
	FindPlayoffMatchCandidates(ctx context.Context, tournamentID, matchID int64) ([]domain.PlayoffGridCell, error)
	AttachMatchToPlayoffCell(ctx context.Context, playoffCellID, matchID int64) error
	DetachMatchFromPlayoffCell(ctx context.Context, playoffCellID, matchID int64) error
	GetPlayoffCell(ctx context.Context, playoffCellID int64) (domain.PlayoffGridCell, error)
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

	team := domain.Team{
		Name:        strings.TrimSpace(req.Name),
		ShortName:   buildShortName(req.ShortName, req.Name),
		Slug:        buildTeamSlug(req.Slug, req.Name, actor.ID),
		Description: req.Description,
		LogoURL:     req.LogoURL,
		Socials:     req.Socials,
	}
	if hasRole(actor, domain.RoleCaptain) && !hasRole(actor, domain.RoleAdmin, domain.RoleSuperadmin) {
		team.CaptainUserID = &actor.ID
	}
	return s.repo.CreateTeam(ctx, team)
}

func buildTeamSlug(inputSlug string, teamName string, actorID int64) string {
	base := strings.TrimSpace(inputSlug)
	if base == "" {
		base = strings.TrimSpace(teamName)
	}
	base = strings.ToLower(base)
	base = slugRegex.ReplaceAllString(base, "-")
	base = strings.Trim(base, "-")
	if base == "" {
		return "team-" + strconv.FormatInt(actorID, 10)
	}
	return base
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
	patch := domain.Team{Name: req.Name, ShortName: buildShortName(req.ShortName, req.Name), Slug: req.Slug, Description: req.Description, LogoURL: req.LogoURL, Socials: req.Socials}
	return s.repo.UpdateTeam(ctx, id, patch)
}

func buildShortName(raw string, teamName string) string {
	normalized := strings.ToUpper(strings.TrimSpace(raw))
	if normalized != "" {
		runes := []rune(normalized)
		if len(runes) >= 3 {
			return string(runes[:3])
		}
		return normalized + strings.Repeat("X", 3-len(runes))
	}
	letters := make([]rune, 0, 3)
	for _, r := range []rune(strings.ToUpper(teamName)) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			letters = append(letters, r)
		}
		if len(letters) == 3 {
			break
		}
	}
	for len(letters) < 3 {
		letters = append(letters, 'X')
	}
	return string(letters)
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
	if req.TeamID == nil || req.UserID == nil {
		return domain.Player{}, ErrForbidden
	}
	if hasRole(actor, domain.RoleCaptain) && !hasRole(actor, domain.RoleAdmin, domain.RoleSuperadmin) {
		team, err := s.repo.GetTeam(ctx, *req.TeamID)
		if err != nil || team.CaptainUserID == nil || *team.CaptainUserID != actor.ID {
			return domain.Player{}, ErrForbidden
		}
	}
	return s.repo.CreatePlayer(ctx, domain.Player{
		UserID: req.UserID, TeamID: req.TeamID, FullName: req.FullName, Nickname: req.Nickname, AvatarURL: req.AvatarURL,
		Socials: req.Socials, Position: req.Position, ShirtNumber: req.ShirtNumber,
	})
}

func (s Service) UpdatePlayer(ctx context.Context, actor domain.User, id int64, req domain.UpdatePlayerRequest) (domain.Player, error) {
	if req.TeamID == nil || req.UserID == nil {
		return domain.Player{}, ErrForbidden
	}
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
		UserID: req.UserID, TeamID: req.TeamID, FullName: req.FullName, Nickname: req.Nickname, AvatarURL: req.AvatarURL,
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
		HomeScore: req.HomeScore, AwayScore: req.AwayScore, ExtraTime: req.ExtraTime, Venue: req.Venue, PlayoffCellID: req.PlayoffCellID,
	})
}

func (s Service) UpdateMatch(ctx context.Context, actor domain.User, id int64, req domain.UpdateMatchRequest) (domain.Match, error) {
	isAdmin := hasRole(actor, domain.RoleAdmin, domain.RoleSuperadmin)
	if !isAdmin {
		if !authz.NewChecker().HasPermission(actor, "match.score.manage") {
			return domain.Match{}, ErrForbidden
		}
		current, err := s.repo.GetMatch(ctx, id)
		if err != nil {
			return domain.Match{}, err
		}
		if req.HomeTeamID != current.HomeTeamID || req.AwayTeamID != current.AwayTeamID || !req.StartAt.Equal(current.StartAt) || req.Status != current.Status || req.Venue != current.Venue || !samePlayoffCell(req.PlayoffCellID, current.PlayoffCellID) {
			return domain.Match{}, ErrForbidden
		}
	}
	return s.repo.UpdateMatch(ctx, id, domain.Match{
		HomeTeamID: req.HomeTeamID, AwayTeamID: req.AwayTeamID, StartAt: req.StartAt, Status: req.Status,
		HomeScore: req.HomeScore, AwayScore: req.AwayScore, ExtraTime: req.ExtraTime, Venue: req.Venue, PlayoffCellID: req.PlayoffCellID,
	})
}

func samePlayoffCell(a, b *int64) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}

func (s Service) GetPlayoffGrid(ctx context.Context, tournamentID int64) (domain.PlayoffGridResponse, error) {
	grid, err := s.repo.ListPlayoffGrid(ctx, tournamentID)
	if err != nil {
		return domain.PlayoffGridResponse{}, err
	}
	for i := range grid.Cells {
		cell := &grid.Cells[i]
		if len(cell.AttachedMatches) == 0 {
			continue
		}
		totalHome := 0
		totalAway := 0
		allFinished := true
		for _, match := range cell.AttachedMatches {
			totalHome += match.HomeScore
			totalAway += match.AwayScore
			if match.Status != "finished" {
				allFinished = false
			}
		}
		cell.AllMatchesFinished = allFinished
		if len(cell.AttachedMatches) == 1 {
			cell.AggregateHomeScore = &cell.AttachedMatches[0].HomeScore
			cell.AggregateAwayScore = &cell.AttachedMatches[0].AwayScore
		} else {
			cell.AggregateHomeScore = &totalHome
			cell.AggregateAwayScore = &totalAway
		}
		if allFinished && cell.HomeTeamID != nil && cell.AwayTeamID != nil {
			if totalHome > totalAway {
				cell.WinnerTeamID = cell.HomeTeamID
			} else if totalAway > totalHome {
				cell.WinnerTeamID = cell.AwayTeamID
			}
		}
	}
	return grid, nil
}

func (s Service) ValidatePlayoffGridDraft(ctx context.Context, actor domain.User, tournamentID int64, payload domain.SavePlayoffGridRequest) error {
	if !hasRole(actor, domain.RoleAdmin, domain.RoleSuperadmin) {
		return ErrForbidden
	}
	if tournamentID <= 0 {
		return fmt.Errorf("tournament id is required")
	}
	coords := map[string]struct{}{}
	uniqueMatch := map[int64]struct{}{}
	cellRefs := map[string]struct{}{}
	for _, cell := range payload.Cells {
		if cell.Col < 1 || cell.Col > 35 || cell.Row < 1 || cell.Row > 35 {
			return fmt.Errorf("cell out of bounds col=%d row=%d", cell.Col, cell.Row)
		}
		coordKey := fmt.Sprintf("%d:%d", cell.Col, cell.Row)
		if _, exists := coords[coordKey]; exists {
			return fmt.Errorf("duplicate cell position: %s", coordKey)
		}
		coords[coordKey] = struct{}{}
		if len(cell.AttachedMatchIDs) > 3 {
			return fmt.Errorf("cell has more than 3 attached matches")
		}
		if cell.ID != nil {
			cellRefs[strconv.FormatInt(*cell.ID, 10)] = struct{}{}
		}
		if cell.TempID != nil && strings.TrimSpace(*cell.TempID) != "" {
			cellRefs[*cell.TempID] = struct{}{}
		}
		if cell.HomeTeamID != nil && cell.AwayTeamID != nil && *cell.HomeTeamID == *cell.AwayTeamID {
			return fmt.Errorf("home/away teams must differ")
		}
		for _, matchID := range cell.AttachedMatchIDs {
			if _, seen := uniqueMatch[matchID]; seen {
				return fmt.Errorf("match %d assigned to more than one cell", matchID)
			}
			uniqueMatch[matchID] = struct{}{}
			match, err := s.repo.GetMatch(ctx, matchID)
			if err != nil {
				return fmt.Errorf("match %d not found", matchID)
			}
			if cell.HomeTeamID == nil || cell.AwayTeamID == nil {
				return fmt.Errorf("cell with attached matches requires both teams")
			}
			if !sameTeamsOrderIndependent(match.HomeTeamID, match.AwayTeamID, *cell.HomeTeamID, *cell.AwayTeamID) {
				return fmt.Errorf("match %d teams do not match playoff cell", matchID)
			}
		}
	}
	for _, line := range payload.Lines {
		fromRef := string(line.FromPlayoffID)
		toRef := string(line.ToPlayoffID)
		if fromRef == "" || toRef == "" {
			return fmt.Errorf("line endpoints are required")
		}
		if _, ok := cellRefs[fromRef]; !ok {
			return fmt.Errorf("line from endpoint not found in payload: %s", fromRef)
		}
		if _, ok := cellRefs[toRef]; !ok {
			return fmt.Errorf("line to endpoint not found in payload: %s", toRef)
		}
	}
	return nil
}

func (s Service) SavePlayoffGrid(ctx context.Context, actor domain.User, tournamentID int64, payload domain.SavePlayoffGridRequest) (domain.PlayoffGridResponse, error) {
	if err := s.ValidatePlayoffGridDraft(ctx, actor, tournamentID, payload); err != nil {
		return domain.PlayoffGridResponse{}, err
	}
	if err := s.repo.SavePlayoffGrid(ctx, tournamentID, payload); err != nil {
		return domain.PlayoffGridResponse{}, err
	}
	return s.GetPlayoffGrid(ctx, tournamentID)
}

func (s Service) GetPlayoffMatchCandidates(ctx context.Context, actor domain.User, tournamentID, matchID int64) ([]domain.PlayoffGridCell, error) {
	if !hasRole(actor, domain.RoleAdmin, domain.RoleSuperadmin) {
		return nil, ErrForbidden
	}
	return s.repo.FindPlayoffMatchCandidates(ctx, tournamentID, matchID)
}

func (s Service) AttachMatchToPlayoffCell(ctx context.Context, actor domain.User, playoffCellID, matchID int64) error {
	if !hasRole(actor, domain.RoleAdmin, domain.RoleSuperadmin) {
		return ErrForbidden
	}
	cell, err := s.repo.GetPlayoffCell(ctx, playoffCellID)
	if err != nil {
		return err
	}
	if cell.HomeTeamID == nil || cell.AwayTeamID == nil {
		return fmt.Errorf("playoff cell must have both teams")
	}
	match, err := s.repo.GetMatch(ctx, matchID)
	if err != nil {
		return err
	}
	if !sameTeamsOrderIndependent(match.HomeTeamID, match.AwayTeamID, *cell.HomeTeamID, *cell.AwayTeamID) {
		return fmt.Errorf("match teams mismatch playoff cell")
	}
	return s.repo.AttachMatchToPlayoffCell(ctx, playoffCellID, matchID)
}

func (s Service) DetachMatchFromPlayoffCell(ctx context.Context, actor domain.User, playoffCellID, matchID int64) error {
	if !hasRole(actor, domain.RoleAdmin, domain.RoleSuperadmin) {
		return ErrForbidden
	}
	return s.repo.DetachMatchFromPlayoffCell(ctx, playoffCellID, matchID)
}

func sameTeamsOrderIndependent(aHome, aAway, bHome, bAway int64) bool {
	return (aHome == bHome && aAway == bAway) || (aHome == bAway && aAway == bHome)
}
