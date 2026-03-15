CREATE TABLE IF NOT EXISTS user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_email TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user_id ON user_identities(user_id);

INSERT INTO user_identities (user_id, provider, provider_user_id, provider_email, email_verified)
SELECT id, 'google', google_id, email, TRUE
FROM users
WHERE google_id IS NOT NULL
ON CONFLICT (provider, provider_user_id) DO NOTHING;

INSERT INTO user_identities (user_id, provider, provider_user_id, provider_email, email_verified)
SELECT id, 'yandex', yandex_id, email, email IS NOT NULL
FROM users
WHERE yandex_id IS NOT NULL
ON CONFLICT (provider, provider_user_id) DO NOTHING;
