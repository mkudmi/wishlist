DELETE FROM user_identities
WHERE provider = 'google';

DROP INDEX IF EXISTS users_google_id_unique_idx;

ALTER TABLE users
DROP COLUMN IF EXISTS google_id;
