ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT '';

ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_first_name_len_chk CHECK (char_length(first_name) <= 30),
    ADD CONSTRAINT user_profiles_last_name_len_chk CHECK (char_length(last_name) <= 30);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_telegram_username
    ON users ((lower(telegram_username)))
    WHERE telegram_username IS NOT NULL AND telegram_username <> '';
