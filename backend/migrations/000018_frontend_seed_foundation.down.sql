DELETE FROM comments WHERE id IN (5101, 5102);
DELETE FROM event_feed_items WHERE id IN (4101, 4102);
DELETE FROM matches WHERE id = 3101;
DELETE FROM players WHERE id IN (2101, 2102, 2103, 2104);
DELETE FROM teams WHERE id IN (1101, 1102);
DELETE FROM user_restrictions WHERE user_id = 9104 AND restriction IN ('comments:banned', 'events:banned');
DELETE FROM user_permissions WHERE user_id IN (9101, 9103) AND permission IN ('tournament.match.create', 'tournament.moderate', 'match.score.manage');
DELETE FROM user_roles WHERE user_id IN (9101, 9102, 9103, 9104);
DELETE FROM users WHERE id IN (9101, 9102, 9103, 9104);
