ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS stage_slot_column INT,
    ADD COLUMN IF NOT EXISTS stage_slot_row INT;

CREATE INDEX IF NOT EXISTS idx_matches_stage_slot ON matches(stage_slot_column, stage_slot_row);
