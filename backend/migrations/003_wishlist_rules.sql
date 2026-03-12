CREATE TABLE IF NOT EXISTS wishlist_rules (
  wishlist_id UUID PRIMARY KEY REFERENCES wishlists(id) ON DELETE CASCADE,
  rules TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_wishlist_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wishlist_rules_updated_at ON wishlist_rules;
CREATE TRIGGER trg_wishlist_rules_updated_at
BEFORE UPDATE ON wishlist_rules
FOR EACH ROW
EXECUTE FUNCTION set_wishlist_rules_updated_at();
