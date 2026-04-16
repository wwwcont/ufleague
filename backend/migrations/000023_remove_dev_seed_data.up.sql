-- Remove historical dev/demo seed data from existing environments.
DELETE FROM comments WHERE id IN (5001, 5002, 5003, 5004, 5101, 5102);
DELETE FROM event_feed_items WHERE id IN (4001, 4002, 4003, 4004, 4101, 4102);
DELETE FROM matches WHERE id IN (3101) OR id BETWEEN 3001 AND 3015;
DELETE FROM players WHERE id IN (2101, 2102, 2103, 2104) OR id BETWEEN 2001 AND 2016;
DELETE FROM teams WHERE id IN (1101, 1102) OR id BETWEEN 1001 AND 1016;

DELETE FROM user_restrictions
WHERE user_id = 9104
  AND restriction IN ('comments:banned', 'events:banned');

DELETE FROM user_permissions
WHERE user_id IN (9101, 9103)
  AND permission IN ('tournament.match.create', 'tournament.moderate', 'match.score.manage');

DELETE FROM user_roles
WHERE user_id IN (9101, 9102, 9103, 9104)
   OR user_id BETWEEN 9001 AND 9018;

DELETE FROM users
WHERE id IN (9101, 9102, 9103, 9104)
   OR id BETWEEN 9001 AND 9018;
