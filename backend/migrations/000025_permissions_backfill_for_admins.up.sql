WITH target_users AS (
  SELECT DISTINCT ur.user_id
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE r.code IN ('admin', 'superadmin')
),
permission_codes AS (
  SELECT unnest(ARRAY[
    'comments.ban.issue',
    'role.player.assign',
    'role.captain.assign',
    'role.player.revoke',
    'role.captain.revoke',
    'playoff.grid.edit',
    'tournament.edit',
    'stats.manual.manage',
    'event.full.create',
    'match.score.manage.full',
    'archive.manage',
    'archive.delete',
    'match.create',
    'comment.delete.any'
  ]) AS permission
)
INSERT INTO user_permissions (user_id, permission)
SELECT u.user_id, p.permission
FROM target_users u
CROSS JOIN permission_codes p
ON CONFLICT (user_id, permission) DO NOTHING;
