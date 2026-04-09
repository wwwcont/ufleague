# Information Architecture + Routing Specification
## Mobile-first frontend приложения футбольного турнира

## 0) Scope
- Документ описывает **экранную архитектуру и навигацию** public-части.
- Код не рассматривается.
- Основан на foundation-принципах: persistent header + persistent bottom nav + predictable back behavior.

---

## 1) Route Map (public)

## 1.1 Рекомендуемый path naming
Используем короткие и единообразные plural paths для коллекций и `:id` для деталей:

- `/` — Home
- `/matches` — Matches list
- `/matches/:matchId` — Match details
- `/teams` — Teams list
- `/teams/:teamId` — Team details
- `/players` — Players list
- `/players/:playerId` — Player details
- `/table` — Standings table
- `/bracket` — Tournament bracket
- `/search` — Global search
- `/login` — Login
- `/profile` — Profile

### Почему `/table`, а не `/standings`
- `/table` короче и быстрее набирается.
- Хорошо согласуется с термином “турнирная таблица”.
- Если продуктово нужен англоязычный термин “standings”, допустим алиас `/standings` с редиректом на `/table`.

## 1.2 Route Tree

```text
/
├── matches
│   └── :matchId
├── teams
│   └── :teamId
├── players
│   └── :playerId
├── table
├── bracket
├── search
├── login
└── profile
```

## 1.3 Route groups
- **Primary tabs:** `/`, `/matches`, `/teams`, `/table`, `/search`
- **Secondary/public details:** `/matches/:matchId`, `/teams/:teamId`, `/players/:playerId`, `/bracket`
- **Account:** `/login`, `/profile`

---

## 2) App Shell

## 2.1 Public shell composition
На всех перечисленных роутов используется один shell:
1. `Header` (fixed top)
2. `Content container` (scroll area)
3. `Bottom navigation` (fixed bottom)

## 2.2 Header behavior
- Всегда фиксирован сверху.
- Слоты:
  - **Left:** back button (внутренние страницы) или app title/logo (корневые разделы).
  - **Center:** заголовок экрана.
  - **Right:** контекстное действие (поиск, share, overflow) — опционально.
- Высота header постоянная на всех public-экранах.

## 2.3 Bottom nav behavior
- Всегда видим и фиксирован на public-экранах, включая `/login` и `/profile`.
- Пункты: `Home`, `Matches`, `Teams`, `Table`, `Search`.
- Активный пункт определяется по route-group.
- На detail-экранах (`/matches/:id`, `/teams/:id`, `/players/:id`, `/bracket`) ни один таб не активируется как “точно текущий раздел”, но допустимо подсвечивать логического родителя:
  - `/matches/:id` → Matches
  - `/teams/:id` → Teams
  - `/players/:id` → Teams **не подсвечивать**, лучше “none active” чтобы не вводить в заблуждение.
  - `/bracket` → Table (если bracket трактуется как часть tournament overview) или “none active” — выбрать и зафиксировать единообразно.

## 2.4 Back button logic
- Back присутствует на всех внутренних страницах, кроме `/`.
- Back-поведение:
  1. Если есть browser history внутри приложения → `history.back()`.
  2. Если прямой deep-link без локальной истории → fallback в логического родителя:
     - `/matches/:matchId` → `/matches`
     - `/teams/:teamId` → `/teams`
     - `/players/:playerId` → `/players`
     - `/bracket` → `/table`
     - `/search` → `/`
     - `/login` → `/`
     - `/profile` → `/`

## 2.5 Content container logic
- Только контентная область прокручивается, shell остается статичным.
- Для list-экранов используется непрерывный вертикальный scroll.
- Для bracket допускается вложенный горизонтальный scroll внутри контента.

## 2.6 Safe area logic (mobile)
- Header учитывает `safe-area-inset-top`.
- Bottom nav учитывает `safe-area-inset-bottom`.
- Content container имеет отступы, чтобы контент не уходил под fixed header/bottom nav.
- Минимальный touch target: 44x44 px.

---

## 3) Page Hierarchy Matrix

| Route | Screen purpose | Hierarchy | Entry points | Related screens | Return paths | Back button | Sticky section | Filters | In-page search |
|---|---|---|---|---|---|---|---|---|---|
| `/` | Обзор турнира и быстрые входы | L1 (root) | App launch, logo tap, bottom nav | Matches, Teams, Table, Bracket, Search | N/A | No | Header + bottom nav | Нет (минимум) | Нет |
| `/matches` | Просмотр расписания/результатов | L1 | Bottom nav, Home CTA, deep-link | Match details, Teams, Table | `/` | Optional (обычно нет для L1) | Header, filter row | Да (дата/тур/статус) | Да (опц. quick search по сопернику) |
| `/matches/:matchId` | Полная информация о матче | L2 | Matches list, Bracket, Team page | Team details, Player details, Table | `/matches` (fallback) | Yes | Header, scoreboard (частично sticky) | Нет (внутри можно tabs) | Нет |
| `/teams` | Каталог команд | L1 | Bottom nav, Home CTA, Search | Team details, Table | `/` | Optional | Header, top controls | Да (группа/сортировка) | Да |
| `/teams/:teamId` | Профиль команды | L2 | Teams list, Match details, Table | Players, Matches, Table | `/teams` | Yes | Header, team identity | Да (срез матчей) | Да (по игрокам команды, опц.) |
| `/players` | Каталог игроков | L1.5 (public, но не в bottom nav) | Search, Team details, direct link | Player details, Team details | `/` или предыдущий | Yes | Header, top controls | Да (команда/позиция) | Да |
| `/players/:playerId` | Профиль игрока | L2 | Players list, Team details, Match details | Team details, Match details | `/players` | Yes | Header, player identity | Нет | Нет |
| `/table` | Турнирная таблица | L1 | Bottom nav, Home CTA, Match/Team links | Team details, Bracket, Matches | `/` | Optional | Header, table header | Да (группа/стадия) | Нет |
| `/bracket` | Турнирная сетка стадий | L2 | Table CTA, Home CTA, deep-link | Match details, Teams | `/table` | Yes | Header, round switcher | Да (стадия/раунд) | Нет |
| `/search` | Глобальный поиск сущностей | L1 | Bottom nav, Header action | Match/Team/Player details | `/` | Yes | Header + search input | Да (тип сущности) | Основной функционал |
| `/login` | Авторизация | L1 account | Profile guard redirect, direct link | Profile, Home | `/` | Yes | Header | Нет | Нет |
| `/profile` | Личный кабинет | L1 account | Direct link, post-login redirect | Login, favorite entities | `/` | Yes | Header, profile top card | Да (секции настроек) | Нет |

Примечание по `/players`: экран обязателен в IA, даже если не в нижнем меню.

---

## 4) Navigation Model

## 4.1 Bottom navigation
- Пункты: `Home`, `Matches`, `Teams`, `Table`, `Search`.
- Тап по текущему активному пункту:
  - скроллит к верху экрана,
  - сбрасывает временные UI overlays,
  - не сбрасывает пользовательские фильтры без явного действия.
- При смене таба сохраняются `scroll + filter state` в кеше раздела.

## 4.2 Active states
- Active state только у L1-tab routes.
- Для detail routes — либо “родитель активен”, либо “none active”; правило единое для всех detail-групп.
- Рекомендуемо: parent-active для `/matches/:id` и `/teams/:id`, none-active для `/players/:id` и `/bracket`.

## 4.3 Back behavior (global)
- Приоритет browser history.
- Fallback chain по route-map (см. раздел 2.4).
- На L1 страницах back может быть скрыт, чтобы не конфликтовать с системным back жестом.

## 4.4 Cross-links between entities (обязательные)
- `match -> team` : обе команды кликабельны.
- `match -> player` : ключевые игроки / составы ведут в player details.
- `team -> player` : roster list ведет в player details.
- `team -> match` : календарь/результаты команды ведет в match details.
- `standings(/table) -> team` : строка команды кликабельна.
- `bracket -> match` : карточка матчапа ведет в match details.

## 4.5 Deep links
- Все detail routes должны быть открываемы напрямую.
- При deep-link входе back использует fallback parent route.
- На deep-link экране shell полностью сохраняется (никаких “isolated pages”).

## 4.6 Navigation Tree

```text
Bottom Nav
├── Home (/)
├── Matches (/matches)
│   └── Match Details (/matches/:matchId)
│       ├── Team A (/teams/:teamId)
│       ├── Team B (/teams/:teamId)
│       └── Player (/players/:playerId)
├── Teams (/teams)
│   └── Team Details (/teams/:teamId)
│       ├── Player (/players/:playerId)
│       ├── Match (/matches/:matchId)
│       └── Table (/table)
├── Table (/table)
│   ├── Team (/teams/:teamId)
│   └── Bracket (/bracket)
└── Search (/search)
    ├── Match (/matches/:matchId)
    ├── Team (/teams/:teamId)
    └── Player (/players/:playerId)

Account
├── Login (/login)
└── Profile (/profile)
```

---

## 5) Mobile Behavior

## 5.1 Scroll model
- Основной вертикальный scroll в content container.
- Header и bottom nav фиксированы.
- Вложенный горизонтальный scroll разрешен только в bracket и wide table.

## 5.2 Sticky areas
- Always sticky: header, bottom nav.
- Conditional sticky:
  - Matches: filter chips row.
  - Table: header row (или compact table controls).
  - Match details: compact scoreboard strip (после hero collapse).

## 5.3 Bracket mobile behavior
- Горизонтальный канвас раундов + vertical stacking матчей в каждой колонке.
- Snap между раундами.
- CTA: `Prev`, `Current`, `Next`.
- Карточка матчапа: команды, счет/статус, tap target на деталку.

## 5.4 List pages behavior
- L1 списки (matches, teams, players):
  - быстрый first paint,
  - фильтры сверху,
  - карточки одинаковой структуры,
  - бесшовный скролл.
- Возврат из detail должен восстанавливать позицию и фильтры.

## 5.5 Details pages behavior
- Верхний identity/hero блок + секционный контент ниже.
- Явные cross-links в связанных блоках.
- Плотный вертикальный layout без тяжёлых таблиц как default.

---

## 6) Desktop Adaptation

## 6.1 Что остается тем же
- Та же route map.
- Та же иерархия и back-логика.
- Те же сущности и cross-links.
- Тот же persistent shell (header + bottom nav может сохраняться как глобальный ориентир).

## 6.2 Что расширяется
- Контентная ширина ограничивается контейнером (например 1200–1280 px), а не растягивается бесконечно.
- Списки могут переходить в 2–3 колонки.
- Detail pages — 2-column layout (main + aside).
- Table показывает больше колонок без компрессии.
- Bracket отображает больше раундов одновременно.

## 6.3 Как не получить “растянутую мобилку”
- Использовать max-width containers.
- Добавить информативный aside: related entities, mini-standings, quick actions.
- Не увеличивать без меры размеры карточек; вместо этого — добавлять плотность данных.
- Сохранять визуальный ритм и масштаб типографики через breakpoint tokens, а не ручные хаки.

---

## 7) Final Deliverables Checklist

- [x] Route tree для public части.
- [x] Navigation tree с cross-links.
- [x] Shell logic (header, bottom nav, back, content, safe-area).
- [x] Page hierarchy matrix для каждого route.
- [x] Mobile behavior notes.
- [x] Desktop adaptation notes.
- [x] Без кода, структурированный markdown.
