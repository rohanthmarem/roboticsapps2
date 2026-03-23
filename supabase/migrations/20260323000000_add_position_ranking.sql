-- =============================================================
-- Migration: Add position ranking/preference to application_positions
-- Allows applicants to specify their preference order for positions.
-- Backward compatible: assigns random default ranks to existing rows.
-- =============================================================

-- 1. Add nullable position_rank column
ALTER TABLE public.application_positions ADD COLUMN IF NOT EXISTS position_rank integer;

-- 2. Assign sequential ranks (random order) to existing rows per application
WITH ranked AS (
  SELECT id, application_id,
    ROW_NUMBER() OVER (PARTITION BY application_id ORDER BY random()) AS rn
  FROM public.application_positions
)
UPDATE public.application_positions ap
SET position_rank = ranked.rn
FROM ranked
WHERE ap.id = ranked.id;

-- 3. Allow users to update their own draft application_positions (for ranking)
-- This policy is safe: users can only update positions on their own draft applications.
CREATE POLICY "Users can update own draft application_positions"
  ON public.application_positions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE id = application_id AND user_id = auth.uid() AND status = 'draft'
    )
  );
