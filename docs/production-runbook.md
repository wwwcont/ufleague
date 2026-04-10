# UFL Production Runbook

## 1. Build artifacts

### Backend
- Multi-stage Docker image: `backend/Dockerfile`.
- Binary: `/app/app`.
- Migrations copied into image at `/app/migrations`.

### Frontend
- Build command: `npm run build` (Vite).
- Static assets output: `dist/`.
- Recommended production serving: reverse proxy (Nginx/Caddy) serving `dist/` and proxying `/api` to backend.

## 2. Environment separation

Use separate env files for each environment:
- `.env.development`
- `.env.staging`
- `.env.production`

Critical production constraints:
- `APP_ENV=production`
- `SESSION_SECURE=true`
- `DEV_LOGIN_ENABLED=false`
- `TELEGRAM_MOCK_LOGIN_ENABLED=false`
- explicit `CORS_ALLOWED_ORIGINS`
- explicit `TRUSTED_PROXIES`

Backend startup validates these and fails fast on unsafe config.

## 3. Reverse proxy topology

Recommended:
- TLS terminates at reverse proxy.
- Proxy passes `X-Forwarded-For` and `X-Real-IP`.
- Backend listens on private network.

Security middleware trusts forwarded headers only from `TRUSTED_PROXIES`.

## 4. Migrations strategy

Before deploy:
1. Build candidate image.
2. Run migrations (`make migrate-up` or migration job in CI/CD).
3. Start backend rollout.

Rollback:
- Use image rollback + controlled DB migration rollback when compatible.
- Prefer forward-fix migrations for production incidents.

## 5. DB backup / restore

Minimum policy:
- Daily logical backup (`pg_dump`) + WAL archiving or provider snapshots.
- Retention policy by compliance/SLA.
- Quarterly restore drills to verify integrity.

## 6. Health / diagnostics

Endpoints:
- `/healthz` – liveness.
- `/readyz` – readiness (DB connectivity).
- `/metricsz` – basic request/error counters.

Logs:
- Structured JSON logs (`LOG_FORMAT=json`).
- `http_request` entries include method/path/status/duration/request_id.

## 7. Staging vs production

Staging:
- May enable mock telegram login for QA (`TELEGRAM_MOCK_LOGIN_ENABLED=true`) if isolated.
- Lower retention and relaxed rate limits.

Production:
- Mock auth disabled.
- Strict CORS origin allowlist.
- Secure cookies and trusted proxy allowlist required.

## 8. CI/CD minimal gate

Required checks before merge/deploy:
- Frontend lint/build.
- Backend tests/build.
- Optional migration dry-run/check in release pipeline.

## 9. Telegram auth & notifications architecture

Auth and notifications are separated:
- Auth: `service/telegramauth` + auth repositories + `/api/auth/telegram/*`.
- Notifications: `service/notifications` queue + delivery adapter interface.

Future bot rollout:
- Keep mock adapter only for non-production.
- Implement real bot delivery worker over `ProcessPending` with retries/status updates.
