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
