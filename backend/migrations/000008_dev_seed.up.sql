INSERT INTO users (id, username, display_name, is_active)
VALUES
  (9001, 'superadmin', 'Super Admin', TRUE),
  (9002, 'admin_test', 'Admin Test', TRUE),
  (9003, 'captain_alpha', 'Captain Alpha', TRUE),
  (9004, 'captain_beta', 'Captain Beta', TRUE),
  (9005, 'player_test', 'Player Test', TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM users), 9005));

INSERT INTO user_roles (user_id, role_id)
SELECT 9001, id FROM roles WHERE code='superadmin' ON CONFLICT DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT 9002, id FROM roles WHERE code='admin' ON CONFLICT DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT 9003, id FROM roles WHERE code='captain' ON CONFLICT DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT 9004, id FROM roles WHERE code='captain' ON CONFLICT DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT 9005, id FROM roles WHERE code='player' ON CONFLICT DO NOTHING;

INSERT INTO teams (id, name, slug, description, logo_url, socials, captain_user_id)
VALUES
  (1001, 'Alpha FC', 'alpha-fc', 'Seeded alpha team', '', '{"telegram":"@alpha"}'::jsonb, 9003),
  (1002, 'Beta FC', 'beta-fc', 'Seeded beta team', '', '{"telegram":"@beta"}'::jsonb, 9004)
ON CONFLICT (id) DO NOTHING;

SELECT setval('teams_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM teams), 1002));

INSERT INTO players (id, team_id, full_name, nickname, avatar_url, socials, position, shirt_number)
VALUES
  (2001, 1001, 'Alex Striker', 'Alex', '', '{}'::jsonb, 'FW', 9),
  (2002, 1002, 'Boris Keeper', 'Boris', '', '{}'::jsonb, 'GK', 1)
ON CONFLICT (id) DO NOTHING;
SELECT setval('players_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM players), 2002));

INSERT INTO matches (id, home_team_id, away_team_id, start_at, status, home_score, away_score, extra_time, venue)
VALUES
  (3001, 1001, 1002, NOW() + INTERVAL '1 day', 'scheduled', 0, 0, '{}'::jsonb, 'Main Arena')
ON CONFLICT (id) DO NOTHING;
SELECT setval('matches_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM matches), 3001));

INSERT INTO event_feed_items (id, scope_type, scope_id, author_user_id, title, body, metadata, visibility, is_pinned)
VALUES
  (4001, 'global', NULL, 9002, 'Welcome', 'Seed global event', '{}'::jsonb, 'public', TRUE),
  (4002, 'team', 1001, 9003, 'Alpha training', 'Seed team event', '{}'::jsonb, 'public', FALSE)
ON CONFLICT (id) DO NOTHING;
SELECT setval('event_feed_items_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM event_feed_items), 4002));

INSERT INTO comments (id, entity_type, entity_id, parent_comment_id, author_user_id, body)
VALUES
  (5001, 'event', 4001, NULL, 9001, 'Welcome to the league!'),
  (5002, 'team', 1001, NULL, 9003, 'Alpha team comment')
ON CONFLICT (id) DO NOTHING;
SELECT setval('comments_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM comments), 5002));
