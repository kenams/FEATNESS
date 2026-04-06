alter table public.profiles
  add column if not exists age integer,
  add column if not exists height_cm numeric(5,2),
  add column if not exists primary_objective text;

alter table public.profiles
  drop constraint if exists profiles_age_check;

alter table public.profiles
  add constraint profiles_age_check
  check (age is null or age between 13 and 99);

alter table public.profiles
  drop constraint if exists profiles_height_cm_check;

alter table public.profiles
  add constraint profiles_height_cm_check
  check (height_cm is null or height_cm between 120 and 230);

alter table public.profiles
  drop constraint if exists profiles_primary_objective_check;

alter table public.profiles
  add constraint profiles_primary_objective_check
  check (
    primary_objective is null
    or primary_objective in ('lose_weight', 'maintain', 'gain_muscle', 'improve_endurance')
  );
