DROP INDEX IF EXISTS idx_matches_playoff_cell_id;
DROP INDEX IF EXISTS idx_playoff_lines_cycle;
DROP INDEX IF EXISTS idx_playoff_cells_cycle;

ALTER TABLE matches
    DROP COLUMN IF EXISTS playoff_cell_id;

DROP TABLE IF EXISTS playoff_lines;
DROP TABLE IF EXISTS playoff_cell_matches;
DROP TABLE IF EXISTS playoff_cells;
