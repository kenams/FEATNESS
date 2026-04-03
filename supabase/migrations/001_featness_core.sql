create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  weight_kg numeric(5,2),
  gym_name text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sport text not null check (
    sport in (
      'running',
      'cycling',
      'strength',
      'hiit',
      'yoga',
      'football',
      'basketball',
      'swimming',
      'rowing'
    )
  ),
  intensity text not null check (intensity in ('light', 'moderate', 'intense')),
  goal text not null check (goal in ('hydration', 'recovery', 'performance')),
  duration_min integer not null check (duration_min > 0),
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  calories_burned integer not null,
  hydration_ml integer not null,
  carbs_g numeric(6,2) not null,
  protein_g numeric(6,2) not null,
  electrolytes_mg integer not null,
  recommended_blend text not null,
  recommendation_summary text not null,
  preparation_status text not null default 'pending' check (
    preparation_status in ('pending', 'scanned', 'queued', 'mixing', 'ready', 'completed')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dispense_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null unique references public.workout_sessions(id) on delete cascade,
  status text not null default 'active' check (
    status in ('active', 'consumed', 'expired', 'cancelled')
  ),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.drink_blends (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  target_goal text not null check (target_goal in ('hydration', 'recovery', 'performance')),
  created_at timestamptz not null default now()
);

create index if not exists workout_sessions_user_created_idx
  on public.workout_sessions(user_id, created_at desc);

create index if not exists dispense_tokens_user_created_idx
  on public.dispense_tokens(user_id, created_at desc);

create index if not exists dispense_tokens_status_expires_idx
  on public.dispense_tokens(status, expires_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists workout_sessions_set_updated_at on public.workout_sessions;
create trigger workout_sessions_set_updated_at
before update on public.workout_sessions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.dispense_tokens enable row level security;
alter table public.drink_blends enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "workout_sessions_select_own" on public.workout_sessions;
create policy "workout_sessions_select_own"
on public.workout_sessions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "workout_sessions_insert_own" on public.workout_sessions;
create policy "workout_sessions_insert_own"
on public.workout_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "workout_sessions_update_own" on public.workout_sessions;
create policy "workout_sessions_update_own"
on public.workout_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "dispense_tokens_select_own" on public.dispense_tokens;
create policy "dispense_tokens_select_own"
on public.dispense_tokens
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "dispense_tokens_insert_own" on public.dispense_tokens;
create policy "dispense_tokens_insert_own"
on public.dispense_tokens
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "dispense_tokens_update_own" on public.dispense_tokens;
create policy "dispense_tokens_update_own"
on public.dispense_tokens
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "drink_blends_read_all" on public.drink_blends;
create policy "drink_blends_read_all"
on public.drink_blends
for select
to anon, authenticated
using (true);
