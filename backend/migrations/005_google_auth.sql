ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique_idx
  ON users (google_id)
  WHERE google_id IS NOT NULL;
