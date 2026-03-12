ALTER TABLE wish_reservations
  ADD COLUMN IF NOT EXISTS guest_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_wish_reservations_guest_session_id
  ON wish_reservations(guest_session_id);
