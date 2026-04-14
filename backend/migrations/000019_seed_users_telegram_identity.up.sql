-- Ensure all dev/test seed users are present in DB with Telegram identity generated in DB migrations,
-- so frontend clients do not need to create synthetic users.
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
  'captain_beta',
  'player_test',
  'captain_gamma',
  'captain_delta',
  'captain_epsilon',
  'captain_zeta',
  'captain_eta',
  'captain_theta',
  'captain_iota',
  'captain_kappa',
  'captain_lambda',
  'captain_mu',
  'captain_nu',
  'captain_xi',
  'captain_omicron',
  'seed_admin',
  'seed_captain_home',
  'seed_captain_away',
  'seed_player'
);
