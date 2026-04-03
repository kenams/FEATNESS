alter table public.profiles
  add column if not exists expo_push_token text;

create index if not exists profiles_expo_push_token_idx
  on public.profiles (id)
  where expo_push_token is not null;
