# Permissions и endpoint-ы (RBAC)

Документ фиксирует текущую модель прав в проекте: какие permission-коды есть в системе, какие backend endpoint-ы они открывают и как это отражается во frontend.

## Роли

- `guest`
- `player`
- `captain`
- `admin`
- `superadmin`

`superadmin` имеет полный доступ по permission-check-ам (через policy `HasPermission`). Для остальных ролей доступ определяется явными permissions.

## Список permission-кодов

Источник истины — `backend/internal/domain/permission.go`:

- `comments.ban.issue`
- `role.player.assign`
- `role.captain.assign`
- `role.player.revoke`
- `role.captain.revoke`
- `playoff.grid.edit`
- `tournament.edit`
- `stats.manual.manage`
- `event.full.create`
- `match.score.manage.full`
- `archive.manage`
- `archive.delete`
- `match.create`
- `comment.delete.any`
- `admin.permissions.manage`

## Матрица: permission → backend endpoint-ы

> Примечание: часть endpoint-ов дополнительно ограничена бизнес-условиями (например, target user должен быть admin, запрет на изменение superadmin и т.д.).

### `admin.permissions.manage`

- `POST /api/superadmin/users/{id}/permissions`
  - доступ: `superadmin` **или** admin с `admin.permissions.manage`
  - ограничения для admin с делегированием:
    - target не может быть `superadmin`
    - target должен иметь роль `admin`
    - нельзя выдавать `admin.permissions.manage`

- `GET /api/admin/access-matrix`
  - доступ: `superadmin` **или** пользователь с `admin.permissions.manage`

### `comments.ban.issue`

- `POST /api/admin/users/{id}/comment-block`

### `role.player.assign`

- `POST /api/admin/users/{id}/player-role`

### `role.captain.assign`

- `POST /api/admin/users/{id}/captain-role`
- `POST /api/admin/teams/{id}/transfer-captain`

### `role.player.revoke`

- `DELETE /api/admin/users/{id}/player`

### `role.captain.revoke`

- `DELETE /api/admin/users/{id}/captain-role`

### `archive.manage`

- `POST /api/admin/teams/{id}/archive`
- `POST /api/admin/players/{id}/archive`

### `archive.delete`

- `DELETE /api/admin/teams/{id}`
- `DELETE /api/admin/matches/{id}`

### `stats.manual.manage`

- `GET /api/admin/stats/adjustments`
- `POST /api/admin/stats/adjustments`
- `DELETE /api/admin/stats/adjustments/{id}`

### `comment.delete.any`

- `POST /api/admin/comments/{id}/moderate-delete`
- также даёт удаление чужих комментариев в потоке через comments service

### `playoff.grid.edit`

- `POST /api/admin/playoff-grid/{tournamentId}/draft-validate`
- `POST /api/admin/playoff-grid/{tournamentId}/save`
- `GET /api/admin/playoff-grid/{tournamentId}/match-candidates`
- `POST /api/admin/playoff-grid/attach-match`
- `POST /api/admin/playoff-grid/detach-match`

### `tournament.edit`

- `POST /api/admin/tournament/cycles`
- `DELETE /api/admin/tournament/cycles/{id}`
- `POST /api/admin/tournament/cycles/{id}/activate`
- `PATCH /api/admin/tournament/cycles/{id}/settings`

### `match.create`

- `POST /api/matches`

### `match.score.manage.full`

- изменение счёта матча через patch-операции матчей в tournament service

### `event.full.create`

- глобальное создание/редактирование/удаление событий в events service

## Роль superadmin и role-management endpoint-ы

Следующие endpoint-ы остаются только для `superadmin`:

- `POST /api/superadmin/users/{id}/roles`
- `POST /api/superadmin/users/{id}/restrictions`
- `PUT /api/superadmin/settings/{key}`

## Frontend: что видит оператор в разделе доступа

В `CabinetSectionPage`:

- секция `users-access-management` открывается:
  - по роли `admin/superadmin`, или
  - при наличии `admin.permissions.manage` через `sectionPermissionOverrides`.
- переключатель `admin.permissions.manage` отображается только `superadmin`.
- кнопка «Сохранить права» активна только для `superadmin` или пользователя с `admin.permissions.manage`.

Это UI-поведение дублирует backend-проверки, но не заменяет их.

## Инварианты безопасности

1. Все write-операции требуют session (`RequireSession`) и CSRF-token для mutating-запросов.
2. Backend — источник истины прав; frontend выступает только как UX-слой.
3. Невалидные permission-коды отклоняются (`IsKnownPermission`).
4. `ReplaceUserPermissions` выполняется в транзакции (delete+insert+commit).
