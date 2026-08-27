-- ============================================================
-- SPIT Asset Management System — Migration 007: Physical Stock Audit Mode
-- ============================================================

create table if not exists public.asset_verifications (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  verified_by uuid references public.profiles(id) on delete set null,
  academic_year text not null default '2025-2026',
  verification_status text not null check (verification_status in ('present', 'missing', 'damaged', 'transferred')),
  notes text,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(asset_id, academic_year)
);

alter table public.asset_verifications enable row level security;

drop policy if exists "asset_verifications_select" on public.asset_verifications;
drop policy if exists "asset_verifications_insert_update" on public.asset_verifications;

create policy "asset_verifications_select"
  on public.asset_verifications for select
  using (auth.role() = 'authenticated');

create policy "asset_verifications_insert_update"
  on public.asset_verifications for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
