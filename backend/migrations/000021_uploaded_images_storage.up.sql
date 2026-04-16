CREATE TABLE IF NOT EXISTS uploaded_images (
  id BIGSERIAL PRIMARY KEY,
  mime_type TEXT NOT NULL,
  file_data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploaded_images_created_at ON uploaded_images (created_at DESC);
