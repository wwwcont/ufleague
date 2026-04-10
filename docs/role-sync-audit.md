# Role-based backend/frontend sync audit

Дата аудита: 2026-04-10.

## Ключевой вывод

Большая часть «кабинетного» функционала по ролям (captain/admin/superadmin) не подключена к backend на уровне UI-экранов, несмотря на то что соответствующие backend endpoints уже существуют.

## Найденные рассинхронизации

### 1) Роль в сессии на фронте выбиралась как `roles[0]`

- В backend роли пользователя приходят массивом, но порядок массива не гарантирует «старшую» роль.
- На фронте ранее выбиралась первая роль, из-за чего superadmin/admin могли отображаться и авторизовываться в UI как более низкая роль.
- Исправлено в рамках этого MR: выбор primary role теперь идет по приоритету (`guest < player < captain < admin < superadmin`).

Файлы:
- `src/infrastructure/api/repositories.ts`
- `backend/internal/repository/auth.go`

### 2) Кабинетные разделы в UI — пока статические макеты

- Страница `/profile/:section` отрисовывает mock-таблицы и placeholder-поля, без реальных запросов на backend.
- Поэтому «изменения профиля / команд / ивентов / ролей / ограничений» из этих экранов фактически не выполняются.

Файл:
- `src/pages/profile/CabinetSectionPage.tsx`

### 3) Backend cabinet endpoints есть, но frontend-контракт покрывает только часть действий

На backend уже есть маршруты:
- `/api/me/profile` (GET/PATCH)
- `/api/captain/...`
- `/api/admin/...`
- `/api/superadmin/...`

Но frontend `contracts.ts` не содержит полного набора cabinet-операций для admin/superadmin и profile management, поэтому UI не может типобезопасно/системно их вызывать.

Файлы:
- `backend/internal/transport/http/router.go`
- `src/domain/repositories/contracts.ts`

### 4) Ролевые действия реализованы точечно и фрагментарно

- В `TeamDetailsPage` часть captain/admin действий уже привязана к API (`invite`, `socials`, `roster visibility`, `transfer captain`).
- В `MatchDetailsPage` есть только пример для создания события матча.
- В profile cabinet для большинства разделов — только текстовые заглушки.

Файлы:
- `src/pages/teams/TeamDetailsPage.tsx`
- `src/pages/matches/MatchDetailsPage.tsx`
- `src/pages/profile/CabinetSectionPage.tsx`

## Приоритетный план синхронизации

1. **Стабилизировать role resolution (сделано в этом MR).**
2. **Добавить cabinet repository contract** на фронте:
   - `getMyProfile`, `updateMyProfile`
   - `adminBlockComments`, `adminModerateComment`, `adminTransferCaptain`
   - `superadminAssignRoles`, `superadminAssignPermissions`, `superadminAssignRestrictions`, `superadminSetGlobalSetting`
3. **Подключить реальные формы в `/profile/:section`** вместо mock блоков.
4. **Добавить e2e smoke по ролям** (captain/admin/superadmin) на критичные сценарии.

## Быстрый чеклист для диагностики в среде

- Убедиться, что frontend действительно работает в backend-режиме:
  - `VITE_USE_BACKEND=true`
  - `VITE_API_BASE_URL=http://localhost:8080`
- Проверить сессию `GET /api/auth/me` и массив `user.roles`.
- Пройти руками сценарии:
  - captain: invite + socials + roster visibility
  - admin: transfer captain + comment block
  - superadmin: roles/permissions/restrictions/settings
