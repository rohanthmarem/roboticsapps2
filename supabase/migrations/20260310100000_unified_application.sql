-- =============================================================
-- Migration: Unified Application Model
-- One application per user, multiple positions per application
-- =============================================================

-- 1. Clear existing application data (user-authorized one-time wipe)
DELETE FROM decisions;
DELETE FROM interview_bookings;
DELETE FROM reviews;
DELETE FROM responses;
DELETE FROM applications;

-- 2. Create junction table for application <-> positions
CREATE TABLE public.application_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'interview_scheduled', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(application_id, position_id)
);

ALTER TABLE public.application_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own application_positions"
  ON public.application_positions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.applications WHERE id = application_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own application_positions"
  ON public.application_positions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.applications WHERE id = application_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own draft application_positions"
  ON public.application_positions FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.applications WHERE id = application_id AND user_id = auth.uid() AND status = 'draft')
  );

CREATE POLICY "Admins can view all application_positions"
  ON public.application_positions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all application_positions"
  ON public.application_positions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. Modify applications table: remove position_id, add unique on user_id
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_user_id_position_id_key;
ALTER TABLE public.applications DROP COLUMN IF EXISTS position_id;
ALTER TABLE public.applications ADD CONSTRAINT applications_user_id_key UNIQUE (user_id);

-- 4. Update decisions to reference application_positions
ALTER TABLE public.decisions DROP CONSTRAINT IF EXISTS decisions_application_id_key;
ALTER TABLE public.decisions DROP CONSTRAINT IF EXISTS decisions_application_id_fkey;
ALTER TABLE public.decisions RENAME COLUMN application_id TO application_position_id;
ALTER TABLE public.decisions ADD CONSTRAINT decisions_application_position_id_fkey
  FOREIGN KEY (application_position_id) REFERENCES public.application_positions(id) ON DELETE CASCADE;
ALTER TABLE public.decisions ADD CONSTRAINT decisions_application_position_id_key
  UNIQUE (application_position_id);

-- 5. Update interview_bookings to stay per application (one interview for all positions)
-- No structural change needed, just keep application_id as-is
