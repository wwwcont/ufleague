# Epic 7: Telegram bot auth integration preparation

## Что сделано в этом этапе

Подготовлена production-ready архитектура code-based авторизации через Telegram bot без изменения UX экрана логина:

1. `start` создает `login session` и возвращает `request_id`, `auth_url`, `expires_at`.
2. Bot (или mock adapter в dev) выпускает одноразовый `code`, связанный с:
   - конкретной `login session`,
   - конкретным `telegram_user_id`,
   - выбранной ролью пользователя.
3. `complete-code` принимает `request_id + code`, делает one-time consume и открывает backend session cookie.

## Backend architecture

### Новые таблицы

- `telegram_login_sessions` — pending login session с TTL и `consumed_at`.
- `telegram_login_codes` — one-time code (hash), связь с session и telegram user, TTL, источник выдачи (`issued_by`).
- `telegram_auth_audit_log` — аудит выдачи/потребления кода.

### Гарантии

- TTL на login session и код.
- One-time usage через `consumed_at`.
- Binding к pending login session (`login_session_id`).
- Binding к telegram user (`telegram_user_id`).
- Аудит событий (`code_issued`, `code_consumed`).

### Adapter-подход

- В dev mode работает `mock_adapter`, который в `start` автоматически записывает mock-code для выбранной роли.
- В production этот adapter заменяется bot worker-ом, который пишет в те же таблицы.
- HTTP контракты и UX при этом не меняются.

## Frontend contracts

- `startTelegramLogin(role?) => { authUrl, requestId, expiresAt }`
- `completeTelegramLogin(requestId, code)`

UI поддерживает:

- ручной ввод кода,
- явные состояния `invalid code` / `expired login session`,
- выбор mock-роли кнопкой (`player`, `captain`, `admin`, `superadmin`) без поломки текущего флоу.

## Разделение auth и notifications через Telegram

Архитектурно потоки разделены:

- Auth flow: `telegram_login_sessions` + `telegram_login_codes` + auth audit.
- Notification flow: существующие `notification_subscriptions` + `notification_jobs`.

Это позволяет подключить:

- team/global события,
- ответы на комментарии,
- новые комментарии на странице игрока

независимо от login-пайплайна.

## Следующий шаг (реальный бот)

1. Добавить bot endpoint/worker для команды `/start login_<request_id>`.
2. Генерировать одноразовый код в боте и писать запись в `telegram_login_codes` c `issued_by='bot_adapter'`.
3. Опционально добавить polling endpoint (`GET /api/auth/telegram/status?request_id=...`) для auto-complete без ручного ввода.
4. Подключить delivery worker для `notification_jobs` и маршрутизацию типов уведомлений.
