-- ============================================================
-- SPIT Asset Management System — Migration 010: Nullable Asset Tag
-- ============================================================

-- Allow asset_tag to be nullable for assets ingested without pre-assigned tags
alter table public.assets
  alter column asset_tag drop not null;
