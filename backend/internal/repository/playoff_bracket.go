package repository

import (
	"context"
	"encoding/json"
	"errors"

	"football_ui/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

func (r *TournamentRepository) CreatePlayoffBracket(ctx context.Context, req domain.CreatePlayoffBracketRequest) (domain.PlayoffBracket, error) {
	var bracket domain.PlayoffBracket
	err := r.pool.QueryRow(ctx, `
		INSERT INTO playoff_brackets (tournament_cycle_id, team_capacity, status)
		VALUES ($1,$2,'draft')
		ON CONFLICT (tournament_cycle_id)
		DO UPDATE SET team_capacity=EXCLUDED.team_capacity, updated_at=NOW()
		RETURNING id,tournament_cycle_id,team_capacity
	`, req.TournamentID, req.TeamCapacity).Scan(&bracket.ID, &bracket.TournamentID, &bracket.TeamCapacity)
	if err != nil {
		return domain.PlayoffBracket{}, err
	}
	_, _ = r.pool.Exec(ctx, `
		INSERT INTO playoff_bracket_stages (bracket_id, code, label, stage_order, stage_size)
		VALUES ($1,'GRID','Плейофф',1,1)
		ON CONFLICT (bracket_id, stage_order) DO NOTHING
	`, bracket.ID)
	return r.GetPlayoffBracketByTournament(ctx, req.TournamentID)
}

func (r *TournamentRepository) GetPlayoffBracketByTournament(ctx context.Context, tournamentID int64) (domain.PlayoffBracket, error) {
	var out domain.PlayoffBracket
	err := r.pool.QueryRow(ctx, `SELECT id,tournament_cycle_id,team_capacity FROM playoff_brackets WHERE tournament_cycle_id=$1`, tournamentID).Scan(&out.ID, &out.TournamentID, &out.TeamCapacity)
	if err != nil {
		return domain.PlayoffBracket{}, err
	}
	out.Stages = []domain.PlayoffStage{{ID: 1, Code: "GRID", Label: "Плейофф", Order: 1, Size: 1}}
	ties, err := r.listGridTies(ctx, out.ID)
	if err != nil {
		return domain.PlayoffBracket{}, err
	}
	layout, err := r.listGridLayout(ctx, out.ID)
	if err != nil {
		return domain.PlayoffBracket{}, err
	}
	out.Ties = ties
	out.Layout = layout
	return out, nil
}

func (r *TournamentRepository) CreatePlayoffTie(ctx context.Context, req domain.CreatePlayoffTieRequest) (domain.PlayoffTie, error) {
	var tie domain.PlayoffTie
	col := 1
	row := req.Slot
	if row <= 0 {
		row = 1
	}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO playoff_grid_ties (bracket_id, home_team_id, away_team_id, grid_col, grid_row)
		VALUES ($1,$2,$3,$4,$5)
		RETURNING id, bracket_id, home_team_id, away_team_id, grid_col, grid_row
	`, req.BracketID, req.HomeTeamID, req.AwayTeamID, col, row).Scan(&tie.ID, &tie.BracketID, &tie.HomeTeamID, &tie.AwayTeamID, &tie.StageSlotColumn, &tie.StageSlotRow)
	if err != nil {
		return domain.PlayoffTie{}, err
	}
	tie.StageID = 1
	tie.Slot = row
	tie.LegsPlanned = 1
	return tie, nil
}

func (r *TournamentRepository) AttachMatchToTie(ctx context.Context, req domain.AttachMatchToTieRequest) error {
	var exists int64
	err := r.pool.QueryRow(ctx, `SELECT id FROM playoff_grid_ties WHERE id=$1`, req.TieID).Scan(&exists)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `
		UPDATE playoff_grid_ties
		SET match_id_1 = CASE WHEN match_id_1 IS NULL THEN $2 ELSE match_id_1 END,
			match_id_2 = CASE WHEN match_id_1 IS NOT NULL AND match_id_2 IS NULL THEN $2 ELSE match_id_2 END,
			match_id_3 = CASE WHEN match_id_1 IS NOT NULL AND match_id_2 IS NOT NULL AND match_id_3 IS NULL THEN $2 ELSE match_id_3 END,
			updated_at = NOW()
		WHERE id=$1
	`, req.TieID, req.MatchID)
	return err
}

func (r *TournamentRepository) DetachMatchFromTie(ctx context.Context, req domain.DetachMatchFromTieRequest) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE playoff_grid_ties
		SET match_id_1 = CASE WHEN match_id_1=$2 THEN NULL ELSE match_id_1 END,
			match_id_2 = CASE WHEN match_id_2=$2 THEN NULL ELSE match_id_2 END,
			match_id_3 = CASE WHEN match_id_3=$2 THEN NULL ELSE match_id_3 END,
			updated_at = NOW()
		WHERE id=$1
	`, req.TieID, req.MatchID)
	return err
}

func (r *TournamentRepository) UpdatePlayoffLayout(ctx context.Context, bracketID int64, _ int64, req domain.UpdatePlayoffLayoutRequest) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	for _, node := range req.Nodes {
		if node.NodeType != "tie" {
			continue
		}
		col, row := 1, 1
		if node.X != nil {
			col = *node.X/150 + 1
		}
		if node.Y != nil {
			row = *node.Y/78 + 1
		}
		if _, err = tx.Exec(ctx, `UPDATE playoff_grid_ties SET grid_col=$2, grid_row=$3, updated_at=NOW() WHERE bracket_id=$1 AND id=$4`, bracketID, col, row, node.NodeID); err != nil {
			return err
		}
	}
	if _, err = tx.Exec(ctx, `DELETE FROM playoff_grid_lines WHERE bracket_id=$1`, bracketID); err != nil {
		return err
	}
	for _, node := range req.Nodes {
		if node.NodeType != "tie" {
			continue
		}
		ids, ok := node.Meta["to_tie_ids"]
		if !ok {
			continue
		}
		raw, _ := json.Marshal(ids)
		var toIDs []int64
		_ = json.Unmarshal(raw, &toIDs)
		for _, toID := range toIDs {
			if _, err = tx.Exec(ctx, `INSERT INTO playoff_grid_lines (bracket_id, from_tie_id, to_tie_id) VALUES ($1,$2,$3)`, bracketID, node.NodeID, toID); err != nil {
				return err
			}
		}
	}
	return tx.Commit(ctx)
}

func (r *TournamentRepository) MovePlayoffTie(ctx context.Context, req domain.MovePlayoffTieRequest) error {
	if req.TieID <= 0 {
		return errors.New("invalid tie id")
	}
	col := req.StageSlotColumn
	row := req.StageSlotRow
	if col == nil {
		v := 1
		col = &v
	}
	if row == nil {
		v := req.Slot
		if v <= 0 {
			v = 1
		}
		row = &v
	}
	_, err := r.pool.Exec(ctx, `
		UPDATE playoff_grid_ties
		SET home_team_id=$2, away_team_id=$3, grid_col=$4, grid_row=$5, updated_at=NOW()
		WHERE id=$1
	`, req.TieID, req.HomeTeamID, req.AwayTeamID, *col, *row)
	return err
}

func (r *TournamentRepository) listGridTies(ctx context.Context, bracketID int64) ([]domain.PlayoffTie, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT t.id,t.bracket_id,t.home_team_id,t.away_team_id,t.grid_col,t.grid_row,
			m1.id,m1.status,m1.home_score,m1.away_score,
			m2.id,m2.status,m2.home_score,m2.away_score,
			m3.id,m3.status,m3.home_score,m3.away_score
		FROM playoff_grid_ties t
		LEFT JOIN matches m1 ON m1.id=t.match_id_1
		LEFT JOIN matches m2 ON m2.id=t.match_id_2
		LEFT JOIN matches m3 ON m3.id=t.match_id_3
		WHERE t.bracket_id=$1
		ORDER BY t.grid_col, t.grid_row, t.id
	`, bracketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.PlayoffTie, 0)
	for rows.Next() {
		var tie domain.PlayoffTie
		var m1id, m2id, m3id *int64
		var s1, s2, s3 *string
		var h1, a1, h2, a2, h3, a3 *int
		if err = rows.Scan(&tie.ID, &tie.BracketID, &tie.HomeTeamID, &tie.AwayTeamID, &tie.StageSlotColumn, &tie.StageSlotRow, &m1id, &s1, &h1, &a1, &m2id, &s2, &h2, &a2, &m3id, &s3, &h3, &a3); err != nil {
			return nil, err
		}
		tie.StageID = 1
		if tie.StageSlotRow != nil {
			tie.Slot = *tie.StageSlotRow
		}
		tie.LegsPlanned = 1
		tie.Matches = make([]domain.PlayoffTieMatch, 0, 3)
		appendMatch := func(id *int64, status *string, hs *int, as *int, leg int) {
			if id == nil {
				return
			}
			match := domain.PlayoffTieMatch{TieID: tie.ID, MatchID: *id, LegNumber: leg}
			if status != nil {
				match.Status = *status
			}
			if hs != nil {
				match.HomeScore = *hs
			}
			if as != nil {
				match.AwayScore = *as
			}
			tie.Matches = append(tie.Matches, match)
		}
		appendMatch(m1id, s1, h1, a1, 1)
		appendMatch(m2id, s2, h2, a2, 2)
		appendMatch(m3id, s3, h3, a3, 3)
		out = append(out, tie)
	}
	return out, rows.Err()
}

func (r *TournamentRepository) listGridLayout(ctx context.Context, bracketID int64) ([]domain.PlayoffLayoutNode, error) {
	nodeRows, err := r.pool.Query(ctx, `SELECT id,grid_col,grid_row FROM playoff_grid_ties WHERE bracket_id=$1`, bracketID)
	if err != nil {
		return nil, err
	}
	defer nodeRows.Close()
	toMap := map[int64][]int64{}
	lineRows, err := r.pool.Query(ctx, `SELECT from_tie_id,to_tie_id FROM playoff_grid_lines WHERE bracket_id=$1`, bracketID)
	if err == nil {
		defer lineRows.Close()
		for lineRows.Next() {
			var fromID, toID int64
			if scanErr := lineRows.Scan(&fromID, &toID); scanErr == nil {
				toMap[fromID] = append(toMap[fromID], toID)
			}
		}
	}
	out := make([]domain.PlayoffLayoutNode, 0)
	for nodeRows.Next() {
		var id int64
		var col, row int
		if err = nodeRows.Scan(&id, &col, &row); err != nil {
			return nil, err
		}
		x := (col - 1) * 150
		y := (row - 1) * 78
		out = append(out, domain.PlayoffLayoutNode{NodeType: "tie", NodeID: id, X: &x, Y: &y, Meta: map[string]any{"to_tie_ids": toMap[id]}})
	}
	return out, nodeRows.Err()
}

var _ = pgx.ErrNoRows
