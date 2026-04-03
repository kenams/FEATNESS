alter table public.drink_blends
add column if not exists price_eur numeric(6,2) not null default 9.90;

update public.drink_blends
set price_eur = case slug
  when 'hydration-electrolyte-mix' then 7.90
  when 'recovery-protein-mix' then 9.90
  when 'endurance-carb-blend' then 8.90
  else price_eur
end;

alter table public.dispense_tokens
drop constraint if exists dispense_tokens_status_check;

alter table public.dispense_tokens
add constraint dispense_tokens_status_check
check (status in ('active', 'confirmed', 'consumed', 'expired', 'cancelled'));

create table if not exists public.kiosk_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  dispense_token_id uuid references public.dispense_tokens(id),
  user_id uuid references public.profiles(id),
  kiosk_id text not null,
  amount_eur numeric(6,2) not null,
  stripe_payment_intent_id text,
  stripe_session_id text,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  meal_blend_id uuid references public.drink_blends(id),
  paid_at timestamptz
);

create table if not exists public.kiosks (
  id text primary key,
  created_at timestamptz default now(),
  name text not null,
  location_address text,
  location_city text,
  owner_id uuid references public.profiles(id),
  is_active boolean default true,
  last_heartbeat_at timestamptz,
  stock_units integer default 0,
  stock_alert_threshold integer default 10
);

create index if not exists kiosk_payments_user_created_idx
  on public.kiosk_payments(user_id, created_at desc);

create index if not exists kiosk_payments_kiosk_created_idx
  on public.kiosk_payments(kiosk_id, created_at desc);

create index if not exists kiosks_owner_idx
  on public.kiosks(owner_id);

alter table public.kiosk_payments enable row level security;
alter table public.kiosks enable row level security;

drop policy if exists "kiosk_payments_select_own" on public.kiosk_payments;
create policy "kiosk_payments_select_own"
on public.kiosk_payments
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "kiosks_public_select" on public.kiosks;
create policy "kiosks_public_select"
on public.kiosks
for select
to anon, authenticated
using (true);

drop policy if exists "kiosks_owner_update" on public.kiosks;
create policy "kiosks_owner_update"
on public.kiosks
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
