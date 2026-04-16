package domain

import "time"

type Team struct {
	ID            int64             `json:"id"`
	Name          string            `json:"name"`
	ShortName     string            `json:"short_name"`
	Slug          string            `json:"slug"`
	Description   string            `json:"description,omitempty"`
	LogoURL       string            `json:"logo_url,omitempty"`
	Archived      bool              `json:"archived"`
	Socials       map[string]string `json:"socials"`
	CaptainUserID *int64            `json:"captain_user_id,omitempty"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
}

type Player struct {
	ID          int64             `json:"id"`
	UserID      *int64            `json:"user_id,omitempty"`
	TeamID      *int64            `json:"team_id,omitempty"`
	FullName    string            `json:"full_name"`
	Nickname    string            `json:"nickname,omitempty"`
	AvatarURL   string            `json:"avatar_url,omitempty"`
	Socials     map[string]string `json:"socials"`
	Position    string            `json:"position,omitempty"`
	ShirtNumber *int              `json:"shirt_number,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

type Match struct {
	ID            int64          `json:"id"`
	TournamentID  int64          `json:"tournament_cycle_id"`
	HomeTeamID    int64          `json:"home_team_id"`
	AwayTeamID    int64          `json:"away_team_id"`
	StartAt       time.Time      `json:"start_at"`
	Status        string         `json:"status"`
	HomeScore     int            `json:"home_score"`
	AwayScore     int            `json:"away_score"`
	ExtraTime     map[string]any `json:"extra_time"`
	Venue         string         `json:"venue,omitempty"`
	PlayoffCellID *int64         `json:"playoff_cell_id,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// TODO(organizers): tournament cycle support so organizers can start a new tournament without wiping historical data.
type TournamentCycle struct {
	ID              int64  `json:"id"`
	Name            string `json:"name"`
	BracketCapacity int    `json:"bracket_team_capacity"`
	IsActive        bool   `json:"is_active"`
}

// TODO(organizers): round node is a tree vertex containing several matches (optionally with aggregate total).
type TournamentRoundNode struct {
	ID            int64  `json:"id"`
	CycleID       int64  `json:"cycle_id"`
	Label         string `json:"label"`
	RoundNumber   int    `json:"round_number"`
	ParentRoundID *int64 `json:"parent_round_id,omitempty"`
}

type CreateTeamRequest struct {
	Name        string            `json:"name"`
	ShortName   string            `json:"short_name"`
	Slug        string            `json:"slug"`
	Description string            `json:"description"`
	LogoURL     string            `json:"logo_url"`
	Socials     map[string]string `json:"socials"`
}

type UpdateTeamRequest = CreateTeamRequest

type CreatePlayerRequest struct {
	UserID      *int64            `json:"user_id"`
	TeamID      *int64            `json:"team_id"`
	FullName    string            `json:"full_name"`
	Nickname    string            `json:"nickname"`
	AvatarURL   string            `json:"avatar_url"`
	Socials     map[string]string `json:"socials"`
	Position    string            `json:"position"`
	ShirtNumber *int              `json:"shirt_number"`
}

type UpdatePlayerRequest = CreatePlayerRequest

type CreateMatchRequest struct {
	TournamentID  *int64         `json:"tournament_cycle_id"`
	HomeTeamID    int64          `json:"home_team_id"`
	AwayTeamID    int64          `json:"away_team_id"`
	StartAt       time.Time      `json:"start_at"`
	Status        string         `json:"status"`
	HomeScore     int            `json:"home_score"`
	AwayScore     int            `json:"away_score"`
	ExtraTime     map[string]any `json:"extra_time"`
	Venue         string         `json:"venue"`
	PlayoffCellID *int64         `json:"playoff_cell_id"`
}

type UpdateMatchRequest = CreateMatchRequest

type CreateTournamentCycleRequest struct {
	Name                string `json:"name"`
	BracketTeamCapacity int    `json:"bracket_team_capacity"`
	IsActive            bool   `json:"is_active"`
}

type UpdateTournamentBracketSettingsRequest struct {
	BracketTeamCapacity int `json:"bracket_team_capacity"`
}
