-- =============================================================
-- WOSS Robotics Executive Application Portal – Supabase Schema
-- =============================================================

-- 1. Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  phone text,
  grade text,            -- e.g. "Grade 10", "Grade 11", "Grade 12"
  student_number text,
  role text not null default 'applicant' check (role in ('applicant', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

create policy "Admins can view all profiles"
  on public.profiles for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Positions (executive roles available)
create table public.positions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  is_open boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.positions enable row level security;

create policy "Anyone can view open positions"
  on public.positions for select using (true);

create policy "Admins can manage positions"
  on public.positions for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Seed default WOSS Robotics positions
insert into public.positions (title, description, sort_order) values
  ('President', 'Oversee all club operations, represent WOSS Robotics to administration and sponsors.', 1),
  ('Vice President', 'Support the President, manage internal team coordination and project timelines.', 2),
  ('Director of Software', 'Lead the programming division, coordinate autonomous and teleoperated code.', 3),
  ('Director of Hardware', 'Lead the mechanical and electrical design teams for robot construction.', 4),
  ('Director of Marketing', 'Manage branding, social media, outreach events, and sponsor relations.', 5),
  ('Director of Finance', 'Handle the club budget, fundraising initiatives, and expense tracking.', 6),
  ('Director of Outreach', 'Organize community engagement, workshops, and recruitment events.', 7),
  ('Secretary', 'Manage meeting minutes, internal communications, and scheduling.', 8);

-- 3. Questions (admin-configurable application questions)
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  description text,
  type text not null default 'textarea' check (type in ('textarea', 'short_text', 'select', 'checkbox', 'number')),
  options jsonb,                      -- for select/checkbox types: ["Option A", "Option B"]
  char_limit int default 2000,
  is_required boolean not null default true,
  is_active boolean not null default true,
  sort_order int not null default 0,
  position_id uuid references public.positions(id) on delete set null,  -- null = applies to all positions
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.questions enable row level security;

create policy "Anyone can view active questions"
  on public.questions for select using (true);

create policy "Admins can manage questions"
  on public.questions for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Seed default questions
insert into public.questions (prompt, description, type, char_limit, sort_order) values
  ('Why are you interested in joining WOSS Robotics as an executive?', 'Tell us what motivates you to take on a leadership role in the club.', 'textarea', 1500, 1),
  ('Describe a time you demonstrated leadership and what you learned from the experience.', 'We want to understand how you lead and grow.', 'textarea', 2000, 2),
  ('What specific skills or experiences would you bring to your applied position?', 'Be specific about technical, organizational, or interpersonal skills.', 'textarea', 1500, 3),
  ('How would you handle a disagreement between team members during a build season?', 'Describe your conflict resolution approach.', 'textarea', 1000, 4);

-- 4. Applications
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'under_review', 'interview_scheduled', 'accepted', 'rejected')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, position_id)
);

alter table public.applications enable row level security;

create policy "Users can view own applications"
  on public.applications for select using (auth.uid() = user_id);

create policy "Users can insert own applications"
  on public.applications for insert with check (auth.uid() = user_id);

create policy "Users can update own draft applications"
  on public.applications for update using (auth.uid() = user_id and status = 'draft');

create policy "Admins can view all applications"
  on public.applications for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update all applications"
  on public.applications for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 5. Responses (answers to questions)
create table public.responses (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique(application_id, question_id)
);

alter table public.responses enable row level security;

create policy "Users can view own responses"
  on public.responses for select using (
    exists (select 1 from public.applications where id = application_id and user_id = auth.uid())
  );

create policy "Users can upsert own responses"
  on public.responses for insert with check (
    exists (select 1 from public.applications where id = application_id and user_id = auth.uid())
  );

create policy "Users can update own responses"
  on public.responses for update using (
    exists (select 1 from public.applications where id = application_id and user_id = auth.uid())
  );

create policy "Admins can view all responses"
  on public.responses for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 6. Activities
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text,
  role text,
  organization text,
  description text,
  years text[],
  hours_per_week int,
  weeks_per_year int,
  plan_to_continue boolean default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.activities enable row level security;

create policy "Users can manage own activities"
  on public.activities for all using (auth.uid() = user_id);

create policy "Admins can view all activities"
  on public.activities for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 7. Honors
create table public.honors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '',
  grade_level text,
  recognition_level text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.honors enable row level security;

create policy "Users can manage own honors"
  on public.honors for all using (auth.uid() = user_id);

create policy "Admins can view all honors"
  on public.honors for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 8. Interview slots
create table public.interview_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time not null,
  interviewer_name text,
  is_booked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.interview_slots enable row level security;

create policy "Anyone can view available slots"
  on public.interview_slots for select using (true);

create policy "Admins can manage slots"
  on public.interview_slots for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 9. Interview bookings
create table public.interview_bookings (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  slot_id uuid not null references public.interview_slots(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(application_id),
  unique(slot_id)
);

alter table public.interview_bookings enable row level security;

create policy "Users can view own bookings"
  on public.interview_bookings for select using (auth.uid() = user_id);

create policy "Users can insert own bookings"
  on public.interview_bookings for insert with check (auth.uid() = user_id);

create policy "Admins can view all bookings"
  on public.interview_bookings for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 10. Reviews (admin scoring)
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  scores jsonb not null default '{}',  -- e.g. {"experience": 4, "essay": 5, "leadership": 3, "fit": 4}
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(application_id, reviewer_id)
);

alter table public.reviews enable row level security;

create policy "Admins can manage reviews"
  on public.reviews for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 11. Settings (application cycle config)
create table public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "Anyone can view settings"
  on public.settings for select using (true);

create policy "Admins can manage settings"
  on public.settings for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Seed default settings
insert into public.settings (key, value) values
  ('application_window_open', 'true'),
  ('interview_scheduling_open', 'false'),
  ('decisions_released', 'false'),
  ('cycle_name', '"2026-2027 Executive Applications"'),
  ('application_deadline', '"April 30, 2026"'),
  ('interview_window', '"May 5 – May 12, 2026"'),
  ('decisions_date', '"May 19, 2026"');

-- 12. Decisions (letters sent to applicants)
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade unique,
  type text not null check (type in ('accepted', 'rejected')),
  letter_content text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.decisions enable row level security;

create policy "Users can view own decisions"
  on public.decisions for select using (
    exists (select 1 from public.applications where id = application_id and user_id = auth.uid())
  );

create policy "Users can update own decisions read status"
  on public.decisions for update using (
    exists (select 1 from public.applications where id = application_id and user_id = auth.uid())
  );

create policy "Admins can manage decisions"
  on public.decisions for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
