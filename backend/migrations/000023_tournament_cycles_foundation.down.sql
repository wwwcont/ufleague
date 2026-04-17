ALTER TABLE matches DROP CONSTRAINT IF EXISTS fk_matches_tournament_cycle;
DROP INDEX IF EXISTS idx_matches_tournament_cycle;
ALTER TABLE matches DROP COLUMN IF EXISTS tournament_cycle_id;

ALTER TABLE playoff_cells DROP CONSTRAINT IF EXISTS fk_playoff_cells_tournament_cycle;
ALTER TABLE playoff_lines DROP CONSTRAINT IF EXISTS fk_playoff_lines_tournament_cycle;

DROP INDEX IF EXISTS ux_tournament_cycles_active;
DROP TABLE IF EXISTS tournament_cycles;
