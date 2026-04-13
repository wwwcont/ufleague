# Backend cleanup plan after playoff-grid rollout

1. Remove `GET /api/bracket` and `GetBracket` handler from `internal/transport/http/router.go`.
2. Remove legacy `BracketResponse`, `BracketRound`, `BracketMatch` structs from `internal/domain/public_data.go`.
3. Remove `stage_slot_column`/`stage_slot_row` from `domain.Match`, match requests, and tournament repository SQL.
4. Drop legacy migrations/data seeds related to stage-slot positioning (`000010_*`, `000013_*`) with a new forward migration dropping columns/indexes in active DBs.
5. Delete frontend/backend contracts that depend on stage/group/slot abstractions once clients consume `/api/playoff-grid/{tournamentId}` and admin playoff-grid endpoints only.
