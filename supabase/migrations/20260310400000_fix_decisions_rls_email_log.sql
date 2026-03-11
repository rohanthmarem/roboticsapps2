-- =============================================================
-- Fix decisions RLS + add email_log for email send tracking
-- =============================================================
-- Root cause of bug: migration 20260310100000 renamed decisions.application_id
-- to decisions.application_position_id but did NOT update RLS policies.
-- All policies still reference the non-existent application_id column,
-- causing ALL applicant reads/updates on decisions to fail silently.

-- ===================== FIX DECISIONS RLS =====================
DROP POLICY IF EXISTS "Users can view own decisions" ON public.decisions;
DROP POLICY IF EXISTS "Users can update own decisions" ON public.decisions;
DROP POLICY IF EXISTS "Users can update own decisions read status" ON public.decisions;
DROP POLICY IF EXISTS "Admins can manage decisions" ON public.decisions;
DROP POLICY IF EXISTS "Admins can view all decisions" ON public.decisions;
DROP POLICY IF EXISTS "Admins can select decisions" ON public.decisions;
DROP POLICY IF EXISTS "Admins can insert decisions" ON public.decisions;
DROP POLICY IF EXISTS "Admins can update decisions" ON public.decisions;

-- Recreate policies with correct column name (application_position_id)
CREATE POLICY "Users can view own decisions"
  ON public.decisions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.application_positions ap
      JOIN public.applications a ON a.id = ap.application_id
      WHERE ap.id = application_position_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own decisions"
  ON public.decisions FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.application_positions ap
      JOIN public.applications a ON a.id = ap.application_id
      WHERE ap.id = application_position_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all decisions"
  ON public.decisions FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert decisions"
  ON public.decisions FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update decisions"
  ON public.decisions FOR UPDATE USING (public.is_admin());

-- ===================== EMAIL LOG TABLE =====================
-- Tracks which transactional emails have been sent to each user.
-- Prevents re-sending interview invitations or portal-release notifications.
-- type: 'interview' | 'decisions_released'
-- context_key: application_id string for 'interview'; '' for 'decisions_released'
CREATE TABLE IF NOT EXISTS public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('interview', 'decisions_released')),
  context_key text NOT NULL DEFAULT '',
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, context_key)
);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email_log"
  ON public.email_log FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view own email_log"
  ON public.email_log FOR SELECT USING (auth.uid() = user_id);
