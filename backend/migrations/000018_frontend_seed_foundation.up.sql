-- Move demo data source from frontend mocks to DB seed records.
INSERT INTO users (id, username, display_name, is_active)
VALUES
  (9101, 'seed_admin', 'Seed Admin', TRUE),
  (9102, 'seed_captain_home', 'Seed Captain Home', TRUE),
  (9103, 'seed_captain_away', 'Seed Captain Away', TRUE),
  (9104, 'seed_player', 'Seed Player', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 9101, id FROM roles WHERE code='admin' ON CONFLICT DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT 9102, id FROM roles WHERE code='captain' ON CONFLICT DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT 9103, id FROM roles WHERE code='captain' ON CONFLICT DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT 9104, id FROM roles WHERE code='player' ON CONFLICT DO NOTHING;

INSERT INTO user_permissions (user_id, permission)
VALUES
  (9101, 'tournament.match.create'),
  (9101, 'tournament.moderate'),
  (9103, 'match.score.manage')
ON CONFLICT DO NOTHING;

INSERT INTO user_restrictions (user_id, restriction)
VALUES
  (9104, 'comments:banned'),
  (9104, 'events:banned')
ON CONFLICT DO NOTHING;

INSERT INTO teams (id, name, short_name, slug, description, logo_url, socials, captain_user_id)
VALUES
  (1101, 'North Falcons', 'NFL', 'north-falcons', 'DB seeded home team', '', '{"telegram":"@north_falcons"}'::jsonb, 9102),
  (1102, 'South Wolves', 'SWV', 'south-wolves', 'DB seeded away team', '', '{"telegram":"@south_wolves"}'::jsonb, 9103)
ON CONFLICT (id) DO NOTHING;

INSERT INTO players (id, user_id, team_id, full_name, nickname, avatar_url, socials, position, shirt_number)
VALUES
  (2101, 9102, 1101, 'Ilya Falcon', 'Ilya', '', '{}'::jsonb, 'FW', 9),
  (2102, 9104, 1101, 'Roman Support', 'Roman', '', '{}'::jsonb, 'MF', 8),
  (2103, 9103, 1102, 'Mark Wolf', 'Mark', '', '{}'::jsonb, 'FW', 10),
  (2104, NULL, 1102, 'Dan Keeper', 'Dan', '', '{}'::jsonb, 'GK', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO matches (id, home_team_id, away_team_id, start_at, status, home_score, away_score, extra_time, venue)
VALUES
  (3101, 1101, 1102, NOW() - INTERVAL '2 day', 'finished', 2, 1, '{"stage":"GROUP","tour":"Seed round","goal_events":[{"id":"seed_goal_1","type":"goal","team_id":"1101","player_id":"2101","assist_player_id":"2102"},{"id":"seed_goal_2","type":"goal","team_id":"1102","player_id":"2103"},{"id":"seed_goal_3","type":"goal","team_id":"1101","player_id":"2101"}]}'::jsonb, 'Seed Arena')
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_feed_items (id, scope_type, scope_id, author_user_id, title, body, metadata, visibility, is_pinned)
VALUES
  (4101, 'match', 3101, 9101, 'Seeded match recap', 'Demo recap generated from DB seed migration.', '{"summary":"Seeded match recap from DB"}'::jsonb, 'public', FALSE),
  (4102, 'team', 1101, 9102, 'Team notice', 'Training at 19:00.', '{"summary":"Training notice"}'::jsonb, 'public', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO comments (id, entity_type, entity_id, parent_comment_id, author_user_id, body)
VALUES
  (5101, 'match', 3101, NULL, 9101, 'Seed comment from DB'),
  (5102, 'match', 3101, 5101, 9102, 'Reply from captain')
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM users), 9104));
SELECT setval('teams_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM teams), 1102));
SELECT setval('players_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM players), 2104));
SELECT setval('matches_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM matches), 3101));
SELECT setval('event_feed_items_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM event_feed_items), 4102));
SELECT setval('comments_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM comments), 5102));
