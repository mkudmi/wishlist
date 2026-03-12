CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'My Wishlist',
  celebration_type TEXT NOT NULL DEFAULT 'birthday',
  custom_celebration TEXT,
  event_date DATE,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wishlists_owner_id ON wishlists(owner_id);

ALTER TABLE wishes ADD COLUMN IF NOT EXISTS wishlist_id UUID REFERENCES wishlists(id) ON DELETE CASCADE;
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS tag TEXT NOT NULL DEFAULT 'Без категории';
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS price TEXT NOT NULL DEFAULT '';
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS url TEXT NOT NULL DEFAULT '';
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_wishes_wishlist_id ON wishes(wishlist_id);

CREATE TABLE IF NOT EXISTS wish_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wish_id UUID NOT NULL REFERENCES wishes(id) ON DELETE CASCADE,
  wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  contributor_name TEXT NOT NULL,
  contributor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wish_reservations_wish_id ON wish_reservations(wish_id);
CREATE INDEX IF NOT EXISTS idx_wish_reservations_wishlist_id ON wish_reservations(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wish_reservations_user_id ON wish_reservations(contributor_user_id);
