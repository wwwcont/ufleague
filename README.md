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

Если в логах Postgres появляется `password authentication failed for user "postgres"`:
- чаще всего это старый `postgres_data` volume с предыдущим паролем;
- остановите контейнеры и пересоздайте volume:
```bash
docker compose down -v
docker compose up --build -d
```
- либо выставьте одинаковые `POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB` в корневом `.env` перед `docker compose up`.

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

Dev login для UI теперь Telegram-shaped: кнопка "Войти через Telegram" → ввод mock code → backend создает cookie session.

Коды seeded аккаунтов:
- `UFL-SUPERADMIN-2026` → `superadmin`
- `UFL-ADMIN-2026` → `admin_test`
- `UFL-CAPTAIN-2026` → `captain_alpha`
- `UFL-PLAYER-2026` → `player_test`

CLI-проверка:
```bash
curl -i -c /tmp/cookies.txt \
  -X POST http://localhost:8080/api/auth/telegram/mock-code-login \
  -H 'Content-Type: application/json' \
  -d '{"code":"UFL-SUPERADMIN-2026"}'
```

---

## 3) Frontend подключение к backend

Frontend теперь может работать не только на моках (рекомендуемый режим для интеграции — backend).

Переключение в `.env`:
```env
VITE_USE_BACKEND=true
VITE_API_BASE_URL=http://localhost:8080
```

Если `VITE_USE_BACKEND=false`, будет использован mock repository layer.

---

## 4) Основные backend API для проверки

### Auth
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/telegram/start`
- `POST /api/auth/telegram/complete-code`
- `POST /api/auth/telegram/mock-code-login` (dev-only)

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
  - session (через `/api/auth/me` и telegram mock-code login)
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

---

## 7) Production readiness essentials

### Auth/security mode split
- `APP_ENV=production` включает strict config validation.
- В production запрещены:
  - `DEV_LOGIN_ENABLED=true`
  - `TELEGRAM_MOCK_LOGIN_ENABLED=true`
- В production обязательно:
  - `SESSION_SECURE=true`
  - `CORS_ALLOWED_ORIGINS` с явным allowlist.

Если конфиг нарушает правила, backend завершится с ошибкой на старте.

### Security middleware (production-grade baseline)
- Proxy-aware IP extraction (`X-Forwarded-For` / `X-Real-IP`) только для `TRUSTED_PROXIES`.
- CORS по explicit allowlist (`CORS_ALLOWED_ORIGINS`).
- CSRF cookie + header check (`X-CSRF-Token`) для mutating requests.
- Rate limiting per-IP (`RATE_LIMIT_PER_MINUTE`), body limit (`BODY_LIMIT_BYTES`).
- Secure headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, etc.).

### Observability baseline
- Request ID (`X-Request-ID`).
- Structured request logs (`http_request`).
- Health endpoints:
  - `/healthz`
  - `/readyz`
  - `/metricsz` (lightweight process counters).

### CI quality gate
- Added GitHub Actions pipeline:
  - frontend build
  - backend tests/build

### Runbook
Production deploy details вынесены в: `docs/production-runbook.md`.
