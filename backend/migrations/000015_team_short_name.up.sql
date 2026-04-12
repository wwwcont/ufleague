ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS short_name TEXT;

UPDATE teams
SET short_name = UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(short_name, ''), '[^A-Za-zА-Яа-я0-9]', '', 'g') FROM 1 FOR 3))
WHERE short_name IS NOT NULL AND short_name <> '';

UPDATE teams
SET short_name = UPPER(SUBSTRING(REGEXP_REPLACE(name, '[^A-Za-zА-Яа-я0-9]', '', 'g') FROM 1 FOR 3))
WHERE short_name IS NULL OR short_name = '';

UPDATE teams
SET short_name = RPAD(short_name, 3, 'X')
WHERE CHAR_LENGTH(short_name) < 3;

ALTER TABLE teams
    ALTER COLUMN short_name SET NOT NULL;

ALTER TABLE teams
    ADD CONSTRAINT teams_short_name_len_chk CHECK (char_length(short_name) = 3);
