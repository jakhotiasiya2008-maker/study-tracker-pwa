-- StudyFlow Production Postgres & Supabase Schema
-- Strict Row Level Security (RLS) enabled on all tables
-- Only public display name, points, and streaks are shared in squads.
-- Personal subjects, topics, and notes are never stored here.

-- 1. Squads Table
create table if not exists public.squads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.squads enable row level security;

-- 2. Squad Members Table
create table if not exists public.squad_members (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid references public.squads(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  display_name text not null,
  weekly_points integer default 0 not null,
  total_points integer default 0 not null,
  streak integer default 0 not null,
  avatar_seed text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (squad_id, user_id)
);

alter table public.squad_members enable row level security;

-- 3. Squad Activity Feed Table
create table if not exists public.squad_activities (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid references public.squads(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  user_name text not null,
  action text not null,
  type text not null check (type in ('task_completed', 'streak_milestone', 'revision_cleared', 'nudge')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.squad_activities enable row level security;

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

-- SQUADS POLICIES:
-- Users can view squads they are members of
create policy "Users can view squads they belong to"
  on public.squads
  for select
  using (
    exists (
      select 1 from public.squad_members
      where public.squad_members.squad_id = public.squads.id
      and public.squad_members.user_id = auth.uid()
    )
  );

-- Authenticated users can create a new squad
create policy "Users can create squads"
  on public.squads
  for insert
  with check (auth.uid() = created_by);

-- SQUAD MEMBERS POLICIES:
-- Members can only read data of peers in the same squad
create policy "Members can view squad roster"
  on public.squad_members
  for select
  using (
    exists (
      select 1 from public.squad_members as sm
      where sm.squad_id = public.squad_members.squad_id
      and sm.user_id = auth.uid()
    )
  );

-- Users can only insert/update their OWN member row
create policy "Users can insert their own squad membership"
  on public.squad_members
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update only their own points and streak"
  on public.squad_members
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- SQUAD ACTIVITY POLICIES:
-- Members can view activities for their squads
create policy "Members can view squad activity feed"
  on public.squad_activities
  for select
  using (
    exists (
      select 1 from public.squad_members
      where public.squad_members.squad_id = public.squad_activities.squad_id
      and public.squad_members.user_id = auth.uid()
    )
  );

-- Users can insert activities for actions they took
create policy "Users can create activity feed events"
  on public.squad_activities
  for insert
  with check (auth.uid() = user_id);

-- 4. Enable Supabase Realtime for live squad updates
alter publication supabase_realtime add table public.squad_members;
alter publication supabase_realtime add table public.squad_activities;
