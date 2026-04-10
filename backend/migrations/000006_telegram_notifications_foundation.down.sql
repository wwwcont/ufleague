DROP TABLE IF EXISTS notification_jobs;
DROP TABLE IF EXISTS notification_subscriptions;
DROP TABLE IF EXISTS telegram_auth_challenges;
ALTER TABLE users
    DROP COLUMN IF EXISTS telegram_username,
    DROP COLUMN IF EXISTS telegram_linked_at;
