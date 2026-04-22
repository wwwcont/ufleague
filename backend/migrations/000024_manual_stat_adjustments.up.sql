CREATE TABLE IF NOT EXISTS manual_stat_adjustments (
  id BIGSERIAL PRIMARY KEY,
  tournament_cycle_id BIGINT NOT NULL REFERENCES tournament_cycles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('team', 'player')),
  entity_id BIGINT NOT NULL,
  field TEXT NOT NULL,
  delta INTEGER NOT NULL,
  author_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_stat_adjustments_tournament_entity
  ON manual_stat_adjustments (tournament_cycle_id, entity_type, entity_id);
