INSERT INTO users (id, username, display_name, is_active)
VALUES
  (9001, 'superadmin', 'Super Admin', TRUE),
  (9002, 'admin_test', 'Admin Test', TRUE),
  (9003, 'captain_alpha', 'Captain Alpha', TRUE),
  (9005, 'guest_test', 'Guest Test', TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM users), 9005));

INSERT INTO user_roles (user_id, role_id)
SELECT 9001, id FROM roles WHERE code='superadmin' ON CONFLICT DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT 9002, id FROM roles WHERE code='admin' ON CONFLICT DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT 9003, id FROM roles WHERE code='captain' ON CONFLICT DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT 9005, id FROM roles WHERE code='guest' ON CONFLICT DO NOTHING;
