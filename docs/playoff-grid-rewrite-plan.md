# Playoff Grid Rewrite (Hard Replacement Plan)

## 0) Scope and non-goals

This is a **hard replacement** of the legacy bracket system.

- Do **not** reuse `stages`, `groups`, `slot`, auto-stage positioning, or connector-generation-by-round assumptions.
- New feature is modeled as a free-positioned (but bounded) **35x35 playoff grid** with explicit cells and explicit lines.
- Compatibility layers are intentionally avoided.

---

## 1) New backend schema (PostgreSQL)

### 1.1 Table: `playoff_cells`

```sql
CREATE TABLE playoff_cells (
  id BIGSERIAL PRIMARY KEY,
  home_team_id BIGINT NULL REFERENCES teams(id) ON DELETE SET NULL,
  away_team_id BIGINT NULL REFERENCES teams(id) ON DELETE SET NULL,
  col INT NOT NULL CHECK (col BETWEEN 1 AND 35),
  row INT NOT NULL CHECK (row BETWEEN 1 AND 35),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (col, row)
);
```

Notes:
- `UNIQUE(col,row)` guarantees one playoff block per grid coordinate.
- Team links are nullable to allow TBD cells during planning.

### 1.2 Match linkage (explicit one-to-many with cap 3)

Use a direct FK in `matches`:

```sql
ALTER TABLE matches
  ADD COLUMN playoff_cell_id BIGINT NULL REFERENCES playoff_cells(id) ON DELETE SET NULL;

CREATE INDEX idx_matches_playoff_cell_id ON matches(playoff_cell_id);
```

Constraint policy:
- Hard cap `<=3` attachments per playoff cell must be enforced at write-time in service layer (and optionally DB trigger).
- A match belongs to **at most one** playoff cell by design of single nullable FK.

### 1.3 Table: `playoff_lines`

```sql
CREATE TABLE playoff_lines (
  id BIGSERIAL PRIMARY KEY,
  from_playoff_id BIGINT NOT NULL REFERENCES playoff_cells(id) ON DELETE CASCADE,
  to_playoff_id BIGINT NOT NULL REFERENCES playoff_cells(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_playoff_id, to_playoff_id),
  CHECK (from_playoff_id <> to_playoff_id)
);
```

Notes:
- `ON DELETE CASCADE` keeps lines clean when a cell is removed.
- Direction is retained (`from` -> `to`) for deterministic rendering anchors.

### 1.4 Optional integrity trigger (recommended)

Add trigger on `matches.playoff_cell_id` update/insert:
- reject assignment if target cell already has 3 matches.

---

## 2) New API contracts (replacement API, no stage/group vocabulary)

## 2.1 Public read API

### `GET /api/playoff-grid`

Response:

```json
{
  "board": { "cols": 35, "rows": 35 },
  "cells": [
    {
      "id": 101,
      "home_team_id": 1,
      "away_team_id": 2,
      "col": 7,
      "row": 12,
      "attached_match_ids": [501, 502]
    }
  ],
  "lines": [
    { "id": 9001, "from_playoff_id": 101, "to_playoff_id": 130 }
  ]
}
```

Server responsibilities:
- return cell + line graph in one payload.
- include `attached_match_ids` sorted by match date ascending (deterministic UI).

## 2.2 Admin save API (atomic draft commit)

### `PUT /api/admin/playoff-grid`

Request (full snapshot commit):

```json
{
  "cells": [
    {
      "id": 101,
      "home_team_id": 1,
      "away_team_id": 2,
      "col": 7,
      "row": 12,
      "attached_match_ids": [501, 502]
    },
    {
      "id": null,
      "home_team_id": 3,
      "away_team_id": 4,
      "col": 8,
      "row": 12,
      "attached_match_ids": []
    }
  ],
  "lines": [
    { "id": 9001, "from_playoff_id": 101, "to_playoff_id": 130 },
    { "id": null, "from_client_key": "tmpA", "to_client_key": "tmpB" }
  ]
}
```

Behavior:
- Transactionally replace canonical grid state (upsert cells + remap matches + upsert lines + delete missing rows).
- Validate:
  - `col,row` in range and unique.
  - all line endpoints exist.
  - `attached_match_ids.length <= 3`.
  - each match attached once globally.
  - attached match teams are same pair as cell teams (order-independent).

Response:
```json
{
  "ok": true,
  "cells": [{ "id": 101, "client_key": "tmpA" }],
  "lines": [{ "id": 9002, "client_key": "tmpL1" }]
}
```

## 2.3 Match attachment helper APIs (admin match page)

### `GET /api/admin/matches/{matchId}/playoff-candidates`
Returns cells where teams match `{home,away}` order-independently and current attachment count < 3.

### `POST /api/admin/matches/{matchId}/attach-playoff`
Body:
```json
{ "playoff_cell_id": 101 }
```

### `POST /api/admin/matches/{matchId}/detach-playoff`
Body optional/empty.

Rule enforcement:
- reattach overwrites previous `matches.playoff_cell_id`.
- if target cell full (3), return 409.

---

## 3) Frontend state model (clean-room)

## 3.1 Domain types

- `PlayoffCellVM`
  - `id?: number`
  - `clientKey: string` (always present client-side)
  - `homeTeamId: string | null`
  - `awayTeamId: string | null`
  - `col: number` (1..35)
  - `row: number` (1..35)
  - `attachedMatchIds: string[]` (0..3)

- `PlayoffLineVM`
  - `id?: number`
  - `clientKey: string`
  - `fromCellKey: string`
  - `toCellKey: string`

- `PlayoffEditorState`
  - `persisted: { cellsByKey, linesByKey }` (last server snapshot)
  - `draft: { cellsByKey, linesByKey }` (mutable)
  - `uiMode: 'navigation' | 'movement' | 'lines'`
  - `history: DraftPatch[]` (undo stack)
  - `viewport: { scale, panX, panY }`
  - `dirty: boolean`

## 3.2 Interaction model

- **Линии** mode: tap source cell -> tap target cell to create/remove line.
- **Навигация** mode: drag background pans only; no cell movement.
- **Движение** mode: drag selected cell to another grid coord (snap to integer col/row).
- **Отмена**: pop and apply reverse patch from `history`.
- **Сохранить**: serialize `draft` and call `PUT /api/admin/playoff-grid`.

All edits are client-only until `Сохранить`.

## 3.3 Rendering rules implementation

- Render strict 35x35 board background first.
- Place cells by exact `(col,row)` mapping.
- Build endpoint coordinates from rendered cell rects and draw lines.
- Score block:
  - 1 match -> one score row.
  - 2/3 matches -> each leg score + aggregate.
  - If all attached matches finished -> emphasize aggregate winner.

---

## 4) Legacy code paths to delete after migration

Backend:
- bracket response composition from stage/slot fields in `GetBracket`. 
- `stage_slot_column` / `stage_slot_row` in domain match structs and CRUD SQL.
- migrations introducing `stage_slot_*` fields.

Frontend:
- `BracketView` component and all stage/slot placeholder layout math.
- `useBracket` hook and `bracketRepository.getBracket()` path.
- Table page bracket mode tied to stage/group abstractions.
- bracket mock data/repository fixtures and `/bracket` route fallback behavior.

Repository/domain contracts:
- `Bracket*` DTOs and repository contracts (`BracketStage`, `BracketMatchGroup`, bracket admin tie APIs).

Important: delete only **after** new playoff grid endpoints/UI are live and switched.

---

## 5) Phased implementation plan

## Phase 1 — DB + backend domain skeleton
1. Add migrations for `playoff_cells`, `playoff_lines`, `matches.playoff_cell_id`.
2. Add repository methods: list cells, list lines, transactional save snapshot, candidate lookup.
3. Add HTTP handlers:
   - `GET /api/playoff-grid`
   - `PUT /api/admin/playoff-grid`
   - match candidate/attach/detach endpoints.
4. Add integration tests for invariants (unique coordinate, max 3 matches, line endpoints exist).

## Phase 2 — frontend read-only viewer
1. Introduce new types/hooks/repository (`usePlayoffGrid`, `playoffGridRepository`).
2. Build renderer based on 35x35 coordinates + explicit lines.
3. Implement score/aggregate/winner highlighting rules from attached matches.
4. Wire into table page (or dedicated playoff route), behind feature flag if needed.

## Phase 3 — frontend editor + draft workflow
1. Add edit toolbar: `Линии`, `Навигация`, `Движение`, `Отмена`, `Сохранить`.
2. Implement draft store + undo stack + dirty-state guard.
3. Implement pan clamp and mobile pinch zoom.
4. Save atomically through `PUT /api/admin/playoff-grid` only.
5. Cancel action -> confirmation modal -> discard draft.

## Phase 4 — match admin integration
1. Add yellow button `Добавить плейофф` on admin match page.
2. Modal loads candidates by team pair (order-independent).
3. Attach/detach endpoints wired with optimistic refresh.
4. Enforce max-3 and uniqueness constraints with clear error messages.

## Phase 5 — hard cleanup of legacy bracket system
1. Remove old backend bracket route/handlers and stage-slot fields.
2. Remove old frontend `BracketView`, `useBracket`, mocks, contracts, docs references.
3. Drop obsolete migrations/columns (or create forward migration dropping legacy columns).
4. Remove `/bracket` routing/fallback behavior if no longer needed.
5. Final pass: search for `stage`, `slot`, `Bracket` abstractions and delete dead code.

---

## 6) Opinionated decisions

- Prefer a **single atomic save endpoint** over granular mutation endpoints.
- Keep line semantics explicit (`from_playoff_id`, `to_playoff_id`) and never inferred from geometry.
- Keep attachment truth in `matches.playoff_cell_id`, not in join tables, because cardinality is strictly many-to-one with small cap.
- No backward compatibility adapter around stage/group APIs; switch consumers to new contracts directly.
