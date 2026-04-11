-- =============================================================
-- Migration: Allow edits for submitted applications (before deadline)
-- PR #9 changed the frontend to lock based on deadline, not submission.
-- The RLS policies still required status = 'draft', silently blocking
-- saves for submitted applications. Relax to allow both draft + submitted.
-- =============================================================

-- ===================== RESPONSES =====================
DROP POLICY IF EXISTS "Users can insert own responses" ON public.responses;
DROP POLICY IF EXISTS "Users can update own responses" ON public.responses;

CREATE POLICY "Users can insert own responses"
  ON public.responses FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE id = application_id AND user_id = auth.uid() AND status IN ('draft', 'submitted')
    )
  );

CREATE POLICY "Users can update own responses"
  ON public.responses FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE id = application_id AND user_id = auth.uid() AND status IN ('draft', 'submitted')
    )
  );

-- ===================== ACTIVITIES =====================
DROP POLICY IF EXISTS "Users can insert own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can delete own activities" ON public.activities;

CREATE POLICY "Users can insert own activities"
  ON public.activities FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE user_id = auth.uid() AND status IN ('draft', 'submitted')
    )
  );

CREATE POLICY "Users can update own activities"
  ON public.activities FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE user_id = auth.uid() AND status IN ('draft', 'submitted')
    )
  );

CREATE POLICY "Users can delete own activities"
  ON public.activities FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE user_id = auth.uid() AND status IN ('draft', 'submitted')
    )
  );

-- ===================== HONORS =====================
DROP POLICY IF EXISTS "Users can insert own honors" ON public.honors;
DROP POLICY IF EXISTS "Users can update own honors" ON public.honors;
DROP POLICY IF EXISTS "Users can delete own honors" ON public.honors;

CREATE POLICY "Users can insert own honors"
  ON public.honors FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE user_id = auth.uid() AND status IN ('draft', 'submitted')
    )
  );

CREATE POLICY "Users can update own honors"
  ON public.honors FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE user_id = auth.uid() AND status IN ('draft', 'submitted')
    )
  );

CREATE POLICY "Users can delete own honors"
  ON public.honors FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE user_id = auth.uid() AND status IN ('draft', 'submitted')
    )
  );

-- ===================== APPLICATION_POSITIONS =====================
DROP POLICY IF EXISTS "Users can insert own application_positions" ON public.application_positions;
DROP POLICY IF EXISTS "Users can delete own application_positions" ON public.application_positions;
DROP POLICY IF EXISTS "Users can update own application_positions" ON public.application_positions;

CREATE POLICY "Users can insert own application_positions"
  ON public.application_positions FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE id = application_id AND user_id = auth.uid() AND status IN ('draft', 'submitted')
    )
  );

CREATE POLICY "Users can delete own application_positions"
  ON public.application_positions FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE id = application_id AND user_id = auth.uid() AND status IN ('draft', 'submitted')
    )
  );

CREATE POLICY "Users can update own application_positions"
  ON public.application_positions FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE id = application_id AND user_id = auth.uid() AND status IN ('draft', 'submitted')
    )
  );
