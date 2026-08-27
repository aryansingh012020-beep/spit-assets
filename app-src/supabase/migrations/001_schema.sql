-- ============================================================
-- SPIT Asset Management System — Migration 001: Schema
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

-- ============================================================
-- INSTITUTIONS
-- ============================================================
create table if not exists public.institutions (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  code        text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  institution_id  uuid references public.institutions(id),
  full_name       text,
  role            text not null default 'viewer'
                  check (role in ('viewer', 'asset_manager', 'approver')),
  avatar_url      text,
  employee_id     text,
  department      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- BUILDINGS
-- ============================================================
create table if not exists public.buildings (
  id              uuid primary key default uuid_generate_v4(),
  institution_id  uuid not null references public.institutions(id),
  name            text not null,
  code            text not null,
  address         text,
  floors_count    integer default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (institution_id, code)
);

-- ============================================================
-- FLOORS
-- ============================================================
create table if not exists public.floors (
  id          uuid primary key default uuid_generate_v4(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  name        text not null,
  level       integer not null,  -- 0=Ground, 1=First, etc.
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (building_id, level)
);

-- ============================================================
-- ROOMS
-- ============================================================
create table if not exists public.rooms (
  id          uuid primary key default uuid_generate_v4(),
  floor_id    uuid not null references public.floors(id) on delete cascade,
  building_id uuid not null references public.buildings(id),
  name        text not null,
  room_number text,
  room_type   text default 'general'
              check (room_type in (
                'classroom', 'lab', 'office', 'faculty_room', 'cabin',
                'library', 'canteen', 'seminar_hall', 'conference_room',
                'server_room', 'reception', 'passage', 'storage', 'general'
              )),
  capacity    integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- ASSET CATEGORIES
-- ============================================================
create table if not exists public.asset_categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  code        text not null unique,  -- used in asset tag generation
  description text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- ASSET TAG SEQUENCE (per institution, for new auto-generated codes)
-- ============================================================
create sequence if not exists public.asset_tag_seq start 1;

create table if not exists public.asset_tag_counters (
  institution_id  uuid primary key references public.institutions(id),
  next_val        bigint not null default 1
);

-- ============================================================
-- ASSETS
-- ============================================================
create table if not exists public.assets (
  id                uuid primary key default uuid_generate_v4(),
  institution_id    uuid not null references public.institutions(id),
  asset_tag         text not null unique,
  name              text not null,
  description       text,
  category_id       uuid references public.asset_categories(id),
  -- Denormalized location fields (kept in sync via trigger)
  building_id       uuid references public.buildings(id),
  floor_id          uuid references public.floors(id),
  room_id           uuid references public.rooms(id),
  status            text not null default 'active'
                    check (status in (
                      'active', 'under_maintenance', 'missing',
                      'damaged', 'transferred', 'retired', 'disposed'
                    )),
  acquisition_year  integer,
  -- Original import metadata
  original_tag      text,           -- verbatim tag from Excel
  source_sheet      text,           -- which Excel sheet it came from
  source_row        integer,        -- row number in the sheet
  -- Primary photo (denormalized for fast display)
  primary_photo_id  uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- ASSET PHOTOS
-- ============================================================
create table if not exists public.asset_photos (
  id            uuid primary key default uuid_generate_v4(),
  asset_id      uuid not null references public.assets(id) on delete cascade,
  storage_path  text not null,          -- path in Supabase Storage bucket
  file_name     text,
  mime_type     text,
  file_size     integer,
  is_primary    boolean not null default false,
  uploaded_by   uuid references public.profiles(id),
  uploaded_at   timestamptz not null default now()
);

-- Back-fill FK on assets.primary_photo_id
alter table public.assets
  add constraint fk_primary_photo
  foreign key (primary_photo_id) references public.asset_photos(id)
  on delete set null
  deferrable initially deferred;

-- ============================================================
-- CHANGE REQUESTS
-- ============================================================
create table if not exists public.change_requests (
  id              uuid primary key default uuid_generate_v4(),
  institution_id  uuid not null references public.institutions(id),
  type            text not null
                  check (type in ('addition', 'transfer', 'edit', 'deletion')),
  status          text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  -- For addition requests, asset_id is null until approved
  asset_id        uuid references public.assets(id) on delete set null,
  requested_by    uuid not null references public.profiles(id),
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  rejection_reason text,
  reason          text not null,
  -- Payload: the proposed new values (JSONB)
  new_values      jsonb not null default '{}',
  -- For edit requests: the old values captured at submission time
  old_values      jsonb default '{}',
  -- Optional photo attached with the request
  photo_path      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- ASSET MOVEMENTS (denormalized view of location-change events)
-- ============================================================
create table if not exists public.asset_movements (
  id              uuid primary key default uuid_generate_v4(),
  asset_id        uuid not null references public.assets(id) on delete cascade,
  from_room_id    uuid references public.rooms(id),
  to_room_id      uuid not null references public.rooms(id),
  from_building_id uuid references public.buildings(id),
  to_building_id  uuid references public.buildings(id),
  moved_by        uuid references public.profiles(id),
  approved_by     uuid references public.profiles(id),
  request_id      uuid references public.change_requests(id),
  moved_at        timestamptz not null default now()
);

-- ============================================================
-- ASSET HISTORY (immutable event log per asset)
-- ============================================================
create table if not exists public.asset_history (
  id              uuid primary key default uuid_generate_v4(),
  asset_id        uuid not null references public.assets(id) on delete cascade,
  event_type      text not null
                  check (event_type in (
                    'creation', 'addition_approved',
                    'transfer_requested', 'transfer_approved', 'transfer_rejected',
                    'room_change',
                    'edit_requested', 'edit_approved', 'edit_rejected',
                    'photo_uploaded', 'photo_replaced', 'photo_deleted',
                    'deletion_requested', 'deletion_approved', 'deletion_rejected',
                    'status_change',
                    'admin_change'
                  )),
  occurred_at     timestamptz not null default now(),
  performed_by    uuid references public.profiles(id),
  approved_by     uuid references public.profiles(id),
  from_location   jsonb,   -- {building_id, floor_id, room_id, building_name, floor_name, room_name}
  to_location     jsonb,
  old_value       jsonb,
  new_value       jsonb,
  reason          text,
  metadata        jsonb default '{}'
);

-- ============================================================
-- AUDIT LOGS (system-wide, admin-only)
-- ============================================================
create table if not exists public.audit_logs (
  id              uuid primary key default uuid_generate_v4(),
  performed_by    uuid references public.profiles(id),
  action          text not null,
  entity_type     text,   -- 'asset', 'user', 'room', 'change_request', etc.
  entity_id       uuid,
  old_value       jsonb,
  new_value       jsonb,
  user_agent      text,
  metadata        jsonb default '{}',
  occurred_at     timestamptz not null default now()
);

-- ============================================================
-- IMPORT ISSUES (staging table for flagged Excel rows)
-- ============================================================
create table if not exists public.import_issues (
  id              uuid primary key default uuid_generate_v4(),
  run_id          text not null,          -- import run identifier
  sheet_name      text not null,
  row_number      integer not null,
  raw_data        jsonb not null,          -- verbatim row content
  issue_type      text not null
                  check (issue_type in (
                    'no_tag', 'duplicate_tag', 'ambiguous_range',
                    'missing_room', 'fuzzy_duplicate', 'parse_error'
                  )),
  issue_detail    text,
  status          text not null default 'pending'
                  check (status in ('pending', 'imported', 'merged', 'skipped')),
  resolved_by     uuid references public.profiles(id),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_institutions_updated_at
  before update on public.institutions
  for each row execute function public.set_updated_at();

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_buildings_updated_at
  before update on public.buildings
  for each row execute function public.set_updated_at();

create trigger trg_floors_updated_at
  before update on public.floors
  for each row execute function public.set_updated_at();

create trigger trg_rooms_updated_at
  before update on public.rooms
  for each row execute function public.set_updated_at();

create trigger trg_assets_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

create trigger trg_change_requests_updated_at
  before update on public.change_requests
  for each row execute function public.set_updated_at();

-- ============================================================
-- TRIGGER: Sync building_id/floor_id when room_id changes on assets
-- ============================================================
create or replace function public.sync_asset_location()
returns trigger language plpgsql as $$
declare
  v_floor_id  uuid;
  v_building_id uuid;
begin
  if new.room_id is not null and (old.room_id is distinct from new.room_id) then
    select f.id, f.building_id
    into v_floor_id, v_building_id
    from public.rooms r
    join public.floors f on f.id = r.floor_id
    where r.id = new.room_id;

    new.floor_id    := v_floor_id;
    new.building_id := v_building_id;
  end if;
  return new;
end;
$$;

create trigger trg_sync_asset_location
  before insert or update of room_id on public.assets
  for each row execute function public.sync_asset_location();

-- ============================================================
-- TRIGGER: Auto-create profile on new user signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'viewer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
