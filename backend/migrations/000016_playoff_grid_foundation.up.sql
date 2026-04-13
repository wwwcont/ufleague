CREATE TABLE IF NOT EXISTS playoff_cells (
    id BIGSERIAL PRIMARY KEY,
    tournament_cycle_id BIGINT NOT NULL,
    home_team_id BIGINT NULL REFERENCES teams(id) ON DELETE SET NULL,
    away_team_id BIGINT NULL REFERENCES teams(id) ON DELETE SET NULL,
    col INTEGER NOT NULL,
    row INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_playoff_cells_cycle_col_row UNIQUE (tournament_cycle_id, col, row),
    CONSTRAINT chk_playoff_cells_bounds CHECK (col BETWEEN 1 AND 35 AND row BETWEEN 1 AND 35)
);

CREATE TABLE IF NOT EXISTS playoff_cell_matches (
    id BIGSERIAL PRIMARY KEY,
    playoff_cell_id BIGINT NOT NULL REFERENCES playoff_cells(id) ON DELETE CASCADE,
    match_id BIGINT NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    CONSTRAINT uq_playoff_cell_matches_sort UNIQUE (playoff_cell_id, sort_order),
    CONSTRAINT chk_playoff_cell_matches_order CHECK (sort_order BETWEEN 1 AND 3)
);

CREATE TABLE IF NOT EXISTS playoff_lines (
    id BIGSERIAL PRIMARY KEY,
    tournament_cycle_id BIGINT NOT NULL,
    from_playoff_id BIGINT NOT NULL REFERENCES playoff_cells(id) ON DELETE CASCADE,
    to_playoff_id BIGINT NOT NULL REFERENCES playoff_cells(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_playoff_lines_not_same CHECK (from_playoff_id <> to_playoff_id)
);

ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS playoff_cell_id BIGINT NULL REFERENCES playoff_cells(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_playoff_cells_cycle ON playoff_cells(tournament_cycle_id);
CREATE INDEX IF NOT EXISTS idx_playoff_lines_cycle ON playoff_lines(tournament_cycle_id);
CREATE INDEX IF NOT EXISTS idx_matches_playoff_cell_id ON matches(playoff_cell_id);
