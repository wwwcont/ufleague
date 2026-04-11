# Tournament / Bracket Domain Model (Foundation)

## Why
Эта схема разделяет сущности турнира, сетки, стадии, пары и матчей, чтобы backend и admin UI не смешивали разные уровни домена.

## Core entities

- **TournamentAggregate**
  - `id`, `name`, `bracketSize`, `isActive`
  - Только один турнир может быть активным одновременно.

- **TournamentBracketStage**
  - принадлежит турниру (`tournamentId`)
  - имеет код стадии `BracketStageCode`: `R16`, `R8`, `R4`, `SF`, `F`
  - описывает уровень сетки, а не матч.

- **TournamentBracketTie**
  - принадлежит стадии (`stageId`) и турниру (`tournamentId`)
  - представляет **пару** (slot) в стадии
  - может иметь один или несколько матчей (`legsPlanned`)
  - может хранить `aggregateScore` для двухматчевых противостояний.

- **Match**
  - самостоятельная сущность матча
  - привязка к паре выполняется через `tieRelation` (`tieId`, `legNumber`)
  - таким образом не смешиваются match-level и tie-level данные.

- **TournamentStandingsContext**
  - контекст таблицы для конкретного турнира и (опционально) стадии.

## Contract foundations added

- Tournament admin:
  - create tournament
  - set active tournament
  - update bracket settings

- Bracket admin:
  - create tie/slot
  - attach match to tie

## Terminology rule

В новом foundation используется:
- `stage` — стадия сетки
- `tie` / `slot` — пара внутри стадии
- `match` — отдельный матч (leg)

Слово `tour` не используется как универсальный термин для stage/tie.
