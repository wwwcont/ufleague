UPDATE users
SET
  telegram_id = CASE
    WHEN telegram_id IS NULL THEN 7000000000 + (id * 97) + 13
    ELSE telegram_id
  END,
  telegram_username = CASE
    WHEN COALESCE(NULLIF(telegram_username, ''), '') = ''
      THEN 'seed_' || substr(md5(username || ':' || id::text), 1, 12)
    ELSE telegram_username
  END,
  telegram_linked_at = COALESCE(telegram_linked_at, NOW()),
  updated_at = NOW()
WHERE username IN (
  'superadmin',
  'admin_test',
  'captain_alpha',
  'guest_test'
);
