-- ============================================================
-- SPIT Asset Management System — Migration 006: Profile Fields & RLS
-- ============================================================

alter table public.profiles
  add column if not exists phone_number text,
  add column if not exists designation text,
  add column if not exists status text not null default 'active',
  add column if not exists bio text;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;

create policy "profiles_select"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "profiles_update"
  on public.profiles for update
  using (auth.uid() = id or public.current_user_role() = 'approver')
  with check (auth.uid() = id or public.current_user_role() = 'approver');

create policy "profiles_insert"
  on public.profiles for insert
  with check (auth.uid() = id or public.current_user_role() = 'approver');
