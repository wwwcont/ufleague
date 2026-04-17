INSERT INTO users (id, username, display_name, is_active)
VALUES (9005, 'player_test', 'Player Test', TRUE)
ON CONFLICT (id) DO UPDATE
SET username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    is_active = TRUE,
    updated_at = NOW();

UPDATE users
SET telegram_username = CASE
    WHEN COALESCE(NULLIF(telegram_username, ''), '') IN ('', 'guest_test') THEN 'player_test'
    ELSE telegram_username
  END,
  updated_at = NOW()
WHERE id = 9005;

DELETE FROM user_roles
WHERE user_id = 9005
  AND role_id IN (SELECT id FROM roles WHERE code = 'guest');

INSERT INTO user_roles (user_id, role_id)
SELECT 9005, id FROM roles WHERE code = 'player'
ON CONFLICT DO NOTHING;
