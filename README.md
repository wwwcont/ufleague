# football_ui monorepo (frontend + backend)

Проект теперь содержит:
- **Frontend**: React + TypeScript + Vite (`/src`)
- **Backend**: Go + chi + pgx + PostgreSQL + migrations (`/backend`)

## 1) Быстрый запуск всего проекта

### Требования
- Docker + Docker Compose
- Node.js 20.19+ (рекомендуется 22+)
- Go 1.22+ (если запускать backend без Docker)

### Поднять backend + postgres
```bash
cp backend/.env.example backend/.env
docker compose up --build -d
```

### Прогнать миграции (включая seed c тестовыми данными)
```bash
cd backend
export $(cat .env | xargs)
make migrate-up
```

> Миграции запускаются локальным Go tool (`go run ./tools/migrate`) и по умолчанию подключаются к `localhost:5432`.
> Если нужен другой DSN: `make migrate-up MIGRATE_DATABASE_URL="postgres://..."`.

### Поднять frontend
```bash
cd ..
cp .env.example .env
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:8080`

---

## 2) Seed-данные и тестовый superadmin

В migration `000008_dev_seed.up.sql` добавлены моковые сущности для просмотра UI:
- пользователи
- команды
- игроки
- матч
- события
- комментарии

Тестовый superadmin в БД:
- `username: superadmin`
- `id: 9001`
- роль: `superadmin`

> В текущем foundation-режиме для входа удобно использовать `dev-login` endpoint.

Пример:
```bash
curl -i -c /tmp/cookies.txt \
  -X POST http://localhost:8080/api/auth/dev-login \
  -H 'Content-Type: application/json' \
  -d '{"username":"superadmin","display_name":"Super Admin","roles":["superadmin"]}'
```

---

## 3) Frontend подключение к backend

Frontend теперь может работать не только на моках.

Переключение в `.env`:
```env
VITE_USE_BACKEND=true
VITE_API_BASE_URL=http://localhost:8080
```

Если `VITE_USE_BACKEND=false`, будет использован mock repository layer.

---

## 4) Основные backend API для проверки

### Auth
- `POST /api/auth/dev-login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/telegram/start`
- `POST /api/auth/telegram/complete`

### Public read
- `GET /api/teams`
- `GET /api/players`
- `GET /api/matches`
- `GET /api/events`
- `GET /api/comments?entityType=...&entityId=...`

### Cabinet / admin / superadmin
- `GET /api/me/profile`
- `PATCH /api/me/profile`
- `POST /api/captain/teams/:id/invite`
- `PATCH /api/captain/teams/:id/socials`
- `PATCH /api/captain/teams/:id/roster/:playerId`
- `POST /api/admin/comments/:id/moderate-delete`
- `POST /api/admin/teams/:id/transfer-captain`
- `POST /api/admin/users/:id/comment-block`
- `POST /api/superadmin/users/:id/roles`
- `POST /api/superadmin/users/:id/permissions`
- `POST /api/superadmin/users/:id/restrictions`
- `PUT /api/superadmin/settings/:key`

---

## 5) Что допилено по frontend под backend

- Добавлен API repository layer (`src/infrastructure/api/repositories.ts`) для:
  - teams / players / matches / events / comments
  - session (через `/api/auth/me` и `/api/auth/dev-login`)
- Provider переключается между mock и backend-режимом через `VITE_USE_BACKEND`.

Это позволяет открыть существующие страницы (включая comments/profile flow) уже на реальных backend ручках.

---

## 6) Полезные команды

### Backend
```bash
cd backend
make run
make test
make migrate-up
```

### Frontend
```bash
npm run dev
npm run build
```
