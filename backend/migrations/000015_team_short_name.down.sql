ALTER TABLE teams
    DROP CONSTRAINT IF EXISTS teams_short_name_len_chk;

ALTER TABLE teams
    DROP COLUMN IF EXISTS short_name;
