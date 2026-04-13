-- Add shared team ranking note to each application-position pair
ALTER TABLE application_positions
  ADD COLUMN IF NOT EXISTS ranking_note text;
