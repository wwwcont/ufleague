CREATE TABLE IF NOT EXISTS playoff_bracket_stages (
    id BIGSERIAL PRIMARY KEY,
    bracket_id BIGINT NOT NULL REFERENCES playoff_brackets(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    stage_order INT NOT NULL,
    stage_size INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (bracket_id, stage_order),
    UNIQUE (bracket_id, code)
);

CREATE TABLE IF NOT EXISTS playoff_bracket_ties (
    id BIGSERIAL PRIMARY KEY,
    bracket_id BIGINT NOT NULL REFERENCES playoff_brackets(id) ON DELETE CASCADE,
    stage_id BIGINT NOT NULL REFERENCES playoff_bracket_stages(id) ON DELETE CASCADE,
    slot INT NOT NULL,
    home_team_id BIGINT NULL REFERENCES teams(id) ON DELETE SET NULL,
    away_team_id BIGINT NULL REFERENCES teams(id) ON DELETE SET NULL,
    winner_team_id BIGINT NULL REFERENCES teams(id) ON DELETE SET NULL,
    legs_planned INT NOT NULL DEFAULT 1,
    admin_locked_winner BOOLEAN NOT NULL DEFAULT FALSE,
    stage_slot_column INT NULL,
    stage_slot_row INT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (stage_id, slot)
);

CREATE TABLE IF NOT EXISTS playoff_bracket_tie_matches (
    id BIGSERIAL PRIMARY KEY,
    tie_id BIGINT NOT NULL REFERENCES playoff_bracket_ties(id) ON DELETE CASCADE,
    match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    leg_number INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tie_id, leg_number),
    UNIQUE (match_id)
);

CREATE TABLE IF NOT EXISTS playoff_bracket_layout_nodes (
    id BIGSERIAL PRIMARY KEY,
    bracket_id BIGINT NOT NULL REFERENCES playoff_brackets(id) ON DELETE CASCADE,
    node_type TEXT NOT NULL,
    node_id BIGINT NOT NULL,
    x INT NULL,
    y INT NULL,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by BIGINT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (bracket_id, node_type, node_id)
);

DROP TABLE IF EXISTS playoff_grid_lines;
DROP TABLE IF EXISTS playoff_grid_ties;
