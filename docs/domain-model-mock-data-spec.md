# Domain Model + Mock Data Specification
## Football Tournament Frontend (TypeScript-first, UI-agnostic)

## 0) Scope
- Документ определяет **domain entities, типы, связи, моковые данные и repository contracts**.
- UI-код не включен.
- Формат ориентирован на TypeScript domain layer для frontend.

---

## 1) Domain Entities (TypeScript model)

## 1.1 Core enums / value types

```ts
export type ID = string;

export type MatchStatus =
  | 'scheduled'
  | 'live'
  | 'half_time'
  | 'finished'
  | 'postponed'
  | 'cancelled';

export type MatchEventType =
  | 'goal'
  | 'own_goal'
  | 'penalty_goal'
  | 'yellow_card'
  | 'red_card'
  | 'substitution'
  | 'var'
  | 'injury_time'
  | 'period_start'
  | 'period_end';

export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW';

export type FormResult = 'W' | 'D' | 'L';

export type SearchEntityType = 'team' | 'player' | 'match';

export type TournamentStageType =
  | 'group'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'third_place'
  | 'final';
```

## 1.2 Tournament

```ts
export interface Tournament {
  id: ID;
  slug: string; // e.g. "ufl-2026"
  name: string;
  season: string; // "2026"
  country?: string;
  timezone: string; // "UTC" | "Europe/Moscow" etc
  logoUrl: string;
  fallbackLogoUrl: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  stage: TournamentStageType;
  groupLabels: string[]; // ["A", "B"]
  updatedAt: string; // ISO datetime
}
```

## 1.3 Team

```ts
export interface TeamStatsSummary {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface Team {
  id: ID;
  tournamentId: ID;
  name: string;
  shortName: string;
  logoUrl: string | null;
  city: string;
  coach: string;
  group: string; // "A" | "B" | "West" | "East"
  division?: string | null;
  form: FormResult[]; // max 5 last results
  statsSummary: TeamStatsSummary;
}
```

## 1.4 Player

```ts
export interface PlayerStats {
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export interface Player {
  id: ID;
  tournamentId: ID;
  teamId: ID;
  displayName: string;
  number: number;
  position: PlayerPosition;
  age: number;
  avatar: string | null;
  stats: PlayerStats;
}
```

## 1.5 Match + MatchEvent

```ts
export interface MatchScore {
  home: number;
  away: number;
  homePen?: number | null;
  awayPen?: number | null;
}

export interface MatchEvent {
  id: ID;
  matchId: ID;
  minute: number; // 0..130
  type: MatchEventType;
  teamId?: ID;
  playerId?: ID;
  relatedPlayerId?: ID; // for substitutions / assists
  note?: string;
}

export interface Match {
  id: ID;
  tournamentId: ID;
  stage: TournamentStageType;
  round: string; // "Round 3", "Quarter-final 1"
  date: string; // ISO date
  time: string; // HH:mm
  venue: string;
  status: MatchStatus;
  homeTeamId: ID;
  awayTeamId: ID;
  score: MatchScore;
  events: MatchEvent[];
  featured: boolean;
}
```

## 1.6 StandingRow

```ts
export interface StandingRow {
  tournamentId: ID;
  group: string;
  position: number;
  teamId: ID;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}
```

## 1.7 BracketRound + BracketMatch

```ts
export interface BracketRound {
  id: ID;
  tournamentId: ID;
  stage: Exclude<TournamentStageType, 'group'>;
  label: string; // "Quarter-finals"
  order: number; // 1..N
  matchIds: ID[];
}

export interface BracketMatch {
  id: ID;
  tournamentId: ID;
  roundId: ID;
  stage: Exclude<TournamentStageType, 'group'>;
  slot: number; // position in round
  homeTeamId: ID | null;
  awayTeamId: ID | null;
  homeSourceMatchId?: ID | null; // progression source
  awaySourceMatchId?: ID | null;
  winnerTeamId?: ID | null;
  loserTeamId?: ID | null;
  status: MatchStatus;
  date?: string;
  time?: string;
  venue?: string;
  score?: MatchScore;
  linkedMatchId?: ID | null; // optional relation to Match entity
}
```

## 1.8 SearchResult

```ts
export interface SearchResult {
  id: ID; // stable result id
  type: SearchEntityType;
  entityId: ID;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  route: string; // deep link route
  rank: number; // relevance score for sorting
}
```

## 1.9 UserSession

```ts
export interface UserSession {
  isAuthenticated: boolean;
  userId?: ID;
  displayName?: string;
  favoriteTeamId?: ID;
  token?: string; // mock only
  expiresAt?: string; // ISO datetime
}
```

---

## 2) Team Model (field definitions)

| Field | Type | Required | Description | Constraints |
|---|---|---:|---|---|
| id | ID | Yes | Уникальный идентификатор команды | `team_*` pattern recommended |
| name | string | Yes | Полное имя команды | 2..80 chars |
| shortName | string | Yes | Краткое имя для карточек/таблиц | 2..20 chars |
| logoUrl | string \| null | Yes | URL логотипа | может быть `null` |
| city | string | Yes | Город команды | 2..60 chars |
| coach | string | Yes | Главный тренер | 2..80 chars |
| group | string | Yes | Группа турнира | e.g. A/B |
| division | string \| null | No | Дивизион (если есть) | optional |
| form | FormResult[] | Yes | Последние результаты | длина 0..5 |
| statsSummary | TeamStatsSummary | Yes | Суммарные показатели | синхронизируются со standings |

---

## 3) Player Model (field definitions)

| Field | Type | Required | Description | Constraints |
|---|---|---:|---|---|
| id | ID | Yes | Идентификатор игрока | `player_*` pattern recommended |
| teamId | ID | Yes | Ссылка на Team | должен существовать в teams |
| displayName | string | Yes | Отображаемое имя | 2..80 chars |
| number | number | Yes | Игровой номер | 1..99 |
| position | PlayerPosition | Yes | Позиция | GK/DF/MF/FW |
| age | number | Yes | Возраст | 15..45 |
| avatar | string \| null | Yes | URL аватара | может быть `null` |
| stats | PlayerStats | Yes | Ключевая статистика | non-negative numbers |

---

## 4) Match Model (field definitions)

| Field | Type | Required | Description | Constraints |
|---|---|---:|---|---|
| id | ID | Yes | Идентификатор матча | `match_*` |
| round | string | Yes | Раунд внутри стадии | e.g. Round 2 |
| date | string | Yes | Дата | ISO date |
| time | string | Yes | Время начала | HH:mm |
| venue | string | Yes | Стадион/арена | 2..120 chars |
| status | MatchStatus | Yes | Статус матча | enum |
| homeTeamId | ID | Yes | Домашняя команда | team must exist |
| awayTeamId | ID | Yes | Гостевая команда | team must exist, != home |
| score | MatchScore | Yes | Счет | 0+; for scheduled `0:0` allowed with status context |
| events | MatchEvent[] | Yes | Хронология событий | `minute` ascending |
| featured | boolean | Yes | Флаг “главного” матча | max 1 featured per date recommended |

### Match consistency invariants
1. Если `status = scheduled` → events обычно пустой массив.
2. Если `status in [live, half_time, finished]` → score должен соответствовать goal events.
3. Penalty score присутствует только для knockout/finished при необходимости.

---

## 5) Standings Model

Поля уже заложены в `StandingRow` и обязательны:
- `position`
- `teamId`
- `played`
- `won`
- `drawn`
- `lost`
- `goalsFor`
- `goalsAgainst`
- `goalDiff`
- `points`

### Formula invariants
1. `played = won + drawn + lost`
2. `goalDiff = goalsFor - goalsAgainst`
3. `points = won*3 + drawn`
4. `position` уникален внутри `(tournamentId, group)`

---

## 6) Bracket Model (critical)

## 6.1 Data structure logic
- `rounds[]` описывает метаданные раундов и порядок отображения.
- `bracketMatches[]` описывает конкретные слоты матчей в раундах.
- `winnerTeamId` в матче используется для progression в следующий раунд.

## 6.2 Round labels
Рекомендуемые labels:
- Round of 16
- Quarter-finals
- Semi-finals
- Third place
- Final

## 6.3 Participating teams
- На ранних стадиях `homeTeamId/awayTeamId` могут быть `null`, если участник еще не определен.
- В таком случае источник задается через `homeSourceMatchId/awaySourceMatchId`.

## 6.4 Winner progression
- Каждый BracketMatch может ссылаться на source match IDs.
- При завершении source-match `winnerTeamId` подставляется в нужный слот следующего round.
- Для third-place матча можно использовать `loserTeamId` progression из полуфиналов.

## 6.5 Bracket statuses
- Поддерживаются те же `MatchStatus` для единообразия.
- `linkedMatchId` связывает bracket матч с основным Match доменом (для detail route).

### Bracket consistency invariants
1. `round.order` возрастает без пропусков.
2. `slot` уникален внутри round.
3. `winnerTeamId` должен быть либо `homeTeamId`, либо `awayTeamId` (когда обе известны).
4. Если есть `linkedMatchId`, то статусы и счет между BracketMatch и Match синхронизированы.

---

## 7) Relationships (ER-style)

- `Tournament 1 -> N Team`
- `Tournament 1 -> N Player`
- `Team 1 -> N Player`
- `Tournament 1 -> N Match`
- `Match 1 -> N MatchEvent`
- `Tournament 1 -> N StandingRow`
- `Tournament 1 -> N BracketRound`
- `BracketRound 1 -> N BracketMatch`
- `BracketMatch 0..1 -> 1 Match` (via `linkedMatchId`)

### Navigation-critical links
- Match references Team + Player via events.
- StandingRow references Team.
- BracketMatch references Team and optionally Match.
- SearchResult references Team/Player/Match by `entityId`.

---

## 8) Mock Data Specification

## 8.1 Realism requirements
- Имена команд/игроков должны выглядеть правдоподобно и быть уникальными в контексте турнира.
- Времена матчей согласованы по timezone турнира.
- Результаты матчей реалистичны (не случайные экстремумы без причины).

## 8.2 Cross-page consistency rules
1. Team в matches = team в standings = team в bracket (тот же `teamId`).
2. Player `teamId` всегда соответствует команде на Team Details.
3. Match score и events не противоречат друг другу.
4. Standings агрегаты согласованы с завершенными матчами (в рамках мок-объема).
5. Bracket winners согласованы с результатами linked matches.

## 8.3 Data volume baseline (MVP)
- Teams: 8–16
- Players: 18–28 на команду
- Matches: 24+ (group + knockout)
- Standings rows: по числу команд на группу
- Bracket rounds: минимум 3 (QF/SF/F)

## 8.4 Mock scenarios (required)
- Scheduled match.
- Live match с событиями.
- Finished match с полным списком ключевых событий.
- Team без logoUrl (fallback проверка).
- Search пустой результат.
- Bracket матч с TBD участником.

## 8.5 Deterministic mock generation
- Использовать фиксированный seed (если генерация автоматическая).
- IDs должны быть стабильными между перезапусками.
- Даты/статусы должны обновляться контролируемо (через mock clock, если нужен live-demo).

---

## 9) Fallback Logo Strategy

## 9.1 Problem
`logoUrl` может отсутствовать/быть недоступным. Нужен единый deterministic fallback.

## 9.2 Rules
1. Если `team.logoUrl` валиден → использовать его.
2. Если `team.logoUrl` отсутствует/null/error → использовать `tournament.fallbackLogoUrl`.
3. Если tournament logo тоже недоступен → использовать локальный asset `default-team-mark.svg`.

## 9.3 Helper contract

```ts
export interface LogoResolverInput {
  teamLogoUrl: string | null;
  tournamentLogoUrl: string | null;
  localDefaultLogoUrl: string;
}

export function resolveTeamLogo(input: LogoResolverInput): string;
```

### Helper behavior
- Pure function, без side effects.
- Не зависит от UI framework.
- Может использоваться во всех репозиториях/мапперах перед отдачей в UI слой.

---

## 10) Repository Abstraction (mock contracts)

## 10.1 Read-only repository interfaces

```ts
export interface TeamsRepository {
  getTeams(params?: { group?: string; query?: string }): Promise<Team[]>;
  getTeamById(teamId: ID): Promise<Team | null>;
}

export interface PlayersRepository {
  getPlayers(params?: {
    teamId?: ID;
    position?: PlayerPosition;
    query?: string;
  }): Promise<Player[]>;
  getPlayerById(playerId: ID): Promise<Player | null>;
}

export interface MatchesRepository {
  getMatches(params?: {
    date?: string;
    stage?: TournamentStageType;
    status?: MatchStatus;
    teamId?: ID;
  }): Promise<Match[]>;
  getMatchById(matchId: ID): Promise<Match | null>;
}

export interface StandingsRepository {
  getStandings(params?: { group?: string }): Promise<StandingRow[]>;
}

export interface BracketRepository {
  getBracket(): Promise<{
    rounds: BracketRound[];
    matches: BracketMatch[];
  }>;
}

export interface SearchRepository {
  searchAll(query: string): Promise<SearchResult[]>;
}
```

## 10.2 Required methods mapping
- `getTeams`
- `getTeamById`
- `getPlayers`
- `getPlayerById`
- `getMatches`
- `getMatchById`
- `getStandings`
- `getBracket`
- `searchAll`

## 10.3 Repository behavior rules
1. Всегда возвращать Promise (API-ready abstraction).
2. Ошибки мокируются контролируемо (например `simulateError?: boolean` в internal config).
3. Методы не мутируют исходный mock dataset.
4. Сортировка результатов стабильна и предсказуема.
5. Поиск регистронезависимый, prefix + contains matching.

---

## 11) Data Validation Checklist (for mock authors)

Перед публикацией мок-набора проверить:
1. Все внешние ссылки (`teamId`, `playerId`, `matchId`, `roundId`) валидны.
2. Нет orphan entities.
3. Формулы standings соблюдены.
4. События матчей согласованы со счетом.
5. Bracket progression корректен.
6. Поиск возвращает корректные deep-link routes.
7. Fallback logo путь работает при пустом logoUrl.

---

## 12) Deliverable
- Этот документ является source-of-truth для domain layer и mock repositories на frontend.
- Может быть напрямую использован для создания `types.ts`, `mock-data/*.json` и `repositories/mock/*.ts`.
- UI-слой получает уже консистентные и нормализованные модели.
