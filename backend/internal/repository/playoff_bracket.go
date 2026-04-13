package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"football_ui/backend/internal/domain"
)

func (r *TournamentRepository) CreatePlayoffBracket(ctx context.Context, req domain.CreatePlayoffBracketRequest) (domain.PlayoffBracket, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return domain.PlayoffBracket{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var bracket domain.PlayoffBracket
	err = tx.QueryRow(ctx, `
		INSERT INTO playoff_brackets (tournament_cycle_id, team_capacity, status)
		VALUES ($1,$2,'draft')
		ON CONFLICT (tournament_cycle_id)
		DO UPDATE SET team_capacity=EXCLUDED.team_capacity, updated_at=NOW()
		RETURNING id,tournament_cycle_id,team_capacity
	`, req.TournamentID, req.TeamCapacity).Scan(&bracket.ID, &bracket.TournamentID, &bracket.TeamCapacity)
	if err != nil {
		return domain.PlayoffBracket{}, err
	}

	if _, err = tx.Exec(ctx, `DELETE FROM playoff_bracket_stages WHERE bracket_id=$1`, bracket.ID); err != nil {
		return domain.PlayoffBracket{}, err
	}

	stageCount := stageCountFromCapacity(req.TeamCapacity)
	for order := 1; order <= stageCount; order++ {
		size := req.TeamCapacity / (1 << order)
		label := stageLabelBySize(size)
		code := stageCodeByOrder(order, stageCount)
		if _, err = tx.Exec(ctx, `
			INSERT INTO playoff_bracket_stages (bracket_id, code, label, stage_order, stage_size)
			VALUES ($1,$2,$3,$4,$5)
		`, bracket.ID, code, label, order, size); err != nil {
			return domain.PlayoffBracket{}, err
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return domain.PlayoffBracket{}, err
	}
	return r.GetPlayoffBracketByTournament(ctx, req.TournamentID)
}

func (r *TournamentRepository) GetPlayoffBracketByTournament(ctx context.Context, tournamentID int64) (domain.PlayoffBracket, error) {
	var out domain.PlayoffBracket
	err := r.pool.QueryRow(ctx, `SELECT id,tournament_cycle_id,team_capacity FROM playoff_brackets WHERE tournament_cycle_id=$1`, tournamentID).Scan(&out.ID, &out.TournamentID, &out.TeamCapacity)
	if err != nil {
		return domain.PlayoffBracket{}, err
	}
	stages, err := r.listPlayoffStages(ctx, out.ID)
	if err != nil {
		return domain.PlayoffBracket{}, err
	}
	ties, err := r.listPlayoffTies(ctx, out.ID)
	if err != nil {
		return domain.PlayoffBracket{}, err
	}
	layout, err := r.listPlayoffLayout(ctx, out.ID)
	if err != nil {
		return domain.PlayoffBracket{}, err
	}
	out.Stages = stages
	out.Ties = ties
	out.Layout = layout
	return out, nil
}

func (r *TournamentRepository) CreatePlayoffTie(ctx context.Context, req domain.CreatePlayoffTieRequest) (domain.PlayoffTie, error) {
	legsPlanned := req.LegsPlanned
	if legsPlanned < 1 || legsPlanned > 3 {
		legsPlanned = 1
	}
	var tie domain.PlayoffTie
	err := r.pool.QueryRow(ctx, `
		INSERT INTO playoff_bracket_ties (bracket_id,stage_id,slot,home_team_id,away_team_id,legs_planned,stage_slot_column,stage_slot_row)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING id,bracket_id,stage_id,slot,home_team_id,away_team_id,winner_team_id,legs_planned,stage_slot_column,stage_slot_row,admin_locked_winner
	`, req.BracketID, req.StageID, req.Slot, req.HomeTeamID, req.AwayTeamID, legsPlanned, nil, req.Slot).Scan(
		&tie.ID, &tie.BracketID, &tie.StageID, &tie.Slot, &tie.HomeTeamID, &tie.AwayTeamID, &tie.WinnerTeamID, &tie.LegsPlanned, &tie.StageSlotColumn, &tie.StageSlotRow, &tie.AdminLockedWinner,
	)
	if err != nil {
		return domain.PlayoffTie{}, err
	}
	return tie, nil
}

func (r *TournamentRepository) AttachMatchToTie(ctx context.Context, req domain.AttachMatchToTieRequest) error {
	leg := req.LegNumber
	if leg <= 0 {
		if err := r.pool.QueryRow(ctx, `SELECT COALESCE(MAX(leg_number),0)+1 FROM playoff_bracket_tie_matches WHERE tie_id=$1`, req.TieID).Scan(&leg); err != nil {
			return err
		}
	}
	_, err := r.pool.Exec(ctx, `
		INSERT INTO playoff_bracket_tie_matches (tie_id, match_id, leg_number)
		VALUES ($1,$2,$3)
		ON CONFLICT (match_id) DO NOTHING
	`, req.TieID, req.MatchID, leg)
	return err
}

func (r *TournamentRepository) DetachMatchFromTie(ctx context.Context, req domain.DetachMatchFromTieRequest) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM playoff_bracket_tie_matches WHERE tie_id=$1 AND match_id=$2`, req.TieID, req.MatchID)
	return err
}

func (r *TournamentRepository) UpdatePlayoffLayout(ctx context.Context, bracketID int64, actorID int64, req domain.UpdatePlayoffLayoutRequest) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	for _, node := range req.Nodes {
		meta := node.Meta
		if meta == nil {
			meta = map[string]any{}
		}
		rawMeta, _ := json.Marshal(meta)
		if _, err = tx.Exec(ctx, `
			INSERT INTO playoff_bracket_layout_nodes (bracket_id,node_type,node_id,x,y,meta,updated_by,updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
			ON CONFLICT (bracket_id,node_type,node_id)
			DO UPDATE SET x=EXCLUDED.x,y=EXCLUDED.y,meta=EXCLUDED.meta,updated_by=EXCLUDED.updated_by,updated_at=NOW()
		`, bracketID, node.NodeType, node.NodeID, node.X, node.Y, rawMeta, actorID); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *TournamentRepository) MovePlayoffTie(ctx context.Context, req domain.MovePlayoffTieRequest) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE playoff_bracket_ties
		SET stage_id=$2,slot=$3,stage_slot_column=$4,stage_slot_row=$5,
			home_team_id=$6,away_team_id=$7,winner_team_id=$8,
			legs_planned=CASE WHEN $9 BETWEEN 1 AND 3 THEN $9 ELSE legs_planned END,
			admin_locked_winner=COALESCE($10, admin_locked_winner),
			updated_at=NOW()
		WHERE id=$1
	`, req.TieID, req.StageID, req.Slot, req.StageSlotColumn, req.StageSlotRow, req.HomeTeamID, req.AwayTeamID, req.WinnerTeamID, req.LegsPlanned, req.AdminLockWinner)
	return err
}

func (r *TournamentRepository) listPlayoffStages(ctx context.Context, bracketID int64) ([]domain.PlayoffStage, error) {
	rows, err := r.pool.Query(ctx, `SELECT id,code,label,stage_order,stage_size FROM playoff_bracket_stages WHERE bracket_id=$1 ORDER BY stage_order ASC`, bracketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.PlayoffStage, 0)
	for rows.Next() {
		var stage domain.PlayoffStage
		if err = rows.Scan(&stage.ID, &stage.Code, &stage.Label, &stage.Order, &stage.Size); err != nil {
			return nil, err
		}
		out = append(out, stage)
	}
	return out, rows.Err()
}

func (r *TournamentRepository) listPlayoffTies(ctx context.Context, bracketID int64) ([]domain.PlayoffTie, error) {
	tieRows, err := r.pool.Query(ctx, `
		SELECT id,bracket_id,stage_id,slot,home_team_id,away_team_id,winner_team_id,legs_planned,stage_slot_column,stage_slot_row,admin_locked_winner
		FROM playoff_bracket_ties
		WHERE bracket_id=$1
		ORDER BY stage_id ASC, slot ASC
	`, bracketID)
	if err != nil {
		return nil, err
	}
	defer tieRows.Close()

	ties := make([]domain.PlayoffTie, 0)
	tieByID := make(map[int64]int)
	for tieRows.Next() {
		var tie domain.PlayoffTie
		if err = tieRows.Scan(&tie.ID, &tie.BracketID, &tie.StageID, &tie.Slot, &tie.HomeTeamID, &tie.AwayTeamID, &tie.WinnerTeamID, &tie.LegsPlanned, &tie.StageSlotColumn, &tie.StageSlotRow, &tie.AdminLockedWinner); err != nil {
			return nil, err
		}
		tie.Matches = make([]domain.PlayoffTieMatch, 0)
		tieByID[tie.ID] = len(ties)
		ties = append(ties, tie)
	}
	if err = tieRows.Err(); err != nil {
		return nil, err
	}
	if len(ties) == 0 {
		return ties, nil
	}

	matchRows, err := r.pool.Query(ctx, `
		SELECT tm.id,tm.tie_id,tm.match_id,tm.leg_number,m.status,m.home_score,m.away_score
		FROM playoff_bracket_tie_matches tm
		JOIN playoff_bracket_ties t ON t.id=tm.tie_id
		JOIN matches m ON m.id=tm.match_id
		WHERE t.bracket_id=$1
		ORDER BY tm.tie_id ASC, tm.leg_number ASC
	`, bracketID)
	if err != nil {
		return nil, err
	}
	defer matchRows.Close()
	for matchRows.Next() {
		var leg domain.PlayoffTieMatch
		if err = matchRows.Scan(&leg.ID, &leg.TieID, &leg.MatchID, &leg.LegNumber, &leg.Status, &leg.HomeScore, &leg.AwayScore); err != nil {
			return nil, err
		}
		if index, ok := tieByID[leg.TieID]; ok {
			ties[index].Matches = append(ties[index].Matches, leg)
		}
	}
	if err = matchRows.Err(); err != nil {
		return nil, err
	}
	return ties, nil
}

func (r *TournamentRepository) listPlayoffLayout(ctx context.Context, bracketID int64) ([]domain.PlayoffLayoutNode, error) {
	rows, err := r.pool.Query(ctx, `SELECT node_type,node_id,x,y,meta FROM playoff_bracket_layout_nodes WHERE bracket_id=$1`, bracketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.PlayoffLayoutNode, 0)
	for rows.Next() {
		var node domain.PlayoffLayoutNode
		var rawMeta []byte
		if err = rows.Scan(&node.NodeType, &node.NodeID, &node.X, &node.Y, &rawMeta); err != nil {
			return nil, err
		}
		node.Meta = map[string]any{}
		if len(rawMeta) > 0 {
			_ = json.Unmarshal(rawMeta, &node.Meta)
		}
		out = append(out, node)
	}
	return out, rows.Err()
}

func stageCountFromCapacity(capacity int) int {
	switch capacity {
	case 4:
		return 2
	case 8:
		return 3
	case 16:
		return 4
	case 32:
		return 5
	default:
		return 4
	}
}

func stageLabelBySize(size int) string {
	switch size {
	case 8:
		return "1/8 финала"
	case 4:
		return "1/4 финала"
	case 2:
		return "Полуфинал"
	case 1:
		return "Финал"
	default:
		return fmt.Sprintf("1/%d", size*2)
	}
}

func stageCodeByOrder(order, stageCount int) string {
	if order == stageCount {
		return "F"
	}
	remaining := stageCount - order
	switch remaining {
	case 1:
		return "SF"
	case 2:
		return "R4"
	case 3:
		return "R8"
	case 4:
		return "R16"
	default:
		return fmt.Sprintf("R%d", 1<<(remaining+1))
	}
}
