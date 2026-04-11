INSERT INTO users (id, username, display_name, is_active)
VALUES
  (9001, 'superadmin', 'Super Admin', TRUE),
  (9002, 'admin_test', 'Admin Test', TRUE),
  (9003, 'captain_alpha', 'Captain Alpha', TRUE),
  (9004, 'captain_beta', 'Captain Beta', TRUE),
  (9005, 'player_test', 'Player Test', TRUE),
  (9006, 'captain_gamma', 'Captain Gamma', TRUE),
  (9007, 'captain_delta', 'Captain Delta', TRUE),
  (9008, 'captain_epsilon', 'Captain Epsilon', TRUE),
  (9009, 'captain_zeta', 'Captain Zeta', TRUE),
  (9010, 'captain_eta', 'Captain Eta', TRUE),
  (9011, 'captain_theta', 'Captain Theta', TRUE),
  (9012, 'captain_iota', 'Captain Iota', TRUE),
  (9013, 'captain_kappa', 'Captain Kappa', TRUE),
  (9014, 'captain_lambda', 'Captain Lambda', TRUE),
  (9015, 'captain_mu', 'Captain Mu', TRUE),
  (9016, 'captain_nu', 'Captain Nu', TRUE),
  (9017, 'captain_xi', 'Captain Xi', TRUE),
  (9018, 'captain_omicron', 'Captain Omicron', TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM users), 9018));

INSERT INTO user_roles (user_id, role_id)
SELECT 9001, id FROM roles WHERE code='superadmin' ON CONFLICT DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT 9002, id FROM roles WHERE code='admin' ON CONFLICT DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT user_id, id FROM (VALUES
  (9003),(9004),(9006),(9007),(9008),(9009),(9010),(9011),(9012),(9013),(9014),(9015),(9016),(9017),(9018)
) AS c(user_id), roles WHERE code='captain' ON CONFLICT DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT 9005, id FROM roles WHERE code='player' ON CONFLICT DO NOTHING;

INSERT INTO teams (id, name, slug, description, logo_url, socials, captain_user_id)
VALUES
  (1001, 'Alpha FC', 'alpha-fc', 'Seeded alpha team', '', '{"telegram":"@alpha"}'::jsonb, 9003),
  (1002, 'Beta FC', 'beta-fc', 'Seeded beta team', '', '{"telegram":"@beta"}'::jsonb, 9004),
  (1003, 'Gamma United', 'gamma-united', 'Seeded gamma team', '', '{"telegram":"@gamma"}'::jsonb, 9006),
  (1004, 'Delta Stars', 'delta-stars', 'Seeded delta team', '', '{"telegram":"@delta"}'::jsonb, 9007),
  (1005, 'Epsilon Crew', 'epsilon-crew', 'Seeded epsilon team', '', '{"telegram":"@epsilon"}'::jsonb, 9008),
  (1006, 'Zeta Rangers', 'zeta-rangers', 'Seeded zeta team', '', '{"telegram":"@zeta"}'::jsonb, 9009),
  (1007, 'Eta City', 'eta-city', 'Seeded eta team', '', '{"telegram":"@eta"}'::jsonb, 9010),
  (1008, 'Theta Athletic', 'theta-athletic', 'Seeded theta team', '', '{"telegram":"@theta"}'::jsonb, 9011),
  (1009, 'Iota Legends', 'iota-legends', 'Seeded iota team', '', '{"telegram":"@iota"}'::jsonb, 9012),
  (1010, 'Kappa Knights', 'kappa-knights', 'Seeded kappa team', '', '{"telegram":"@kappa"}'::jsonb, 9013),
  (1011, 'Lambda SC', 'lambda-sc', 'Seeded lambda team', '', '{"telegram":"@lambda"}'::jsonb, 9014),
  (1012, 'Mu Thunder', 'mu-thunder', 'Seeded mu team', '', '{"telegram":"@mu"}'::jsonb, 9015),
  (1013, 'Nu Phoenix', 'nu-phoenix', 'Seeded nu team', '', '{"telegram":"@nu"}'::jsonb, 9016),
  (1014, 'Xi Orbit', 'xi-orbit', 'Seeded xi team', '', '{"telegram":"@xi"}'::jsonb, 9017),
  (1015, 'Omicron Force', 'omicron-force', 'Seeded omicron team', '', '{"telegram":"@omicron"}'::jsonb, 9018),
  (1016, 'Sigma FC', 'sigma-fc', 'Seeded sigma team', '', '{"telegram":"@sigma"}'::jsonb, NULL)
ON CONFLICT (id) DO NOTHING;

SELECT setval('teams_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM teams), 1016));

INSERT INTO players (id, team_id, full_name, nickname, avatar_url, socials, position, shirt_number)
VALUES
  (2001, 1001, 'Alex Striker', 'Alex', '', '{}'::jsonb, 'FW', 9),
  (2002, 1002, 'Boris Keeper', 'Boris', '', '{}'::jsonb, 'GK', 1),
  (2003, 1003, 'Chris Gamma', 'Chris', '', '{"age":"24"}'::jsonb, 'MF', 8),
  (2004, 1004, 'Den Delta', 'Den', '', '{"age":"25"}'::jsonb, 'DF', 5),
  (2005, 1005, 'Evan Epsilon', 'Evan', '', '{"age":"23"}'::jsonb, 'FW', 11),
  (2006, 1006, 'Zed Zeta', 'Zed', '', '{"age":"22"}'::jsonb, 'MF', 6),
  (2007, 1007, 'Eric Eta', 'Eric', '', '{"age":"26"}'::jsonb, 'DF', 4),
  (2008, 1008, 'Theo Theta', 'Theo', '', '{"age":"27"}'::jsonb, 'FW', 10),
  (2009, 1009, 'Ian Iota', 'Ian', '', '{"age":"21"}'::jsonb, 'MF', 7),
  (2010, 1010, 'Karl Kappa', 'Karl', '', '{"age":"28"}'::jsonb, 'GK', 1),
  (2011, 1011, 'Leo Lambda', 'Leo', '', '{"age":"24"}'::jsonb, 'FW', 19),
  (2012, 1012, 'Max Mu', 'Max', '', '{"age":"22"}'::jsonb, 'DF', 3),
  (2013, 1013, 'Niko Nu', 'Niko', '', '{"age":"25"}'::jsonb, 'MF', 14),
  (2014, 1014, 'Xander Xi', 'Xan', '', '{"age":"23"}'::jsonb, 'FW', 9),
  (2015, 1015, 'Omar Omicron', 'Omar', '', '{"age":"27"}'::jsonb, 'DF', 2),
  (2016, 1016, 'Sam Sigma', 'Sam', '', '{"age":"20"}'::jsonb, 'MF', 16)
ON CONFLICT (id) DO NOTHING;
SELECT setval('players_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM players), 2016));

INSERT INTO matches (id, home_team_id, away_team_id, start_at, status, home_score, away_score, extra_time, venue, stage_slot_column, stage_slot_row)
VALUES
  (3001, 1001, 1016, NOW() - INTERVAL '18 day', 'finished', 2, 0, '{"stage":"R16","tour":"First leg"}'::jsonb, 'Main Arena', 1, 1),
  (3002, 1008, 1009, NOW() - INTERVAL '17 day', 'finished', 1, 3, '{"stage":"R16","tour":"First leg"}'::jsonb, 'North Field', 1, 2),
  (3003, 1005, 1012, NOW() - INTERVAL '16 day', 'scheduled', 0, 0, '{"stage":"R16","tour":"First leg"}'::jsonb, 'West Arena', 1, 3),
  (3004, 1004, 1013, NOW() - INTERVAL '15 day', 'scheduled', 0, 0, '{"stage":"R16","tour":"First leg"}'::jsonb, 'West Arena', 1, 4),
  (3005, 1002, 1015, NOW() - INTERVAL '14 day', 'scheduled', 0, 0, '{"stage":"R16","tour":"First leg"}'::jsonb, 'South Stadium', 1, 5),
  (3006, 1007, 1010, NOW() - INTERVAL '13 day', 'scheduled', 0, 0, '{"stage":"R16","tour":"First leg"}'::jsonb, 'South Stadium', 1, 6),
  (3007, 1003, 1014, NOW() - INTERVAL '12 day', 'scheduled', 0, 0, '{"stage":"R16","tour":"First leg"}'::jsonb, 'East Ground', 1, 7),
  (3008, 1006, 1011, NOW() - INTERVAL '11 day', 'scheduled', 0, 0, '{"stage":"R16","tour":"First leg"}'::jsonb, 'East Ground', 1, 8),
  (3009, 1001, 1009, NOW() + INTERVAL '1 day', 'scheduled', 0, 0, '{"stage":"R8","tour":"Quarterfinal 1"}'::jsonb, 'Main Arena', 2, 1),
  (3010, 1002, 1006, NOW() + INTERVAL '2 day', 'scheduled', 0, 0, '{"stage":"R8","tour":"Quarterfinal 2"}'::jsonb, 'Main Arena', 2, 2),
  (3011, 1003, 1007, NOW() + INTERVAL '3 day', 'scheduled', 0, 0, '{"stage":"R8","tour":"Quarterfinal 3"}'::jsonb, 'Main Arena', 2, 3),
  (3012, 1004, 1008, NOW() + INTERVAL '4 day', 'scheduled', 0, 0, '{"stage":"R8","tour":"Quarterfinal 4"}'::jsonb, 'Main Arena', 2, 4),
  (3013, 1001, 1002, NOW() + INTERVAL '6 day', 'scheduled', 0, 0, '{"stage":"SF","tour":"Semifinal 1"}'::jsonb, 'Central Stadium', 3, 1),
  (3014, 1003, 1004, NOW() + INTERVAL '7 day', 'scheduled', 0, 0, '{"stage":"SF","tour":"Semifinal 2"}'::jsonb, 'Central Stadium', 3, 2),
  (3015, 1001, 1003, NOW() + INTERVAL '10 day', 'scheduled', 0, 0, '{"stage":"F","tour":"Final"}'::jsonb, 'Grand Final Arena', 4, 1)
ON CONFLICT (id) DO NOTHING;
SELECT setval('matches_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM matches), 3015));

INSERT INTO event_feed_items (id, scope_type, scope_id, author_user_id, title, body, metadata, visibility, is_pinned)
VALUES
  (4001, 'global', NULL, 9002, 'Welcome', 'Seed global event', '{"image_url":"https://images.unsplash.com/photo-1518091043644-c1d4457512c6"}'::jsonb, 'public', TRUE),
  (4002, 'team', 1001, 9003, 'Alpha training', 'Seed team event', '{"image_url":"https://images.unsplash.com/photo-1508098682722-e99c43a406b2"}'::jsonb, 'public', FALSE),
  (4003, 'match', 3001, 9002, 'Matchday report', 'Detailed recap of opening tie.', '{"image_url":"https://images.unsplash.com/photo-1522778119026-d647f0596c20","summary":"Opening match summary"}'::jsonb, 'public', FALSE),
  (4004, 'player', 2001, 9002, 'Player spotlight', 'Interview with Alex Striker.', '{"summary":"Top scorer interview"}'::jsonb, 'public', FALSE)
ON CONFLICT (id) DO NOTHING;
SELECT setval('event_feed_items_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM event_feed_items), 4004));

INSERT INTO comments (id, entity_type, entity_id, parent_comment_id, author_user_id, body)
VALUES
  (5001, 'event', 4001, NULL, 9001, 'Welcome to the league!'),
  (5002, 'team', 1001, NULL, 9003, 'Alpha team comment'),
  (5003, 'event', 4003, NULL, 9002, 'How did you like the opener?'),
  (5004, 'event', 4003, 5003, 9005, 'Great intensity and crowd support.')
ON CONFLICT (id) DO NOTHING;
SELECT setval('comments_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM comments), 5004));
