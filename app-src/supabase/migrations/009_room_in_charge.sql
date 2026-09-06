-- ============================================================
-- SPIT Asset Management System — Migration 009: Room In-Charge
-- ============================================================

-- Add in_charge_user_id to public.rooms referencing public.profiles(id)
alter table public.rooms
  add column if not exists in_charge_user_id uuid references public.profiles(id) on delete set null;

-- Index for fast joins and lookups
create index if not exists idx_rooms_in_charge on public.rooms(in_charge_user_id);
