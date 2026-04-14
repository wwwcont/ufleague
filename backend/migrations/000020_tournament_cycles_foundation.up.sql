CREATE TABLE IF NOT EXISTS tournament_cycles (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    bracket_team_capacity INT NOT NULL DEFAULT 16 CHECK (bracket_team_capacity IN (4,8,16,32)),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tournament_cycles_active
    ON tournament_cycles (is_active)
    WHERE is_active = TRUE;

INSERT INTO tournament_cycles (id, name, bracket_team_capacity, is_active)
VALUES (1, 'Season 1', 16, TRUE)
ON CONFLICT (id) DO UPDATE
SET is_active = TRUE,
    updated_at = NOW();

SELECT setval('tournament_cycles_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM tournament_cycles), 1));

ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS tournament_cycle_id BIGINT;

UPDATE matches
SET tournament_cycle_id = COALESCE(tournament_cycle_id, 1);

ALTER TABLE matches
    ALTER COLUMN tournament_cycle_id SET NOT NULL,
    ALTER COLUMN tournament_cycle_id SET DEFAULT 1;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_matches_tournament_cycle'
          AND conrelid = 'matches'::regclass
    ) THEN
        ALTER TABLE matches
            ADD CONSTRAINT fk_matches_tournament_cycle
            FOREIGN KEY (tournament_cycle_id) REFERENCES tournament_cycles(id) ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matches_tournament_cycle ON matches (tournament_cycle_id, start_at DESC);

UPDATE playoff_cells SET tournament_cycle_id = 1 WHERE tournament_cycle_id IS NULL;
UPDATE playoff_lines SET tournament_cycle_id = 1 WHERE tournament_cycle_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_playoff_cells_tournament_cycle'
          AND conrelid = 'playoff_cells'::regclass
    ) THEN
        ALTER TABLE playoff_cells
            ADD CONSTRAINT fk_playoff_cells_tournament_cycle
            FOREIGN KEY (tournament_cycle_id) REFERENCES tournament_cycles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_playoff_lines_tournament_cycle'
          AND conrelid = 'playoff_lines'::regclass
    ) THEN
        ALTER TABLE playoff_lines
            ADD CONSTRAINT fk_playoff_lines_tournament_cycle
            FOREIGN KEY (tournament_cycle_id) REFERENCES tournament_cycles(id) ON DELETE CASCADE;
    END IF;
END $$;
