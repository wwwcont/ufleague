package repository

import (
	"context"
	"encoding/json"

	"football_ui/backend/internal/domain"

	"github.com/jackc/pgx/v5/pgxpool"
)

type TournamentRepository struct{ pool *pgxpool.Pool }

func NewTournamentRepository(pool *pgxpool.Pool) *TournamentRepository {
	return &TournamentRepository{pool: pool}
}

func (r *TournamentRepository) ListTeams(ctx context.Context) ([]domain.Team, error) {
	rows, err := r.pool.Query(ctx, `SELECT id,name,slug,COALESCE(description,''),COALESCE(logo_url,''),socials,captain_user_id,created_at,updated_at FROM teams ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.Team{}
	for rows.Next() {
		t, err := scanTeam(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}
func (r *TournamentRepository) GetTeam(ctx context.Context, id int64) (domain.Team, error) {
	row := r.pool.QueryRow(ctx, `SELECT id,name,slug,COALESCE(description,''),COALESCE(logo_url,''),socials,captain_user_id,created_at,updated_at FROM teams WHERE id=$1`, id)
	return scanTeam(row)
}
func (r *TournamentRepository) CreateTeam(ctx context.Context, team domain.Team) (domain.Team, error) {
	socials, _ := json.Marshal(team.Socials)
	row := r.pool.QueryRow(ctx, `
	INSERT INTO teams (name,slug,description,logo_url,socials,captain_user_id)
	VALUES ($1,$2,$3,NULLIF($4,''),$5,$6)
	RETURNING id,name,slug,COALESCE(description,''),COALESCE(logo_url,''),socials,captain_user_id,created_at,updated_at`,
		team.Name, team.Slug, team.Description, team.LogoURL, socials, team.CaptainUserID)
	return scanTeam(row)
}
func (r *TournamentRepository) UpdateTeam(ctx context.Context, id int64, team domain.Team) (domain.Team, error) {
	socials, _ := json.Marshal(team.Socials)
	row := r.pool.QueryRow(ctx, `
	UPDATE teams SET name=$2,slug=$3,description=$4,logo_url=NULLIF($5,''),socials=$6,updated_at=NOW()
	WHERE id=$1
	RETURNING id,name,slug,COALESCE(description,''),COALESCE(logo_url,''),socials,captain_user_id,created_at,updated_at`,
		id, team.Name, team.Slug, team.Description, team.LogoURL, socials)
	return scanTeam(row)
}
func (r *TournamentRepository) CountTeamsByCaptain(ctx context.Context, userID int64) (int, error) {
	var c int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM teams WHERE captain_user_id=$1`, userID).Scan(&c)
	return c, err
}

func (r *TournamentRepository) ListPlayers(ctx context.Context) ([]domain.Player, error) {
	rows, err := r.pool.Query(ctx, `SELECT id,team_id,full_name,COALESCE(nickname,''),COALESCE(avatar_url,''),socials,COALESCE(position,''),shirt_number,created_at,updated_at FROM players ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.Player{}
	for rows.Next() {
		p, err := scanPlayer(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}
func (r *TournamentRepository) GetPlayer(ctx context.Context, id int64) (domain.Player, error) {
	row := r.pool.QueryRow(ctx, `SELECT id,team_id,full_name,COALESCE(nickname,''),COALESCE(avatar_url,''),socials,COALESCE(position,''),shirt_number,created_at,updated_at FROM players WHERE id=$1`, id)
	return scanPlayer(row)
}
func (r *TournamentRepository) CreatePlayer(ctx context.Context, p domain.Player) (domain.Player, error) {
	socials, _ := json.Marshal(p.Socials)
	row := r.pool.QueryRow(ctx, `
	INSERT INTO players (team_id,full_name,nickname,avatar_url,socials,position,shirt_number)
	VALUES ($1,$2,NULLIF($3,''),NULLIF($4,''),$5,NULLIF($6,''),$7)
	RETURNING id,team_id,full_name,COALESCE(nickname,''),COALESCE(avatar_url,''),socials,COALESCE(position,''),shirt_number,created_at,updated_at`,
		p.TeamID, p.FullName, p.Nickname, p.AvatarURL, socials, p.Position, p.ShirtNumber)
	return scanPlayer(row)
}
func (r *TournamentRepository) UpdatePlayer(ctx context.Context, id int64, p domain.Player) (domain.Player, error) {
	socials, _ := json.Marshal(p.Socials)
	row := r.pool.QueryRow(ctx, `
	UPDATE players SET team_id=$2,full_name=$3,nickname=NULLIF($4,''),avatar_url=NULLIF($5,''),socials=$6,position=NULLIF($7,''),shirt_number=$8,updated_at=NOW()
	WHERE id=$1
	RETURNING id,team_id,full_name,COALESCE(nickname,''),COALESCE(avatar_url,''),socials,COALESCE(position,''),shirt_number,created_at,updated_at`,
		id, p.TeamID, p.FullName, p.Nickname, p.AvatarURL, socials, p.Position, p.ShirtNumber)
	return scanPlayer(row)
}

func (r *TournamentRepository) ListMatches(ctx context.Context) ([]domain.Match, error) {
	rows, err := r.pool.Query(ctx, `SELECT id,home_team_id,away_team_id,start_at,status,home_score,away_score,extra_time,COALESCE(venue,''),stage_slot_column,stage_slot_row,created_at,updated_at FROM matches ORDER BY start_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.Match{}
	for rows.Next() {
		m, err := scanMatch(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}
func (r *TournamentRepository) GetMatch(ctx context.Context, id int64) (domain.Match, error) {
	row := r.pool.QueryRow(ctx, `SELECT id,home_team_id,away_team_id,start_at,status,home_score,away_score,extra_time,COALESCE(venue,''),stage_slot_column,stage_slot_row,created_at,updated_at FROM matches WHERE id=$1`, id)
	return scanMatch(row)
}
func (r *TournamentRepository) CreateMatch(ctx context.Context, m domain.Match) (domain.Match, error) {
	extra, _ := json.Marshal(m.ExtraTime)
	row := r.pool.QueryRow(ctx, `
	INSERT INTO matches (home_team_id,away_team_id,start_at,status,home_score,away_score,extra_time,venue,stage_slot_column,stage_slot_row)
	VALUES ($1,$2,$3,$4,$5,$6,$7,NULLIF($8,''),$9,$10)
	RETURNING id,home_team_id,away_team_id,start_at,status,home_score,away_score,extra_time,COALESCE(venue,''),stage_slot_column,stage_slot_row,created_at,updated_at`,
		m.HomeTeamID, m.AwayTeamID, m.StartAt, m.Status, m.HomeScore, m.AwayScore, extra, m.Venue, m.StageSlotColumn, m.StageSlotRow)
	return scanMatch(row)
}
func (r *TournamentRepository) UpdateMatch(ctx context.Context, id int64, m domain.Match) (domain.Match, error) {
	extra, _ := json.Marshal(m.ExtraTime)
	row := r.pool.QueryRow(ctx, `
	UPDATE matches SET home_team_id=$2,away_team_id=$3,start_at=$4,status=$5,home_score=$6,away_score=$7,extra_time=$8,venue=NULLIF($9,''),stage_slot_column=$10,stage_slot_row=$11,updated_at=NOW()
	WHERE id=$1
	RETURNING id,home_team_id,away_team_id,start_at,status,home_score,away_score,extra_time,COALESCE(venue,''),stage_slot_column,stage_slot_row,created_at,updated_at`,
		id, m.HomeTeamID, m.AwayTeamID, m.StartAt, m.Status, m.HomeScore, m.AwayScore, extra, m.Venue, m.StageSlotColumn, m.StageSlotRow)
	return scanMatch(row)
}

type scanner interface{ Scan(dest ...any) error }

func scanTeam(row scanner) (domain.Team, error) {
	var t domain.Team
	var socials []byte
	var captain *int64
	err := row.Scan(&t.ID, &t.Name, &t.Slug, &t.Description, &t.LogoURL, &socials, &captain, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return t, err
	}
	t.Socials = map[string]string{}
	_ = json.Unmarshal(socials, &t.Socials)
	t.CaptainUserID = captain
	return t, nil
}
func scanPlayer(row scanner) (domain.Player, error) {
	var p domain.Player
	var socials []byte
	err := row.Scan(&p.ID, &p.TeamID, &p.FullName, &p.Nickname, &p.AvatarURL, &socials, &p.Position, &p.ShirtNumber, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return p, err
	}
	p.Socials = map[string]string{}
	_ = json.Unmarshal(socials, &p.Socials)
	return p, nil
}
func scanMatch(row scanner) (domain.Match, error) {
	var m domain.Match
	var extra []byte
	err := row.Scan(&m.ID, &m.HomeTeamID, &m.AwayTeamID, &m.StartAt, &m.Status, &m.HomeScore, &m.AwayScore, &extra, &m.Venue, &m.StageSlotColumn, &m.StageSlotRow, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return m, err
	}
	m.ExtraTime = map[string]any{}
	_ = json.Unmarshal(extra, &m.ExtraTime)
	return m, nil
}
