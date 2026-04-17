UPDATE users
SET
  telegram_id = NULL,
  telegram_username = NULL,
  telegram_linked_at = NULL,
  updated_at = NOW()
WHERE username IN (
  'superadmin',
  'admin_test',
  'captain_alpha',
  'guest_test'
);
