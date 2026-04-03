alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'owner', 'admin'));

alter table public.drink_blends
  add column if not exists is_available boolean not null default true;

drop policy if exists "owners_read_own_kiosks" on public.kiosks;
create policy "owners_read_own_kiosks"
  on public.kiosks
  for select
  using (owner_id = auth.uid());

drop policy if exists "owners_update_own_kiosks" on public.kiosks;
create policy "owners_update_own_kiosks"
  on public.kiosks
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "owners_insert_kiosks" on public.kiosks;
create policy "owners_insert_kiosks"
  on public.kiosks
  for insert
  with check (owner_id = auth.uid());

drop policy if exists "owners_read_kiosk_payments" on public.kiosk_payments;
create policy "owners_read_kiosk_payments"
  on public.kiosk_payments
  for select
  using (
    kiosk_id in (
      select id from public.kiosks where owner_id = auth.uid()
    )
  );
