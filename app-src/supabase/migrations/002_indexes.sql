-- ============================================================
-- SPIT Asset Management System — Migration 002: Indexes
-- ============================================================

-- Full-text / trigram search on assets
create index if not exists idx_assets_name_trgm
  on public.assets using gin (name gin_trgm_ops);

create index if not exists idx_assets_tag_trgm
  on public.assets using gin (asset_tag gin_trgm_ops);

create index if not exists idx_assets_description_trgm
  on public.assets using gin (description gin_trgm_ops);

-- Lookup by room, status, category
create index if not exists idx_assets_room_id
  on public.assets (room_id);

create index if not exists idx_assets_status
  on public.assets (status);

create index if not exists idx_assets_category_id
  on public.assets (category_id);

create index if not exists idx_assets_building_id
  on public.assets (building_id);

create index if not exists idx_assets_floor_id
  on public.assets (floor_id);

create index if not exists idx_assets_institution_id
  on public.assets (institution_id);

-- Asset history queries
create index if not exists idx_asset_history_asset_id
  on public.asset_history (asset_id, occurred_at desc);

create index if not exists idx_asset_history_event_type
  on public.asset_history (event_type);

-- Change requests
create index if not exists idx_change_requests_status
  on public.change_requests (status, type);

create index if not exists idx_change_requests_requested_by
  on public.change_requests (requested_by);

create index if not exists idx_change_requests_asset_id
  on public.change_requests (asset_id);

-- Asset movements
create index if not exists idx_asset_movements_asset_id
  on public.asset_movements (asset_id, moved_at desc);

-- Audit logs
create index if not exists idx_audit_logs_occurred_at
  on public.audit_logs (occurred_at desc);

create index if not exists idx_audit_logs_entity
  on public.audit_logs (entity_type, entity_id);

-- Rooms
create index if not exists idx_rooms_floor_id
  on public.rooms (floor_id);

create index if not exists idx_rooms_building_id
  on public.rooms (building_id);

create index if not exists idx_rooms_room_number_trgm
  on public.rooms using gin (room_number gin_trgm_ops);

create index if not exists idx_rooms_name_trgm
  on public.rooms using gin (name gin_trgm_ops);

-- Import issues
create index if not exists idx_import_issues_status
  on public.import_issues (status);

create index if not exists idx_import_issues_run_id
  on public.import_issues (run_id);
