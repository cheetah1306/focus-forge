-- ============================================================================
-- FOCUSFORGE — complete Supabase schema, RLS, triggers and seed data
-- Run this file once in the Supabase SQL editor (or `supabase db push`).
-- Every user-owned row is protected by Row Level Security keyed to auth.uid().
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles & preferences
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default 'Student',
  college text,
  academic_year text,
  semester text,
  avatar_url text,
  onboarded boolean not null default false,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark','light','system')),
  default_focus_minutes int not null default 25 check (default_focus_minutes between 1 and 300),
  break_minutes int not null default 5 check (break_minutes between 1 and 120),
  long_break_minutes int not null default 20 check (long_break_minutes between 1 and 120),
  sessions_before_long_break int not null default 4 check (sessions_before_long_break between 2 and 12),
  sound_enabled boolean not null default true,
  reduced_motion boolean not null default false,
  timezone text not null default 'Asia/Kolkata',
  daily_target_minutes int not null default 240 check (daily_target_minutes between 15 and 1440),
  weekly_target_minutes int not null default 1680 check (weekly_target_minutes between 60 and 10080),
  notify jsonb not null default '{
    "session_end": true,
    "session_start": true,
    "breaks": true,
    "deadlines": true,
    "exams": true,
    "missed_sessions": true,
    "daily_target": true,
    "daily_report": true
  }'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Academic structure
-- ---------------------------------------------------------------------------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  code text,
  color text not null default 'blue' check (color in ('blue','violet','mint','amber','rose','cyan')),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists subjects_user_idx on public.subjects(user_id);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists units_user_idx on public.units(user_id);
create index if not exists units_subject_idx on public.units(subject_id);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','completed','needs_revision')),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists topics_user_idx on public.topics(user_id);
create index if not exists topics_unit_idx on public.topics(unit_id);
create index if not exists topics_subject_idx on public.topics(subject_id);

-- ---------------------------------------------------------------------------
-- Planner & timetable
-- ---------------------------------------------------------------------------
create table if not exists public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  unit_id uuid references public.units(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  description text,
  category text not null default 'normal'
    check (category in ('must_do','high','normal','revision','practice','mock')),
  priority int not null default 2 check (priority between 1 and 3),
  deadline timestamptz,
  estimated_minutes int not null default 30 check (estimated_minutes between 1 and 1440),
  actual_minutes int not null default 0 check (actual_minutes >= 0),
  status text not null default 'pending' check (status in ('pending','completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_user_idx on public.study_tasks(user_id);
create index if not exists tasks_deadline_idx on public.study_tasks(user_id, deadline);
create index if not exists tasks_status_idx on public.study_tasks(user_id, status);

create table if not exists public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  topic text,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  recurrence text not null default 'weekly' check (recurrence in ('none','daily','weekly')),
  priority int not null default 3 check (priority between 1 and 3),
  description text,
  status text not null default 'pending'
    check (status in ('pending','completed','missed','rescheduled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timetable_time_range check (end_time > start_time)
);
create index if not exists timetable_user_idx on public.timetable_entries(user_id);
create index if not exists timetable_day_idx on public.timetable_entries(user_id, day_of_week);

-- ---------------------------------------------------------------------------
-- Focus sessions & accountability
-- ---------------------------------------------------------------------------
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  topic text,
  mode text not null default 'pomodoro'
    check (mode in ('pomodoro','deep','exam','custom','emergency')),
  planned_minutes int not null check (planned_minutes between 1 and 600),
  started_at timestamptz not null default now(),
  planned_end_at timestamptz not null,
  ended_at timestamptz,
  actual_seconds int not null default 0 check (actual_seconds >= 0),
  pause_seconds int not null default 0 check (pause_seconds >= 0),
  pauses jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active','completed','interrupted')),
  interruption_reason text,
  task_id uuid references public.study_tasks(id) on delete set null,
  entry_id uuid references public.timetable_entries(id) on delete set null,
  note text,
  last_heartbeat_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on public.focus_sessions(user_id, started_at desc);
create index if not exists sessions_status_idx on public.focus_sessions(user_id, status);
-- Prevent more than one active session per user.
create unique index if not exists one_active_session_per_user
  on public.focus_sessions(user_id) where (status = 'active');

create table if not exists public.session_interruptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.focus_sessions(id) on delete cascade,
  planned_minutes int not null,
  actual_minutes int not null,
  reason text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists interruptions_user_idx on public.session_interruptions(user_id, created_at desc);

create table if not exists public.distraction_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  platform text not null
    check (platform in ('instagram','youtube','browsing','gaming','chat','other')),
  minutes int not null check (minutes between 1 and 1440),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists distractions_user_date_idx on public.distraction_logs(user_id, date);

-- ---------------------------------------------------------------------------
-- Goals, exams, challenge
-- ---------------------------------------------------------------------------
create table if not exists public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  target_minutes int not null check (target_minutes between 15 and 1440),
  target_sessions int not null default 4 check (target_sessions between 1 and 24),
  target_tasks int not null default 2 check (target_tasks between 0 and 50),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.exam_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  exam_date date not null,
  exam_time time,
  exam_type text not null default 'final'
    check (exam_type in ('midterm','final','quiz','practical','viva','other')),
  venue text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists exams_user_date_idx on public.exam_schedule(user_id, exam_date);

create table if not exists public.study_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '30-Day Study Challenge',
  start_date date not null,
  end_date date not null,
  daily_hours numeric(4,1) not null default 4 check (daily_hours > 0 and daily_hours <= 16),
  weekly_revision_target int not null default 3 check (weekly_revision_target >= 0),
  subject_priorities uuid[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint challenge_date_range check (end_date >= start_date)
);
create index if not exists challenges_user_idx on public.study_challenges(user_id, active);

create table if not exists public.daily_challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.study_challenges(id) on delete cascade,
  date date not null,
  day_number int not null check (day_number >= 1),
  target_minutes int not null default 0,
  studied_minutes int not null default 0,
  sessions_completed int not null default 0,
  tasks_completed int not null default 0,
  status text not null default 'pending' check (status in ('pending','completed','missed')),
  focus_score int not null default 0,
  report jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (challenge_id, date)
);
create index if not exists challenge_progress_user_idx on public.daily_challenge_progress(user_id, date);

-- ---------------------------------------------------------------------------
-- Notifications, achievements, resources
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('session','break','deadline','exam','target','report','achievement')),
  title text not null,
  body text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

create table if not exists public.achievements (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null,
  metric text not null,
  threshold numeric not null,
  tier text not null check (tier in ('bronze','silver','gold','platinum'))
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);
create index if not exists user_achievements_user_idx on public.user_achievements(user_id);

create table if not exists public.study_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  url text not null,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists resources_user_idx on public.study_resources(user_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists preferences_updated on public.user_preferences;
create trigger preferences_updated before update on public.user_preferences
  for each row execute function public.set_updated_at();

drop trigger if exists topics_updated on public.topics;
create trigger topics_updated before update on public.topics
  for each row execute function public.set_updated_at();

drop trigger if exists tasks_updated on public.study_tasks;
create trigger tasks_updated before update on public.study_tasks
  for each row execute function public.set_updated_at();

drop trigger if exists timetable_updated on public.timetable_entries;
create trigger timetable_updated before update on public.timetable_entries
  for each row execute function public.set_updated_at();

drop trigger if exists challenge_progress_updated on public.daily_challenge_progress;
create trigger challenge_progress_updated before update on public.daily_challenge_progress
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New-user bootstrap: profile + preferences in one transaction
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, timezone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Student'),
    coalesce(new.raw_user_meta_data->>'timezone', 'Asia/Kolkata')
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.subjects enable row level security;
alter table public.units enable row level security;
alter table public.topics enable row level security;
alter table public.study_tasks enable row level security;
alter table public.timetable_entries enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.session_interruptions enable row level security;
alter table public.daily_goals enable row level security;
alter table public.exam_schedule enable row level security;
alter table public.study_challenges enable row level security;
alter table public.daily_challenge_progress enable row level security;
alter table public.notifications enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.distraction_logs enable row level security;
alter table public.study_resources enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- preferences
drop policy if exists "prefs_all_own" on public.user_preferences;
create policy "prefs_all_own" on public.user_preferences for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user-owned tables: one loop of explicit policies
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'subjects','units','topics','study_tasks','timetable_entries','focus_sessions',
    'session_interruptions','daily_goals','exam_schedule','study_challenges',
    'daily_challenge_progress','notifications','user_achievements','distraction_logs','study_resources'
  ])
  loop
    execute format('drop policy if exists "%s_select_own" on public.%I', t, t);
    execute format('create policy "%s_select_own" on public.%I for select to authenticated using (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%I', t, t);
    execute format('create policy "%s_insert_own" on public.%I for insert to authenticated with check (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%I', t, t);
    execute format('create policy "%s_update_own" on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%I', t, t);
    execute format('create policy "%s_delete_own" on public.%I for delete to authenticated using (auth.uid() = user_id)', t, t);
  end loop;
end;
$$;

-- achievements catalogue is readable by any authenticated user
drop policy if exists "achievements_read_all" on public.achievements;
create policy "achievements_read_all" on public.achievements for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Achievement catalogue seed
-- ---------------------------------------------------------------------------
insert into public.achievements (id, title, description, icon, metric, threshold, tier) values
  ('first_session',  'First Spark',            'Complete your first focus session.',                'Zap',           'sessions_completed', 1,   'bronze'),
  ('sessions_10',    'Momentum',               'Complete 10 focus sessions.',                       'Flame',         'sessions_completed', 10,  'silver'),
  ('sessions_50',    'Deep Diver',             'Complete 50 focus sessions.',                       'Waves',         'sessions_completed', 50,  'gold'),
  ('sessions_100',   'Forge Master',           'Complete 100 focus sessions.',                      'Anvil',         'sessions_completed', 100, 'platinum'),
  ('hours_5',        'Five Hour Club',         'Study for 5 total hours.',                          'Clock',         'total_hours',        5,   'bronze'),
  ('hours_20',       'Twenty Strong',          'Study for 20 total hours.',                         'Timer',         'total_hours',        20,  'silver'),
  ('hours_50',       'Half Century',           'Study for 50 total hours.',                         'Trophy',        'total_hours',        50,  'gold'),
  ('streak_3',       'Three in a Row',         'Maintain a 3-day study streak.',                    'Flame',         'streak',             3,   'bronze'),
  ('streak_7',       'Week of Focus',          'Maintain a 7-day study streak.',                    'CalendarCheck', 'streak',             7,   'silver'),
  ('streak_21',      'Habit Formed',           'Maintain a 21-day study streak.',                   'Sparkles',      'streak',             21,  'gold'),
  ('perfect_day',    'Zero Missed Targets',    'Hit every daily target on a single day.',           'Target',        'perfect_days',       1,   'silver'),
  ('tasks_25',       'Task Slayer',            'Complete 25 study tasks.',                          'CheckCheck',    'tasks_completed',    25,  'silver'),
  ('challenge_30',   'Challenge Conqueror',    'Complete all 30 days of a study challenge.',        'Medal',         'challenge_days',     30,  'platinum')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  metric = excluded.metric,
  threshold = excluded.threshold,
  tier = excluded.tier;

-- ---------------------------------------------------------------------------
-- Storage buckets & policies
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('study-documents', 'study-documents', false)
on conflict (id) do nothing;

drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars_write_own" on storage.objects;
create policy "avatars_write_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "documents_read_own" on storage.objects;
create policy "documents_read_own" on storage.objects for select to authenticated
  using (bucket_id = 'study-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "documents_write_own" on storage.objects;
create policy "documents_write_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'study-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "documents_delete_own" on storage.objects;
create policy "documents_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'study-documents' and (storage.foldername(name))[1] = auth.uid()::text);
