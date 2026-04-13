-- Add per-position scoring to reviews
-- position_scores: { [positionId]: { experience: N, essay: N, leadership: N, fit: N } }
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS position_scores jsonb DEFAULT '{}'::jsonb;
