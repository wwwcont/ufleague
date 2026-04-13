package domain

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

type PlayoffRef string

func (r *PlayoffRef) UnmarshalJSON(data []byte) error {
	if len(data) == 0 {
		return fmt.Errorf("empty playoff ref")
	}
	if data[0] == '"' {
		var asString string
		if err := json.Unmarshal(data, &asString); err != nil {
			return err
		}
		asString = strings.TrimSpace(asString)
		if asString == "" {
			return fmt.Errorf("playoff ref cannot be empty")
		}
		*r = PlayoffRef(asString)
		return nil
	}
	var asNumber int64
	if err := json.Unmarshal(data, &asNumber); err != nil {
		return fmt.Errorf("invalid playoff ref: %w", err)
	}
	*r = PlayoffRef(strconv.FormatInt(asNumber, 10))
	return nil
}

type PlayoffGridCellPayload struct {
	ID               *int64  `json:"id,omitempty"`
	TempID           *string `json:"temp_id,omitempty"`
	HomeTeamID       *int64  `json:"home_team_id"`
	AwayTeamID       *int64  `json:"away_team_id"`
	Col              int     `json:"col"`
	Row              int     `json:"row"`
	AttachedMatchIDs []int64 `json:"attached_match_ids"`
}

type PlayoffGridLinePayload struct {
	ID            *int64     `json:"id,omitempty"`
	FromPlayoffID PlayoffRef `json:"from_playoff_id"`
	ToPlayoffID   PlayoffRef `json:"to_playoff_id"`
}

type SavePlayoffGridRequest struct {
	Cells []PlayoffGridCellPayload `json:"cells"`
	Lines []PlayoffGridLinePayload `json:"lines"`
}

type PlayoffAttachedMatch struct {
	ID         int64  `json:"id"`
	Status     string `json:"status"`
	HomeScore  int    `json:"home_score"`
	AwayScore  int    `json:"away_score"`
	SortOrder  int    `json:"sort_order"`
	HomeTeamID int64  `json:"home_team_id"`
	AwayTeamID int64  `json:"away_team_id"`
}

type PlayoffGridCell struct {
	ID                 int64                  `json:"id"`
	TournamentCycleID  int64                  `json:"tournament_cycle_id"`
	HomeTeamID         *int64                 `json:"home_team_id"`
	AwayTeamID         *int64                 `json:"away_team_id"`
	Col                int                    `json:"col"`
	Row                int                    `json:"row"`
	AttachedMatchIDs   []int64                `json:"attached_match_ids"`
	AttachedMatches    []PlayoffAttachedMatch `json:"attached_matches"`
	AggregateHomeScore *int                   `json:"aggregate_home_score,omitempty"`
	AggregateAwayScore *int                   `json:"aggregate_away_score,omitempty"`
	WinnerTeamID       *int64                 `json:"winner_team_id,omitempty"`
	AllMatchesFinished bool                   `json:"all_matches_finished"`
	CreatedAt          time.Time              `json:"created_at"`
	UpdatedAt          time.Time              `json:"updated_at"`
}

type PlayoffLine struct {
	ID                int64     `json:"id"`
	TournamentCycleID int64     `json:"tournament_cycle_id"`
	FromPlayoffID     int64     `json:"from_playoff_id"`
	ToPlayoffID       int64     `json:"to_playoff_id"`
	CreatedAt         time.Time `json:"created_at"`
}

type PlayoffGridResponse struct {
	Cells []PlayoffGridCell `json:"cells"`
	Lines []PlayoffLine     `json:"lines"`
}
