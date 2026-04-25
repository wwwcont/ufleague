CREATE TABLE IF NOT EXISTS playoff_text_blocks (
    id BIGSERIAL PRIMARY KEY,
    tournament_cycle_id BIGINT NOT NULL REFERENCES tournament_cycles(id) ON DELETE CASCADE,
    col INT NOT NULL,
    row INT NOT NULL,
    width_cells INT NOT NULL DEFAULT 1,
    height_cells INT NOT NULL DEFAULT 1,
    text TEXT NOT NULL DEFAULT '',
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    show_background BOOLEAN NOT NULL DEFAULT TRUE,
    align TEXT NOT NULL DEFAULT 'left',
    vertical_align TEXT NOT NULL DEFAULT 'top',
    font TEXT NOT NULL DEFAULT 'inter',
    font_size INT NOT NULL DEFAULT 14,
    bold BOOLEAN NOT NULL DEFAULT FALSE,
    italic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_playoff_text_blocks_bounds CHECK (
      col BETWEEN 1 AND 35
      AND row BETWEEN 1 AND 35
      AND width_cells BETWEEN 1 AND 8
      AND height_cells BETWEEN 1 AND 6
      AND font_size BETWEEN 10 AND 56
    ),
    CONSTRAINT chk_playoff_text_blocks_align CHECK (align IN ('left','center','right')),
    CONSTRAINT chk_playoff_text_blocks_vertical_align CHECK (vertical_align IN ('top','center','bottom')),
    CONSTRAINT chk_playoff_text_blocks_font CHECK (font IN ('inter','roboto','ptsans'))
);

CREATE INDEX IF NOT EXISTS idx_playoff_text_blocks_cycle ON playoff_text_blocks(tournament_cycle_id);
