package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"football_ui/backend/internal/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TournamentRepository struct{ pool *pgxpool.Pool }

func isUndefinedTableErr(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "42P01"
}

func NewTournamentRepository(pool *pgxpool.Pool) *TournamentRepository {
	return &TournamentRepository{pool: pool}
}

func (r *TournamentRepository) ListTeams(ctx context.Context) ([]domain.Team, error) {
	rows, err := r.pool.Query(ctx, `SELECT id,name,COALESCE(short_name,''),slug,COALESCE(description,''),COALESCE(logo_url,''),archived,socials,captain_user_id,created_at,updated_at FROM teams ORDER BY id DESC`)
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
	row := r.pool.QueryRow(ctx, `SELECT id,name,COALESCE(short_name,''),slug,COALESCE(description,''),COALESCE(logo_url,''),archived,socials,captain_user_id,created_at,updated_at FROM teams WHERE id=$1`, id)
	return scanTeam(row)
}
func (r *TournamentRepository) CreateTeam(ctx context.Context, team domain.Team) (domain.Team, error) {
	socials, _ := json.Marshal(team.Socials)
	row := r.pool.QueryRow(ctx, `
	INSERT INTO teams (name,short_name,slug,description,logo_url,socials,captain_user_id,archived)
	VALUES ($1,$2,$3,$4,NULLIF($5,''),$6,$7,FALSE)
	RETURNING id,name,COALESCE(short_name,''),slug,COALESCE(description,''),COALESCE(logo_url,''),archived,socials,captain_user_id,created_at,updated_at`,
		team.Name, team.ShortName, team.Slug, team.Description, team.LogoURL, socials, team.CaptainUserID)
	return scanTeam(row)
}
func (r *TournamentRepository) UpdateTeam(ctx context.Context, id int64, team domain.Team) (domain.Team, error) {
	socials, _ := json.Marshal(team.Socials)
	row := r.pool.QueryRow(ctx, `
	UPDATE teams SET name=$2,short_name=$3,slug=$4,description=$5,logo_url=NULLIF($6,''),socials=$7,updated_at=NOW()
	WHERE id=$1
	RETURNING id,name,COALESCE(short_name,''),slug,COALESCE(description,''),COALESCE(logo_url,''),archived,socials,captain_user_id,created_at,updated_at`,
		id, team.Name, team.ShortName, team.Slug, team.Description, team.LogoURL, socials)
	return scanTeam(row)
}
func (r *TournamentRepository) CountTeamsByCaptain(ctx context.Context, userID int64) (int, error) {
	var c int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM teams WHERE captain_user_id=$1`, userID).Scan(&c)
	return c, err
}

func (r *TournamentRepository) ListPlayers(ctx context.Context) ([]domain.Player, error) {
	rows, err := r.pool.Query(ctx, `SELECT id,user_id,team_id,COALESCE(full_name,''),COALESCE(nickname,''),COALESCE(avatar_url,''),COALESCE(socials,'{}'::jsonb),COALESCE(position,''),shirt_number,created_at,updated_at FROM players ORDER BY id DESC`)
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
	row := r.pool.QueryRow(ctx, `SELECT id,user_id,team_id,COALESCE(full_name,''),COALESCE(nickname,''),COALESCE(avatar_url,''),COALESCE(socials,'{}'::jsonb),COALESCE(position,''),shirt_number,created_at,updated_at FROM players WHERE id=$1`, id)
	return scanPlayer(row)
}
func (r *TournamentRepository) CreatePlayer(ctx context.Context, p domain.Player) (domain.Player, error) {
	socials, _ := json.Marshal(p.Socials)
	row := r.pool.QueryRow(ctx, `
	INSERT INTO players (user_id,team_id,full_name,nickname,avatar_url,socials,position,shirt_number)
	VALUES ($1,$2,$3,NULLIF($4,''),NULLIF($5,''),$6,NULLIF($7,''),$8)
	RETURNING id,user_id,team_id,full_name,COALESCE(nickname,''),COALESCE(avatar_url,''),socials,COALESCE(position,''),shirt_number,created_at,updated_at`,
		p.UserID, p.TeamID, p.FullName, p.Nickname, p.AvatarURL, socials, p.Position, p.ShirtNumber)
	created, err := scanPlayer(row)
	if err != nil {
		return created, err
	}
	_ = r.syncUserProfileFromPlayer(ctx, created)
	return created, nil
}
func (r *TournamentRepository) UpdatePlayer(ctx context.Context, id int64, p domain.Player) (domain.Player, error) {
	socials, _ := json.Marshal(p.Socials)
	row := r.pool.QueryRow(ctx, `
	UPDATE players SET user_id=$2,team_id=$3,full_name=$4,nickname=NULLIF($5,''),avatar_url=NULLIF($6,''),socials=$7,position=NULLIF($8,''),shirt_number=$9,updated_at=NOW()
	WHERE id=$1
	RETURNING id,user_id,team_id,full_name,COALESCE(nickname,''),COALESCE(avatar_url,''),socials,COALESCE(position,''),shirt_number,created_at,updated_at`,
		id, p.UserID, p.TeamID, p.FullName, p.Nickname, p.AvatarURL, socials, p.Position, p.ShirtNumber)
	updated, err := scanPlayer(row)
	if err != nil {
		return updated, err
	}
	_ = r.syncUserProfileFromPlayer(ctx, updated)
	return updated, nil
}

func (r *TournamentRepository) ListMatches(ctx context.Context) ([]domain.Match, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id,
			COALESCE(tournament_cycle_id, 1),
			COALESCE(home_team_id, 0),
			COALESCE(away_team_id, 0),
			COALESCE(start_at, NOW()),
			COALESCE(status, 'scheduled'),
			COALESCE(home_score, 0),
			COALESCE(away_score, 0),
			COALESCE(extra_time, '{}'::jsonb),
			COALESCE(venue,''),
			playoff_cell_id,
			created_at,
			updated_at
		FROM matches
		ORDER BY start_at DESC`)
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
	row := r.pool.QueryRow(ctx, `
		SELECT id,
			COALESCE(tournament_cycle_id, 1),
			COALESCE(home_team_id, 0),
			COALESCE(away_team_id, 0),
			COALESCE(start_at, NOW()),
			COALESCE(status, 'scheduled'),
			COALESCE(home_score, 0),
			COALESCE(away_score, 0),
			COALESCE(extra_time, '{}'::jsonb),
			COALESCE(venue,''),
			playoff_cell_id,
			created_at,
			updated_at
		FROM matches WHERE id=$1`, id)
	return scanMatch(row)
}
func (r *TournamentRepository) CreateMatch(ctx context.Context, m domain.Match) (domain.Match, error) {
	extra, _ := json.Marshal(m.ExtraTime)
	row := r.pool.QueryRow(ctx, `
	INSERT INTO matches (tournament_cycle_id,home_team_id,away_team_id,start_at,status,home_score,away_score,extra_time,venue,playoff_cell_id)
	VALUES (COALESCE($1, (SELECT id FROM tournament_cycles WHERE is_active=TRUE ORDER BY id DESC LIMIT 1), 1),$2,$3,$4,$5,$6,$7,$8,NULLIF($9,''),$10)
	RETURNING id,tournament_cycle_id,home_team_id,away_team_id,start_at,status,home_score,away_score,extra_time,COALESCE(venue,''),playoff_cell_id,created_at,updated_at`,
		nullableInt64(m.TournamentID), m.HomeTeamID, m.AwayTeamID, m.StartAt, m.Status, m.HomeScore, m.AwayScore, extra, m.Venue, m.PlayoffCellID)
	return scanMatch(row)
}
func (r *TournamentRepository) UpdateMatch(ctx context.Context, id int64, m domain.Match) (domain.Match, error) {
	extra, _ := json.Marshal(m.ExtraTime)
	row := r.pool.QueryRow(ctx, `
	UPDATE matches SET tournament_cycle_id=COALESCE($2,tournament_cycle_id),home_team_id=$3,away_team_id=$4,start_at=$5,status=$6,home_score=$7,away_score=$8,extra_time=$9,venue=NULLIF($10,''),playoff_cell_id=$11,updated_at=NOW()
	WHERE id=$1
	RETURNING id,tournament_cycle_id,home_team_id,away_team_id,start_at,status,home_score,away_score,extra_time,COALESCE(venue,''),playoff_cell_id,created_at,updated_at`,
		id, nullableInt64(m.TournamentID), m.HomeTeamID, m.AwayTeamID, m.StartAt, m.Status, m.HomeScore, m.AwayScore, extra, m.Venue, m.PlayoffCellID)
	return scanMatch(row)
}

func (r *TournamentRepository) ListTournamentCycles(ctx context.Context) ([]domain.TournamentCycle, error) {
	rows, err := r.pool.Query(ctx, `SELECT id,COALESCE(name,''),COALESCE(bracket_team_capacity,8),COALESCE(is_active,false) FROM tournament_cycles ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.TournamentCycle, 0)
	for rows.Next() {
		var item domain.TournamentCycle
		if err = rows.Scan(&item.ID, &item.Name, &item.BracketCapacity, &item.IsActive); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *TournamentRepository) CreateTournamentCycle(ctx context.Context, req domain.CreateTournamentCycleRequest) (domain.TournamentCycle, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return domain.TournamentCycle{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if req.IsActive {
		if _, err = tx.Exec(ctx, `UPDATE tournament_cycles SET is_active=FALSE, updated_at=NOW() WHERE is_active=TRUE`); err != nil {
			return domain.TournamentCycle{}, err
		}
	}

	var out domain.TournamentCycle
	if err = tx.QueryRow(ctx, `
		INSERT INTO tournament_cycles (name, bracket_team_capacity, is_active)
		VALUES ($1,$2,$3)
		RETURNING id,name,bracket_team_capacity,is_active
	`, req.Name, req.BracketTeamCapacity, req.IsActive).Scan(&out.ID, &out.Name, &out.BracketCapacity, &out.IsActive); err != nil {
		return domain.TournamentCycle{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return domain.TournamentCycle{}, err
	}
	return out, nil
}

func (r *TournamentRepository) DeleteTournamentCycle(ctx context.Context, cycleID int64) error {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var isActive bool
	if err = tx.QueryRow(ctx, `SELECT is_active FROM tournament_cycles WHERE id=$1 FOR UPDATE`, cycleID).Scan(&isActive); err != nil {
		return err
	}
	if isActive {
		return fmt.Errorf("cannot delete active tournament cycle")
	}

	var fallbackID int64
	if err = tx.QueryRow(ctx, `SELECT id FROM tournament_cycles WHERE id<>$1 ORDER BY is_active DESC, id DESC LIMIT 1`, cycleID).Scan(&fallbackID); err != nil {
		return err
	}

	if _, err = tx.Exec(ctx, `UPDATE matches SET tournament_cycle_id=$2, updated_at=NOW() WHERE tournament_cycle_id=$1`, cycleID, fallbackID); err != nil {
		return err
	}
	tag, err := tx.Exec(ctx, `DELETE FROM tournament_cycles WHERE id=$1`, cycleID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return tx.Commit(ctx)
}

func (r *TournamentRepository) ActivateTournamentCycle(ctx context.Context, cycleID int64) error {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err = tx.Exec(ctx, `UPDATE tournament_cycles SET is_active=FALSE, updated_at=NOW() WHERE is_active=TRUE`); err != nil {
		return err
	}
	tag, err := tx.Exec(ctx, `UPDATE tournament_cycles SET is_active=TRUE, updated_at=NOW() WHERE id=$1`, cycleID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return tx.Commit(ctx)
}

func (r *TournamentRepository) UpdateTournamentCycleBracketSettings(ctx context.Context, cycleID int64, teamCapacity int) error {
	tag, err := r.pool.Exec(ctx, `UPDATE tournament_cycles SET bracket_team_capacity=$2, updated_at=NOW() WHERE id=$1`, cycleID, teamCapacity)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *TournamentRepository) GetActiveTournamentCycle(ctx context.Context) (domain.TournamentCycle, error) {
	var out domain.TournamentCycle
	err := r.pool.QueryRow(ctx, `SELECT id,name,bracket_team_capacity,is_active FROM tournament_cycles WHERE is_active=TRUE ORDER BY id DESC LIMIT 1`).Scan(
		&out.ID, &out.Name, &out.BracketCapacity, &out.IsActive,
	)
	return out, err
}

func (r *TournamentRepository) ListPlayoffGrid(ctx context.Context, tournamentID int64) (domain.PlayoffGridResponse, error) {
	cells := []domain.PlayoffGridCell{}
	rows, err := r.pool.Query(ctx, `
		SELECT id,tournament_cycle_id,home_team_id,away_team_id,col,row,created_at,updated_at
		FROM playoff_cells
		WHERE tournament_cycle_id=$1
		ORDER BY row,col,id`, tournamentID)
	if err != nil {
		if isUndefinedTableErr(err) {
			return domain.PlayoffGridResponse{Cells: []domain.PlayoffGridCell{}, Lines: []domain.PlayoffLine{}}, nil
		}
		return domain.PlayoffGridResponse{}, err
	}
	for rows.Next() {
		var item domain.PlayoffGridCell
		if err = rows.Scan(&item.ID, &item.TournamentCycleID, &item.HomeTeamID, &item.AwayTeamID, &item.Col, &item.Row, &item.CreatedAt, &item.UpdatedAt); err != nil {
			rows.Close()
			return domain.PlayoffGridResponse{}, err
		}
		cells = append(cells, item)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return domain.PlayoffGridResponse{}, err
	}

	lines := []domain.PlayoffLine{}
	lineRows, err := r.pool.Query(ctx, `
		SELECT id,tournament_cycle_id,from_playoff_id,to_playoff_id,created_at
		FROM playoff_lines WHERE tournament_cycle_id=$1 ORDER BY id`, tournamentID)
	if err != nil {
		if isUndefinedTableErr(err) {
			return domain.PlayoffGridResponse{Cells: []domain.PlayoffGridCell{}, Lines: []domain.PlayoffLine{}}, nil
		}
		return domain.PlayoffGridResponse{}, err
	}
	for lineRows.Next() {
		var line domain.PlayoffLine
		if err = lineRows.Scan(&line.ID, &line.TournamentCycleID, &line.FromPlayoffID, &line.ToPlayoffID, &line.CreatedAt); err != nil {
			lineRows.Close()
			return domain.PlayoffGridResponse{}, err
		}
		lines = append(lines, line)
	}
	lineRows.Close()
	if err = lineRows.Err(); err != nil {
		return domain.PlayoffGridResponse{}, err
	}

	if len(cells) == 0 {
		return domain.PlayoffGridResponse{Cells: cells, Lines: lines}, nil
	}

	cellIDs := make([]int64, 0, len(cells))
	cellByID := map[int64]*domain.PlayoffGridCell{}
	for i := range cells {
		cellIDs = append(cellIDs, cells[i].ID)
		cellByID[cells[i].ID] = &cells[i]
	}

	matchRows, err := r.pool.Query(ctx, `
		SELECT pcm.playoff_cell_id,m.id,m.status,m.home_score,m.away_score,pcm.sort_order,m.home_team_id,m.away_team_id
		FROM playoff_cell_matches pcm
		JOIN matches m ON m.id=pcm.match_id
		WHERE pcm.playoff_cell_id = ANY($1)
		ORDER BY pcm.playoff_cell_id, pcm.sort_order`, cellIDs)
	if err != nil {
		if isUndefinedTableErr(err) {
			return domain.PlayoffGridResponse{Cells: cells, Lines: lines}, nil
		}
		return domain.PlayoffGridResponse{}, err
	}
	for matchRows.Next() {
		var cellID int64
		var attached domain.PlayoffAttachedMatch
		if err = matchRows.Scan(&cellID, &attached.ID, &attached.Status, &attached.HomeScore, &attached.AwayScore, &attached.SortOrder, &attached.HomeTeamID, &attached.AwayTeamID); err != nil {
			matchRows.Close()
			return domain.PlayoffGridResponse{}, err
		}
		cell := cellByID[cellID]
		cell.AttachedMatches = append(cell.AttachedMatches, attached)
		cell.AttachedMatchIDs = append(cell.AttachedMatchIDs, attached.ID)
	}
	matchRows.Close()
	if err = matchRows.Err(); err != nil {
		return domain.PlayoffGridResponse{}, err
	}

	return domain.PlayoffGridResponse{Cells: cells, Lines: lines}, nil
}

func (r *TournamentRepository) SavePlayoffGrid(ctx context.Context, tournamentID int64, payload domain.SavePlayoffGridRequest) error {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	tempToID := map[string]int64{}
	keptIDs := make([]int64, 0, len(payload.Cells))
	cellMatchMap := map[int64][]int64{}
	for _, cell := range payload.Cells {
		var cellID int64
		if cell.ID != nil {
			if err = tx.QueryRow(ctx, `
				UPDATE playoff_cells SET home_team_id=$1,away_team_id=$2,col=$3,row=$4,updated_at=NOW()
				WHERE id=$5 AND tournament_cycle_id=$6
				RETURNING id`, cell.HomeTeamID, cell.AwayTeamID, cell.Col, cell.Row, *cell.ID, tournamentID).Scan(&cellID); err != nil {
				return err
			}
		} else {
			if err = tx.QueryRow(ctx, `
				INSERT INTO playoff_cells (tournament_cycle_id,home_team_id,away_team_id,col,row)
				VALUES ($1,$2,$3,$4,$5) RETURNING id`,
				tournamentID, cell.HomeTeamID, cell.AwayTeamID, cell.Col, cell.Row).Scan(&cellID); err != nil {
				return err
			}
		}
		if cell.TempID != nil && strings.TrimSpace(*cell.TempID) != "" {
			tempToID[*cell.TempID] = cellID
		}
		keptIDs = append(keptIDs, cellID)
		cellMatchMap[cellID] = append([]int64{}, cell.AttachedMatchIDs...)
	}

	_, err = tx.Exec(ctx, `UPDATE matches SET playoff_cell_id=NULL WHERE playoff_cell_id IN (SELECT id FROM playoff_cells WHERE tournament_cycle_id=$1)`, tournamentID)
	if err != nil {
		return err
	}

	if len(keptIDs) == 0 {
		if _, err = tx.Exec(ctx, `DELETE FROM playoff_lines WHERE tournament_cycle_id=$1`, tournamentID); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `DELETE FROM playoff_cells WHERE tournament_cycle_id=$1`, tournamentID); err != nil {
			return err
		}
		return tx.Commit(ctx)
	}

	if _, err = tx.Exec(ctx, `DELETE FROM playoff_cell_matches WHERE playoff_cell_id = ANY($1)`, keptIDs); err != nil {
		return err
	}
	for cellID, matchIDs := range cellMatchMap {
		for i, matchID := range matchIDs {
			if _, err = tx.Exec(ctx, `INSERT INTO playoff_cell_matches (playoff_cell_id,match_id,sort_order) VALUES ($1,$2,$3)`, cellID, matchID, i+1); err != nil {
				return err
			}
			if _, err = tx.Exec(ctx, `UPDATE matches SET playoff_cell_id=$1 WHERE id=$2`, cellID, matchID); err != nil {
				return err
			}
		}
	}

	allowedIDs := map[int64]struct{}{}
	for _, id := range keptIDs {
		allowedIDs[id] = struct{}{}
	}
	resolveRef := func(ref domain.PlayoffRef) (int64, error) {
		raw := string(ref)
		if strings.HasPrefix(raw, "temp:") {
			value, ok := tempToID[raw]
			if !ok {
				return 0, fmt.Errorf("line references unknown temp id: %s", raw)
			}
			return value, nil
		}
		value, convErr := strconv.ParseInt(raw, 10, 64)
		if convErr != nil {
			return 0, fmt.Errorf("invalid playoff id reference: %s", raw)
		}
		if _, ok := allowedIDs[value]; !ok {
			return 0, fmt.Errorf("line references cell outside payload: %d", value)
		}
		return value, nil
	}

	if _, err = tx.Exec(ctx, `DELETE FROM playoff_lines WHERE tournament_cycle_id=$1`, tournamentID); err != nil {
		return err
	}
	for _, line := range payload.Lines {
		fromID, refErr := resolveRef(line.FromPlayoffID)
		if refErr != nil {
			return refErr
		}
		toID, refErr := resolveRef(line.ToPlayoffID)
		if refErr != nil {
			return refErr
		}
		if _, err = tx.Exec(ctx, `INSERT INTO playoff_lines (tournament_cycle_id,from_playoff_id,to_playoff_id) VALUES ($1,$2,$3)`, tournamentID, fromID, toID); err != nil {
			return err
		}
	}

	if _, err = tx.Exec(ctx, `DELETE FROM playoff_cells WHERE tournament_cycle_id=$1 AND id <> ALL($2)`, tournamentID, keptIDs); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *TournamentRepository) FindPlayoffMatchCandidates(ctx context.Context, tournamentID, matchID int64) ([]domain.PlayoffGridCell, error) {
	match, err := r.GetMatch(ctx, matchID)
	if err != nil {
		return nil, err
	}
	rows, err := r.pool.Query(ctx, `
		SELECT c.id,c.tournament_cycle_id,c.home_team_id,c.away_team_id,c.col,c.row,c.created_at,c.updated_at
		FROM playoff_cells c
		LEFT JOIN playoff_cell_matches pcm ON pcm.playoff_cell_id=c.id
		WHERE c.tournament_cycle_id=$1
		AND ((c.home_team_id=$2 AND c.away_team_id=$3) OR (c.home_team_id=$3 AND c.away_team_id=$2))
		GROUP BY c.id
		HAVING COUNT(pcm.id) < 3
		ORDER BY c.row,c.col`, tournamentID, match.HomeTeamID, match.AwayTeamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.PlayoffGridCell{}
	for rows.Next() {
		var cell domain.PlayoffGridCell
		if err = rows.Scan(&cell.ID, &cell.TournamentCycleID, &cell.HomeTeamID, &cell.AwayTeamID, &cell.Col, &cell.Row, &cell.CreatedAt, &cell.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, cell)
	}
	return out, rows.Err()
}

func (r *TournamentRepository) AttachMatchToPlayoffCell(ctx context.Context, playoffCellID, matchID int64) error {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var count int
	if err = tx.QueryRow(ctx, `SELECT COUNT(*) FROM playoff_cell_matches WHERE playoff_cell_id=$1`, playoffCellID).Scan(&count); err != nil {
		return err
	}
	if count >= 3 {
		return fmt.Errorf("playoff cell already has 3 matches")
	}
	if _, err = tx.Exec(ctx, `DELETE FROM playoff_cell_matches WHERE match_id=$1`, matchID); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `UPDATE matches SET playoff_cell_id=NULL WHERE id=$1`, matchID); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO playoff_cell_matches (playoff_cell_id,match_id,sort_order) VALUES ($1,$2,$3)`, playoffCellID, matchID, count+1); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `UPDATE matches SET playoff_cell_id=$1 WHERE id=$2`, playoffCellID, matchID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *TournamentRepository) DetachMatchFromPlayoffCell(ctx context.Context, playoffCellID, matchID int64) error {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err = tx.Exec(ctx, `DELETE FROM playoff_cell_matches WHERE playoff_cell_id=$1 AND match_id=$2`, playoffCellID, matchID); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `UPDATE matches SET playoff_cell_id=NULL WHERE id=$1 AND playoff_cell_id=$2`, matchID, playoffCellID); err != nil {
		return err
	}
	rows, err := tx.Query(ctx, `SELECT id FROM playoff_cell_matches WHERE playoff_cell_id=$1 ORDER BY sort_order,id`, playoffCellID)
	if err != nil {
		return err
	}
	type matchRef struct {
		id int64
	}
	order := 1
	for rows.Next() {
		var item matchRef
		if err = rows.Scan(&item.id); err != nil {
			rows.Close()
			return err
		}
		if _, err = tx.Exec(ctx, `UPDATE playoff_cell_matches SET sort_order=$1 WHERE id=$2`, order, item.id); err != nil {
			rows.Close()
			return err
		}
		order++
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *TournamentRepository) GetPlayoffCell(ctx context.Context, playoffCellID int64) (domain.PlayoffGridCell, error) {
	row := r.pool.QueryRow(ctx, `SELECT id,tournament_cycle_id,home_team_id,away_team_id,col,row,created_at,updated_at FROM playoff_cells WHERE id=$1`, playoffCellID)
	var cell domain.PlayoffGridCell
	err := row.Scan(&cell.ID, &cell.TournamentCycleID, &cell.HomeTeamID, &cell.AwayTeamID, &cell.Col, &cell.Row, &cell.CreatedAt, &cell.UpdatedAt)
	return cell, err
}

type scanner interface{ Scan(dest ...any) error }

func scanTeam(row scanner) (domain.Team, error) {
	var t domain.Team
	var socials []byte
	var captain *int64
	err := row.Scan(&t.ID, &t.Name, &t.ShortName, &t.Slug, &t.Description, &t.LogoURL, &t.Archived, &socials, &captain, &t.CreatedAt, &t.UpdatedAt)
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
	err := row.Scan(&p.ID, &p.UserID, &p.TeamID, &p.FullName, &p.Nickname, &p.AvatarURL, &socials, &p.Position, &p.ShirtNumber, &p.CreatedAt, &p.UpdatedAt)
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
	err := row.Scan(&m.ID, &m.TournamentID, &m.HomeTeamID, &m.AwayTeamID, &m.StartAt, &m.Status, &m.HomeScore, &m.AwayScore, &extra, &m.Venue, &m.PlayoffCellID, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return m, err
	}
	m.ExtraTime = map[string]any{}
	_ = json.Unmarshal(extra, &m.ExtraTime)
	return m, nil
}

func nullableInt64(v int64) *int64 {
	if v == 0 {
		return nil
	}
	return &v
}

func (r *TournamentRepository) syncUserProfileFromPlayer(ctx context.Context, player domain.Player) error {
	if player.UserID == nil {
		return nil
	}
	fullName := strings.TrimSpace(player.FullName)
	firstName := fullName
	lastName := ""
	if parts := strings.Fields(fullName); len(parts) > 1 {
		firstName = parts[0]
		lastName = strings.Join(parts[1:], " ")
	}
	if firstName == "" {
		firstName = "Player"
	}
	_, err := r.pool.Exec(ctx, `UPDATE users SET display_name=$2, updated_at=NOW() WHERE id=$1`, *player.UserID, fullName)
	if err != nil {
		return err
	}
	socialsRaw, _ := json.Marshal(player.Socials)
	_, err = r.pool.Exec(ctx, `
		INSERT INTO user_profiles (user_id, first_name, last_name, avatar_url, socials, updated_at)
		VALUES ($1,$2,$3,NULLIF($4,''),$5,NOW())
		ON CONFLICT (user_id)
		DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, avatar_url=EXCLUDED.avatar_url, socials=EXCLUDED.socials, updated_at=NOW()
	`, *player.UserID, firstName, lastName, player.AvatarURL, socialsRaw)
	return err
}
