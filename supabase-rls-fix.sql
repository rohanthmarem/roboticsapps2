-- =============================================================
-- RLS Policy Fix: Explicit drops of ALL known policy names
-- Safe to run multiple times (all drops use IF EXISTS)
-- =============================================================

-- ===================== PROFILES =====================
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Users can manage own profile" on public.profiles;
drop policy if exists "Users can manage own profiles" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- ===================== POSITIONS =====================
drop policy if exists "Anyone can view positions" on public.positions;
drop policy if exists "Anyone can view open positions" on public.positions;
drop policy if exists "Anyone can read positions" on public.positions;
drop policy if exists "Admins can manage positions" on public.positions;
drop policy if exists "Admins can insert positions" on public.positions;
drop policy if exists "Admins can update positions" on public.positions;
drop policy if exists "Admins can delete positions" on public.positions;

create policy "Anyone can view positions"
  on public.positions for select using (true);

create policy "Admins can insert positions"
  on public.positions for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update positions"
  on public.positions for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete positions"
  on public.positions for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ===================== QUESTIONS =====================
drop policy if exists "Anyone can view questions" on public.questions;
drop policy if exists "Anyone can view active questions" on public.questions;
drop policy if exists "Anyone can read questions" on public.questions;
drop policy if exists "Admins can manage questions" on public.questions;
drop policy if exists "Admins can insert questions" on public.questions;
drop policy if exists "Admins can update questions" on public.questions;
drop policy if exists "Admins can delete questions" on public.questions;

create policy "Anyone can view questions"
  on public.questions for select using (true);

create policy "Admins can insert questions"
  on public.questions for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update questions"
  on public.questions for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete questions"
  on public.questions for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ===================== SETTINGS =====================
drop policy if exists "Anyone can view settings" on public.settings;
drop policy if exists "Anyone can read settings" on public.settings;
drop policy if exists "Admins can manage settings" on public.settings;
drop policy if exists "Admins can insert settings" on public.settings;
drop policy if exists "Admins can update settings" on public.settings;
drop policy if exists "Admins can delete settings" on public.settings;

create policy "Anyone can view settings"
  on public.settings for select using (true);

create policy "Admins can insert settings"
  on public.settings for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update settings"
  on public.settings for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete settings"
  on public.settings for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ===================== APPLICATIONS =====================
drop policy if exists "Users can view own applications" on public.applications;
drop policy if exists "Users can insert own applications" on public.applications;
drop policy if exists "Users can update own applications" on public.applications;
drop policy if exists "Users can update own draft applications" on public.applications;
drop policy if exists "Admins can view all applications" on public.applications;
drop policy if exists "Admins can update all applications" on public.applications;
drop policy if exists "Admins can manage applications" on public.applications;

create policy "Users can view own applications"
  on public.applications for select using (auth.uid() = user_id);

create policy "Admins can view all applications"
  on public.applications for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can insert own applications"
  on public.applications for insert with check (auth.uid() = user_id);

create policy "Users can update own applications"
  on public.applications for update using (auth.uid() = user_id);

create policy "Admins can update all applications"
  on public.applications for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ===================== RESPONSES =====================
drop policy if exists "Users can view own responses" on public.responses;
drop policy if exists "Users can upsert own responses" on public.responses;
drop policy if exists "Users can insert own responses" on public.responses;
drop policy if exists "Users can update own responses" on public.responses;
drop policy if exists "Admins can view all responses" on public.responses;
drop policy if exists "Admins can manage responses" on public.responses;

create policy "Users can view own responses"
  on public.responses for select using (
    exists (select 1 from public.applications where id = application_id and user_id = auth.uid())
  );

create policy "Admins can view all responses"
  on public.responses for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can insert own responses"
  on public.responses for insert with check (
    exists (select 1 from public.applications where id = application_id and user_id = auth.uid())
  );

create policy "Users can update own responses"
  on public.responses for update using (
    exists (select 1 from public.applications where id = application_id and user_id = auth.uid())
  );

-- ===================== ACTIVITIES =====================
drop policy if exists "Users can manage own activities" on public.activities;
drop policy if exists "Users can select own activities" on public.activities;
drop policy if exists "Users can insert own activities" on public.activities;
drop policy if exists "Users can update own activities" on public.activities;
drop policy if exists "Users can delete own activities" on public.activities;
drop policy if exists "Admins can view all activities" on public.activities;

create policy "Users can select own activities"
  on public.activities for select using (auth.uid() = user_id);

create policy "Admins can view all activities"
  on public.activities for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can insert own activities"
  on public.activities for insert with check (auth.uid() = user_id);

create policy "Users can update own activities"
  on public.activities for update using (auth.uid() = user_id);

create policy "Users can delete own activities"
  on public.activities for delete using (auth.uid() = user_id);

-- ===================== HONORS =====================
drop policy if exists "Users can manage own honors" on public.honors;
drop policy if exists "Users can select own honors" on public.honors;
drop policy if exists "Users can insert own honors" on public.honors;
drop policy if exists "Users can update own honors" on public.honors;
drop policy if exists "Users can delete own honors" on public.honors;
drop policy if exists "Admins can view all honors" on public.honors;

create policy "Users can select own honors"
  on public.honors for select using (auth.uid() = user_id);

create policy "Admins can view all honors"
  on public.honors for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can insert own honors"
  on public.honors for insert with check (auth.uid() = user_id);

create policy "Users can update own honors"
  on public.honors for update using (auth.uid() = user_id);

create policy "Users can delete own honors"
  on public.honors for delete using (auth.uid() = user_id);

-- ===================== INTERVIEW SLOTS =====================
drop policy if exists "Anyone can view available slots" on public.interview_slots;
drop policy if exists "Anyone can view slots" on public.interview_slots;
drop policy if exists "Admins can manage slots" on public.interview_slots;
drop policy if exists "Admins can insert slots" on public.interview_slots;
drop policy if exists "Admins can update slots" on public.interview_slots;
drop policy if exists "Admins can delete slots" on public.interview_slots;
drop policy if exists "Users can update slots for booking" on public.interview_slots;

create policy "Anyone can view slots"
  on public.interview_slots for select using (true);

create policy "Admins can insert slots"
  on public.interview_slots for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update slots"
  on public.interview_slots for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can update slots for booking"
  on public.interview_slots for update using (true);

create policy "Admins can delete slots"
  on public.interview_slots for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ===================== INTERVIEW BOOKINGS =====================
drop policy if exists "Users can view own bookings" on public.interview_bookings;
drop policy if exists "Users can insert own bookings" on public.interview_bookings;
drop policy if exists "Admins can view all bookings" on public.interview_bookings;
drop policy if exists "Admins can manage bookings" on public.interview_bookings;

create policy "Users can view own bookings"
  on public.interview_bookings for select using (auth.uid() = user_id);

create policy "Admins can view all bookings"
  on public.interview_bookings for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can insert own bookings"
  on public.interview_bookings for insert with check (auth.uid() = user_id);

-- ===================== REVIEWS =====================
drop policy if exists "Admins can manage reviews" on public.reviews;
drop policy if exists "Admins can select reviews" on public.reviews;
drop policy if exists "Admins can insert reviews" on public.reviews;
drop policy if exists "Admins can update reviews" on public.reviews;

create policy "Admins can select reviews"
  on public.reviews for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can insert reviews"
  on public.reviews for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update reviews"
  on public.reviews for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ===================== DECISIONS =====================
drop policy if exists "Users can view own decisions" on public.decisions;
drop policy if exists "Users can update own decisions read status" on public.decisions;
drop policy if exists "Users can update own decisions" on public.decisions;
drop policy if exists "Admins can manage decisions" on public.decisions;
drop policy if exists "Admins can view all decisions" on public.decisions;
drop policy if exists "Admins can select decisions" on public.decisions;
drop policy if exists "Admins can insert decisions" on public.decisions;
drop policy if exists "Admins can update decisions" on public.decisions;

-- NOTE: decisions.application_id was renamed to application_position_id in
-- migration 20260310100000_unified_application.sql. Policies below use the new name.
create policy "Users can view own decisions"
  on public.decisions for select using (
    exists (
      select 1 from public.application_positions ap
      join public.applications a on a.id = ap.application_id
      where ap.id = application_position_id and a.user_id = auth.uid()
    )
  );

create policy "Admins can view all decisions"
  on public.decisions for select using (public.is_admin());

create policy "Users can update own decisions"
  on public.decisions for update using (
    exists (
      select 1 from public.application_positions ap
      join public.applications a on a.id = ap.application_id
      where ap.id = application_position_id and a.user_id = auth.uid()
    )
  );

create policy "Admins can insert decisions"
  on public.decisions for insert with check (public.is_admin());

create policy "Admins can update decisions"
  on public.decisions for update using (public.is_admin());
