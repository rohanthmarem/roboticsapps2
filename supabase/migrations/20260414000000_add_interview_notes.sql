-- Interview notes: one note per admin per application, for the interview stage
create table interview_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(application_id, admin_user_id)
);

alter table interview_notes enable row level security;

-- Admins can read all notes on any application
create policy "admins_read_interview_notes" on interview_notes
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can insert their own note
create policy "admins_insert_own_interview_notes" on interview_notes
  for insert with check (
    admin_user_id = auth.uid() and
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can update only their own note
create policy "admins_update_own_interview_notes" on interview_notes
  for update using (
    admin_user_id = auth.uid() and
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
