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

type SearchResult struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	EntityID string `json:"entity_id"`
	Title    string `json:"title"`
	Subtitle string `json:"subtitle,omitempty"`
	Route    string `json:"route"`
}
