CREATE TABLE IF NOT EXISTS event_feed_items (
    id BIGSERIAL PRIMARY KEY,
    scope_type TEXT NOT NULL,
    scope_id BIGINT,
    author_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    visibility TEXT NOT NULL DEFAULT 'public',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CHECK (scope_type IN ('global', 'team', 'player', 'match')),
    CHECK ((scope_type = 'global' AND scope_id IS NULL) OR (scope_type <> 'global' AND scope_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_event_feed_items_scope ON event_feed_items(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_event_feed_items_created ON event_feed_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_feed_items_author ON event_feed_items(author_user_id);
CREATE INDEX IF NOT EXISTS idx_event_feed_items_not_deleted ON event_feed_items(deleted_at);
