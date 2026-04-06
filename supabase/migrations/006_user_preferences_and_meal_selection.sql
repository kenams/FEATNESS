alter table public.profiles
  add column if not exists preferred_sport text,
  add column if not exists preferred_goal text,
  add column if not exists favorite_meal_ids uuid[] not null default '{}';

alter table public.profiles
  drop constraint if exists profiles_preferred_sport_check;

alter table public.profiles
  add constraint profiles_preferred_sport_check
  check (
    preferred_sport is null
    or preferred_sport in (
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
  );

alter table public.profiles
  drop constraint if exists profiles_preferred_goal_check;

alter table public.profiles
  add constraint profiles_preferred_goal_check
  check (
    preferred_goal is null
    or preferred_goal in ('hydration', 'recovery', 'performance')
  );

alter table public.workout_sessions
  add column if not exists selected_meal_blend_id uuid references public.drink_blends(id);

create index if not exists workout_sessions_selected_meal_blend_idx
  on public.workout_sessions (selected_meal_blend_id);
