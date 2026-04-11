package domain

type StandingRow struct {
	Position     int   `json:"position"`
	TeamID       int64 `json:"team_id"`
	Played       int   `json:"played"`
	Won          int   `json:"won"`
	Drawn        int   `json:"drawn"`
	Lost         int   `json:"lost"`
	GoalsFor     int   `json:"goals_for"`
	GoalsAgainst int   `json:"goals_against"`
	GoalDiff     int   `json:"goal_diff"`
	Points       int   `json:"points"`
}

type BracketRound struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Order int    `json:"order"`
}

type BracketMatch struct {
	ID           string `json:"id"`
	RoundID      string `json:"round_id"`
	Slot         int    `json:"slot"`
	StageColumn  *int   `json:"stage_slot_column,omitempty"`
	StageRow     *int   `json:"stage_slot_row,omitempty"`
	HomeTeamID   *int64 `json:"home_team_id"`
	AwayTeamID   *int64 `json:"away_team_id"`
	WinnerTeamID *int64 `json:"winner_team_id,omitempty"`
	Status       string `json:"status"`
	LinkedMatch  string `json:"linked_match_id,omitempty"`
	HomeScore    *int   `json:"home_score,omitempty"`
	AwayScore    *int   `json:"away_score,omitempty"`
}

type BracketResponse struct {
	Settings map[string]any `json:"settings,omitempty"`
	Rounds   []BracketRound `json:"rounds"`
	Matches  []BracketMatch `json:"matches"`
}

type SearchResult struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	EntityID string `json:"entity_id"`
	Title    string `json:"title"`
	Subtitle string `json:"subtitle,omitempty"`
	Route    string `json:"route"`
}
