# Backend ↔ Frontend endpoint check (2026-04-10)

Исключение по запросу: Telegram-флоу (`/api/auth/telegram/*`) не входит в обязательную готовность.

## Методика

1. Снял полный список endpoint'ов из `backend/internal/transport/http/router.go`.
2. Сверил каждый endpoint с реальным вызовом в `src/infrastructure/api/repositories.ts`.
3. Проверил, что для role-gated endpoint'ов есть кнопки/действия в UI (`src/pages/profile/CabinetSectionPage.tsx` и текущие details pages).

## Матрица покрытия

| Endpoint | Роль | Front call | UI action/button | Статус |
|---|---|---|---|---|
| `GET /api/auth/me` | session | `sessionRepository.getSession` | app session init | ✅ |
| `POST /api/auth/dev-login` | public(dev) | `sessionRepository.loginAsDevRole` | Login dev buttons | ✅ |
| `POST /api/auth/logout` | session | `sessionRepository.logout` | Profile logout | ✅ |
| `POST /api/auth/telegram/start` | n/a* | `sessionRepository.startTelegramLogin` | Telegram button (disabled path) | ⚠️ исключено |
| `POST /api/auth/telegram/complete-code` | n/a* | `sessionRepository.completeTelegramLoginWithCode` | отсутствует в прод-флоу | ⚠️ исключено |
| `GET /api/teams` | public | `teamsRepository.getTeams` | teams listing | ✅ |
| `GET /api/teams/{id}` | public | `teamsRepository.getTeamById` | team details | ✅ |
| `POST /api/teams` | admin+ | `teamsRepository.createTeam` | Cabinet → `tournament` | ✅ |
| `PATCH /api/teams/{id}` | admin+ | `teamsRepository.updateTeam` | Team details edit | ✅ |
| `GET /api/players` | public | `playersRepository.getPlayers` | players listing | ✅ |
| `GET /api/players/{id}` | public | `playersRepository.getPlayerById` | player details | ✅ |
| `POST /api/players` | admin+ | `playersRepository.createPlayer` | Cabinet → `tournament` | ✅ |
| `PATCH /api/players/{id}` | admin+ | `playersRepository.updatePlayer` | player details edit | ✅ |
| `GET /api/matches` | public | `matchesRepository.getMatches` | matches listing | ✅ |
| `GET /api/matches/{id}` | public | `matchesRepository.getMatchById` | match details | ✅ |
| `POST /api/matches` | admin+ | `matchesRepository.createMatch` | Cabinet → `tournament` | ✅ |
| `PATCH /api/matches/{id}` | admin+ | `matchesRepository.updateMatch` | match details edit | ✅ |
| `GET /api/standings` | public | `standingsRepository.getStandings` | standings page | ✅ |
| `GET /api/bracket` | public | `bracketRepository.getBracket` | bracket page | ✅ |
| `GET /api/search` | public | `searchRepository.searchAll` | search UI | ✅ |
| `GET /api/events` | public | `eventsRepository.getEvents` | events feed | ✅ |
| `GET /api/events/{id}` | public | `eventsRepository.getEventById` | event details | ✅ |
| `POST /api/events` | captain/admin/superadmin | `eventsRepository.createEventForScope` + `cabinetRepository.createTeamEvent` | Match details + Cabinet `team-events` | ✅ |
| `PATCH /api/events/{id}` | captain/admin/superadmin | `eventsRepository.updateEventForScope` | Cabinet `team-events` | ✅ |
| `DELETE /api/events/{id}` | captain/admin/superadmin | `eventsRepository.deleteEvent` | Cabinet `team-events` | ✅ |
| `GET /api/comments` | public | `commentsRepository.getComments` | comments section | ✅ |
| `GET /api/comments/author-state` | public | `commentsRepository.getCurrentAuthor` | comments section | ✅ |
| `POST /api/comments` | session | `commentsRepository.createComment` | comments composer | ✅ |
| `POST /api/comments/{id}/reply` | session | `commentsRepository.replyToComment` | comments replies | ✅ |
| `DELETE /api/comments/{id}` | own/admin | `commentsRepository.deleteComment` | comment action | ✅ |
| `POST /api/comments/{id}/reactions` | session | `commentsRepository.setReaction` | like/dislike | ✅ |
| `GET /api/me/profile` | session | `cabinetRepository.getMyProfile` | Cabinet `profile` load | ✅ |
| `PATCH /api/me/profile` | session | `cabinetRepository.updateMyProfile` | Cabinet `profile` save | ✅ |
| `POST /api/captain/teams/{id}/invite` | captain | `teamsRepository.captainInviteByUsername` | Cabinet `invites` + Team details | ✅ |
| `PATCH /api/captain/teams/{id}/socials` | captain | `teamsRepository.captainUpdateSocials` | Cabinet `team-socials` + Team details | ✅ |
| `PATCH /api/captain/teams/{id}/roster/{playerId}` | captain | `teamsRepository.captainSetRosterVisibility` | Cabinet `roster` + Team details | ✅ |
| `POST /api/admin/comments/{id}/moderate-delete` | admin | `cabinetRepository.adminModerateComment` | Cabinet `moderation` | ✅ |
| `POST /api/admin/teams/{id}/transfer-captain` | admin | `teamsRepository.adminTransferCaptain` | Team details | ✅ |
| `POST /api/admin/users/{id}/comment-block` | admin | `cabinetRepository.adminBlockComments` | Cabinet `comment-blocks` | ✅ |
| `POST /api/superadmin/users/{id}/roles` | superadmin | `cabinetRepository.superadminAssignRoles` | Cabinet `roles` | ✅ |
| `POST /api/superadmin/users/{id}/permissions` | superadmin | `cabinetRepository.superadminAssignPermissions` | Cabinet `rbac` | ✅ |
| `POST /api/superadmin/users/{id}/restrictions` | superadmin | `cabinetRepository.superadminAssignRestrictions` | Cabinet `restrictions` | ✅ |
| `PUT /api/superadmin/settings/{key}` | superadmin | `cabinetRepository.superadminSetGlobalSetting` | Cabinet `settings` | ✅ |

## Вывод

С учетом исключения Telegram, endpoint-покрытие фронтом доведено до полного: у каждого backend endpoint есть frontend вызов, а у role-gated endpoint'ов есть UI-кнопка и роль-доступ в кабинете/детальных страницах.
