DROP INDEX IF EXISTS idx_matches_stage_slot;

ALTER TABLE matches
    DROP COLUMN IF EXISTS stage_slot_column,
    DROP COLUMN IF EXISTS stage_slot_row;
