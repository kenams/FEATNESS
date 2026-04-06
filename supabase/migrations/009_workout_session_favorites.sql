alter table public.workout_sessions
  add column if not exists is_favorite boolean not null default false;

create index if not exists workout_sessions_user_favorite_created_idx
  on public.workout_sessions (user_id, is_favorite, created_at desc);
