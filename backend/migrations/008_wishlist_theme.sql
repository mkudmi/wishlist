ALTER TABLE wishlists
ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'sand';

UPDATE wishlists
SET theme = 'sand'
WHERE theme IS NULL OR theme = '';
