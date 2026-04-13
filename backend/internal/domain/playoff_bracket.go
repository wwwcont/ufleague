package domain

type PlayoffBracket struct {
	ID           int64               `json:"id"`
	TournamentID int64               `json:"tournament_id"`
	TeamCapacity int                 `json:"team_capacity"`
	Stages       []PlayoffStage      `json:"stages"`
	Ties         []PlayoffTie        `json:"ties"`
	Layout       []PlayoffLayoutNode `json:"layout,omitempty"`
}

type PlayoffStage struct {
	ID    int64  `json:"id"`
	Code  string `json:"code"`
	Label string `json:"label"`
	Order int    `json:"order"`
	Size  int    `json:"size"`
}

type PlayoffTieMatch struct {
	ID        int64  `json:"id"`
	TieID     int64  `json:"tie_id"`
	MatchID   int64  `json:"match_id"`
	LegNumber int    `json:"leg_number"`
	Status    string `json:"status"`
	HomeScore int    `json:"home_score"`
	AwayScore int    `json:"away_score"`
}

type PlayoffTieScore struct {
	Home int `json:"home"`
	Away int `json:"away"`
}

type PlayoffTie struct {
	ID                int64             `json:"id"`
	BracketID         int64             `json:"bracket_id"`
	StageID           int64             `json:"stage_id"`
	Slot              int               `json:"slot"`
	HomeTeamID        *int64            `json:"home_team_id,omitempty"`
	AwayTeamID        *int64            `json:"away_team_id,omitempty"`
	WinnerTeamID      *int64            `json:"winner_team_id,omitempty"`
	LegsPlanned       int               `json:"legs_planned"`
	StageSlotColumn   *int              `json:"stage_slot_column,omitempty"`
	StageSlotRow      *int              `json:"stage_slot_row,omitempty"`
	Matches           []PlayoffTieMatch `json:"matches"`
	Total             *PlayoffTieScore  `json:"total,omitempty"`
	ResolvedWinnerID  *int64            `json:"resolved_winner_team_id,omitempty"`
	AdminLockedWinner bool              `json:"admin_locked_winner"`
}

type PlayoffLayoutNode struct {
	NodeType string         `json:"node_type"`
	NodeID   int64          `json:"node_id"`
	X        *int           `json:"x,omitempty"`
	Y        *int           `json:"y,omitempty"`
	Meta     map[string]any `json:"meta,omitempty"`
}

type CreatePlayoffBracketRequest struct {
	TournamentID int64 `json:"tournament_id"`
	TeamCapacity int   `json:"team_capacity"`
}

type CreatePlayoffTieRequest struct {
	BracketID   int64  `json:"bracket_id"`
	StageID     int64  `json:"stage_id"`
	Slot        int    `json:"slot"`
	HomeTeamID  *int64 `json:"home_team_id"`
	AwayTeamID  *int64 `json:"away_team_id"`
	LegsPlanned int    `json:"legs_planned"`
}

type AttachMatchToTieRequest struct {
	TieID     int64 `json:"tie_id"`
	MatchID   int64 `json:"match_id"`
	LegNumber int   `json:"leg_number"`
}

type DetachMatchFromTieRequest struct {
	TieID   int64 `json:"tie_id"`
	MatchID int64 `json:"match_id"`
}

type UpdatePlayoffLayoutRequest struct {
	Nodes []PlayoffLayoutNode `json:"nodes"`
}

type MovePlayoffTieRequest struct {
	TieID           int64  `json:"tie_id"`
	StageID         int64  `json:"stage_id"`
	Slot            int    `json:"slot"`
	StageSlotColumn *int   `json:"stage_slot_column"`
	StageSlotRow    *int   `json:"stage_slot_row"`
	HomeTeamID      *int64 `json:"home_team_id"`
	AwayTeamID      *int64 `json:"away_team_id"`
	WinnerTeamID    *int64 `json:"winner_team_id"`
	LegsPlanned     int    `json:"legs_planned"`
	AdminLockWinner *bool  `json:"admin_lock_winner"`
}
