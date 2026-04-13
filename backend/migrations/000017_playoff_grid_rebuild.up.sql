CREATE TABLE IF NOT EXISTS playoff_grid_ties (
    id BIGSERIAL PRIMARY KEY,
    bracket_id BIGINT NOT NULL REFERENCES playoff_brackets(id) ON DELETE CASCADE,
    home_team_id BIGINT NULL REFERENCES teams(id) ON DELETE SET NULL,
    away_team_id BIGINT NULL REFERENCES teams(id) ON DELETE SET NULL,
    grid_col INT NOT NULL DEFAULT 1 CHECK (grid_col BETWEEN 1 AND 35),
    grid_row INT NOT NULL DEFAULT 1 CHECK (grid_row BETWEEN 1 AND 35),
    match_id_1 BIGINT NULL REFERENCES matches(id) ON DELETE SET NULL,
    match_id_2 BIGINT NULL REFERENCES matches(id) ON DELETE SET NULL,
    match_id_3 BIGINT NULL REFERENCES matches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playoff_grid_lines (
    id BIGSERIAL PRIMARY KEY,
    bracket_id BIGINT NOT NULL REFERENCES playoff_brackets(id) ON DELETE CASCADE,
    from_tie_id BIGINT NOT NULL REFERENCES playoff_grid_ties(id) ON DELETE CASCADE,
    to_tie_id BIGINT NOT NULL REFERENCES playoff_grid_ties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (bracket_id, from_tie_id, to_tie_id)
);

DROP TABLE IF EXISTS playoff_bracket_layout_nodes;
DROP TABLE IF EXISTS playoff_bracket_tie_matches;
DROP TABLE IF EXISTS playoff_bracket_ties;
DROP TABLE IF EXISTS playoff_bracket_stages;
