-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clean up existing tables to ensure a fresh start
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.chat_messages cascade;
drop table if exists public.user_preferences cascade;
drop table if exists public.marks cascade;
drop table if exists public.study_sessions cascade;
drop table if exists public.modules cascade;

-- ─── MODULES ──────────────────────────────────────────────────
create table public.modules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  code text,
  color text not null,
  credits integer default 1 not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null
);

-- ─── STUDY SESSIONS ───────────────────────────────────────────
create table public.study_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  module_id uuid references public.modules(id) on delete cascade not null,
  study_method text not null,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone,
  duration_mins integer default 0 not null,
  pomodoros_done integer default 0 not null,
  breaks_taken integer default 0 not null,
  focus_rating integer check (focus_rating >= 1 and focus_rating <= 5),
  notes text,
  created_at timestamp with time zone default now() not null
);

-- ─── MARKS ────────────────────────────────────────────────────
create table public.marks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  module_id uuid references public.modules(id) on delete cascade not null,
  title text not null,
  type text not null,
  score numeric not null,
  total numeric not null,
  percentage numeric not null,
  date timestamp with time zone not null,
  weight numeric default 1 not null,
  created_at timestamp with time zone default now() not null
);

-- ─── USER PREFERENCES ─────────────────────────────────────────
create table public.user_preferences (
  user_id uuid references auth.users(id) on delete cascade primary key,
  focus_duration integer default 25 not null,
  short_break_duration integer default 5 not null,
  long_break_duration integer default 15 not null,
  pomodoros_before_long_break integer default 4 not null,
  grade_scale_id text default 'percentage' not null,
  auto_start_breaks boolean default false not null,
  sound_enabled boolean default true not null
);

-- ─── CHAT MESSAGES ────────────────────────────────────────────
create table public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default now() not null
);

-- ─── ROW LEVEL SECURITY (RLS) ─────────────────────────────────

-- Enable RLS on all tables
alter table public.modules enable row level security;
alter table public.study_sessions enable row level security;
alter table public.marks enable row level security;
alter table public.user_preferences enable row level security;
alter table public.chat_messages enable row level security;

-- Create policies for Modules
create policy "Users can view their own modules" on public.modules for select using (auth.uid() = user_id);
create policy "Users can insert their own modules" on public.modules for insert with check (auth.uid() = user_id);
create policy "Users can update their own modules" on public.modules for update using (auth.uid() = user_id);
create policy "Users can delete their own modules" on public.modules for delete using (auth.uid() = user_id);

-- Create policies for Study Sessions
create policy "Users can view their own sessions" on public.study_sessions for select using (auth.uid() = user_id);
create policy "Users can insert their own sessions" on public.study_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update their own sessions" on public.study_sessions for update using (auth.uid() = user_id);
create policy "Users can delete their own sessions" on public.study_sessions for delete using (auth.uid() = user_id);

-- Create policies for Marks
create policy "Users can view their own marks" on public.marks for select using (auth.uid() = user_id);
create policy "Users can insert their own marks" on public.marks for insert with check (auth.uid() = user_id);
create policy "Users can update their own marks" on public.marks for update using (auth.uid() = user_id);
create policy "Users can delete their own marks" on public.marks for delete using (auth.uid() = user_id);

-- Create policies for User Preferences
create policy "Users can view their own preferences" on public.user_preferences for select using (auth.uid() = user_id);
create policy "Users can insert their own preferences" on public.user_preferences for insert with check (auth.uid() = user_id);
create policy "Users can update their own preferences" on public.user_preferences for update using (auth.uid() = user_id);

-- Create policies for Chat Messages
create policy "Users can view their own chat messages" on public.chat_messages for select using (auth.uid() = user_id);
create policy "Users can insert their own chat messages" on public.chat_messages for insert with check (auth.uid() = user_id);
create policy "Users can delete their own chat messages" on public.chat_messages for delete using (auth.uid() = user_id);

-- Function to auto-create user preferences on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_preferences (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function after user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
