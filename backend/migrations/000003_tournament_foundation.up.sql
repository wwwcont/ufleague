CREATE TABLE IF NOT EXISTS teams (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    socials JSONB NOT NULL DEFAULT '{}'::jsonb,
    captain_user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    nickname TEXT,
    avatar_url TEXT,
    socials JSONB NOT NULL DEFAULT '{}'::jsonb,
    position TEXT,
    shirt_number INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
    id BIGSERIAL PRIMARY KEY,
    home_team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    away_team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    start_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    home_score INT NOT NULL DEFAULT 0,
    away_score INT NOT NULL DEFAULT 0,
    extra_time JSONB NOT NULL DEFAULT '{}'::jsonb,
    venue TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (home_team_id <> away_team_id)
);

CREATE INDEX IF NOT EXISTS idx_teams_captain ON teams(captain_user_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_start_at ON matches(start_at);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
