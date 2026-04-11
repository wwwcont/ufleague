DROP INDEX IF EXISTS idx_players_user_id;

ALTER TABLE players
    DROP COLUMN IF EXISTS user_id;
