-- =============================================================
-- Migration: Fix CRITICAL + HIGH security vulnerabilities
-- 1. Prevent role escalation via profile self-update (#2a)
-- 2. Restrict application status transitions for applicants (#15b, #27c)
-- 3. Fix interview_slots broad update policy (#40b, #40m)
-- =============================================================

-- ===================== 1. PROFILES: Prevent role self-escalation =====================
-- Replace the current "Users can update own profile" policy with one that
-- prevents users from changing their own role column.
-- The WITH CHECK ensures the role value stays the same as what's currently stored.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ===================== 2. APPLICATIONS: Restrict status transitions =====================
-- Replace the current "Users can update own applications" policy.
-- Applicants can only update their own application AND can only transition
-- status from 'draft' to 'submitted' (or keep it as 'draft').
-- All other status changes require admin privileges.

DROP POLICY IF EXISTS "Users can update own applications" ON public.applications;

CREATE POLICY "Users can update own applications"
  ON public.applications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Allow keeping the same status (e.g. updating other fields while draft)
      status = (SELECT a.status FROM public.applications a WHERE a.id = id)
      -- Allow transitioning from draft to submitted only
      OR (
        (SELECT a.status FROM public.applications a WHERE a.id = id) = 'draft'
        AND status = 'submitted'
      )
    )
  );

-- ===================== 3. INTERVIEW SLOTS: Remove overly permissive update =====================
-- The "Users can update slots for booking" policy with USING (true) allows
-- ANY authenticated user to update ANY interview slot. Remove it.
-- Admins already have their own update policy. If applicant slot-booking via
-- direct DB update is needed in the future, a more restrictive policy should
-- be created (e.g. only allowing is_booked = true on unbooked slots).

DROP POLICY IF EXISTS "Users can update slots for booking" ON public.interview_slots;

-- ===================== 4. RESPONSES: Lock edits after submission =====================
-- Users should only be able to insert/update responses when their application is still in draft.

DROP POLICY IF EXISTS "Users can insert own responses" ON public.responses;
DROP POLICY IF EXISTS "Users can update own responses" ON public.responses;

CREATE POLICY "Users can insert own responses"
  ON public.responses FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE id = application_id AND user_id = auth.uid() AND status = 'draft'
    )
  );

CREATE POLICY "Users can update own responses"
  ON public.responses FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE id = application_id AND user_id = auth.uid() AND status = 'draft'
    )
  );

-- ===================== 5. ACTIVITIES: Lock edits after submission =====================
DROP POLICY IF EXISTS "Users can insert own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can delete own activities" ON public.activities;

CREATE POLICY "Users can insert own activities"
  ON public.activities FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE user_id = auth.uid() AND status = 'draft'
    )
  );

CREATE POLICY "Users can update own activities"
  ON public.activities FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE user_id = auth.uid() AND status = 'draft'
    )
  );

CREATE POLICY "Users can delete own activities"
  ON public.activities FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE user_id = auth.uid() AND status = 'draft'
    )
  );

-- ===================== 6. HONORS: Lock edits after submission =====================
DROP POLICY IF EXISTS "Users can insert own honors" ON public.honors;
DROP POLICY IF EXISTS "Users can update own honors" ON public.honors;
DROP POLICY IF EXISTS "Users can delete own honors" ON public.honors;

CREATE POLICY "Users can insert own honors"
  ON public.honors FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE user_id = auth.uid() AND status = 'draft'
    )
  );

CREATE POLICY "Users can update own honors"
  ON public.honors FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE user_id = auth.uid() AND status = 'draft'
    )
  );

CREATE POLICY "Users can delete own honors"
  ON public.honors FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE user_id = auth.uid() AND status = 'draft'
    )
  );

-- ===================== 7. APPLICATION_POSITIONS: Lock inserts after submission =====================
DROP POLICY IF EXISTS "Users can insert own application_positions" ON public.application_positions;

CREATE POLICY "Users can insert own application_positions"
  ON public.application_positions FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE id = application_id AND user_id = auth.uid() AND status = 'draft'
    )
  );
