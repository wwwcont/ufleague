ALTER TABLE user_profiles
    DROP CONSTRAINT IF EXISTS user_profiles_first_name_len_chk,
    DROP CONSTRAINT IF EXISTS user_profiles_last_name_len_chk;

DROP INDEX IF EXISTS ux_users_telegram_username;

ALTER TABLE user_profiles
    DROP COLUMN IF EXISTS first_name,
    DROP COLUMN IF EXISTS last_name;
