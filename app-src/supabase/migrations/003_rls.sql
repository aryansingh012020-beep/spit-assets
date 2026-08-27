-- ============================================================
-- SPIT Asset Management System — Migration 003: RLS Policies
-- ============================================================

-- Enable RLS on all tables
alter table public.institutions       enable row level security;
alter table public.profiles           enable row level security;
alter table public.buildings          enable row level security;
alter table public.floors             enable row level security;
alter table public.rooms              enable row level security;
alter table public.asset_categories   enable row level security;
alter table public.assets             enable row level security;
alter table public.asset_photos       enable row level security;
alter table public.change_requests    enable row level security;
alter table public.asset_movements    enable row level security;
alter table public.asset_history      enable row level security;
alter table public.audit_logs         enable row level security;
alter table public.import_issues      enable row level security;
alter table public.asset_tag_counters enable row level security;

-- ============================================================
-- Helper function: get current user role
-- ============================================================
create or replace function public.current_user_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_institution_id()
returns uuid language sql stable security definer as $$
  select institution_id from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- INSTITUTIONS — read-only for authenticated users
-- ============================================================
create policy "institutions_select_authenticated"
  on public.institutions for select
  using (auth.uid() is not null);

-- ============================================================
-- PROFILES
-- ============================================================
-- Users can see their own profile
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

-- Approvers can see all profiles (for user management)
create policy "profiles_select_approver"
  on public.profiles for select
  using (public.current_user_role() = 'approver');

-- Users can update their own profile (limited fields)
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid()) -- cannot change own role
  );

-- Approvers can update any profile (for role assignment)
create policy "profiles_update_approver"
  on public.profiles for update
  using (public.current_user_role() = 'approver');

-- New profiles created via trigger (SECURITY DEFINER handle_new_user)
create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());

-- ============================================================
-- BUILDINGS — SELECT for authenticated users; mutations via SECURITY DEFINER only
-- ============================================================
create policy "buildings_select_authenticated"
  on public.buildings for select
  using (auth.role() = 'authenticated');

create policy "buildings_insert_approver"
  on public.buildings for insert
  with check (public.current_user_role() = 'approver');

create policy "buildings_update_approver"
  on public.buildings for update
  using (public.current_user_role() = 'approver');

create policy "buildings_delete_approver"
  on public.buildings for delete
  using (public.current_user_role() = 'approver');

-- ============================================================
-- FLOORS
-- ============================================================
create policy "floors_select_authenticated"
  on public.floors for select
  using (auth.role() = 'authenticated');

create policy "floors_insert_approver"
  on public.floors for insert
  with check (public.current_user_role() = 'approver');

create policy "floors_update_approver"
  on public.floors for update
  using (public.current_user_role() = 'approver');

create policy "floors_delete_approver"
  on public.floors for delete
  using (public.current_user_role() = 'approver');

-- ============================================================
-- ROOMS
-- ============================================================
create policy "rooms_select_authenticated"
  on public.rooms for select
  using (auth.role() = 'authenticated');

create policy "rooms_insert_approver"
  on public.rooms for insert
  with check (public.current_user_role() = 'approver');

create policy "rooms_update_approver"
  on public.rooms for update
  using (public.current_user_role() = 'approver');

create policy "rooms_delete_approver"
  on public.rooms for delete
  using (public.current_user_role() = 'approver');

-- ============================================================
-- ASSET CATEGORIES
-- ============================================================
create policy "categories_select_authenticated"
  on public.asset_categories for select
  using (auth.role() = 'authenticated');

create policy "categories_insert_approver"
  on public.asset_categories for insert
  with check (public.current_user_role() = 'approver');

create policy "categories_update_approver"
  on public.asset_categories for update
  using (public.current_user_role() = 'approver');

-- ============================================================
-- ASSETS — read all; write ONLY via SECURITY DEFINER functions
-- ============================================================
create policy "assets_select_authenticated"
  on public.assets for select
  using (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE policies for direct access.
-- All mutations go through SECURITY DEFINER functions in migration 004.

-- ============================================================
-- ASSET PHOTOS — read all; write ONLY via server functions
-- ============================================================
create policy "asset_photos_select_authenticated"
  on public.asset_photos for select
  using (auth.role() = 'authenticated');

-- ============================================================
-- CHANGE REQUESTS
-- ============================================================
-- Read: requesters see own requests; approvers see all
create policy "change_requests_select_own"
  on public.change_requests for select
  using (
    requested_by = auth.uid()
    or public.current_user_role() = 'approver'
  );

-- Insert: asset_manager and approver can submit requests
create policy "change_requests_insert_managers"
  on public.change_requests for insert
  with check (
    public.current_user_role() in ('asset_manager', 'approver')
    and requested_by = auth.uid()
  );

-- Update (approve/reject): ONLY approver, and ONLY on requests they didn't submit
create policy "change_requests_update_approver"
  on public.change_requests for update
  using (
    public.current_user_role() = 'approver'
    and requested_by <> auth.uid()
    and status = 'pending'
  )
  with check (
    public.current_user_role() = 'approver'
    and requested_by <> auth.uid()
  );

-- ============================================================
-- ASSET MOVEMENTS — read all; write ONLY via SECURITY DEFINER functions
-- ============================================================
create policy "asset_movements_select_authenticated"
  on public.asset_movements for select
  using (auth.role() = 'authenticated');

-- ============================================================
-- ASSET HISTORY — read all; NO UPDATE/DELETE; INSERT only via SECURITY DEFINER
-- ============================================================
create policy "asset_history_select_authenticated"
  on public.asset_history for select
  using (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE direct policies — immutability enforced by absence.

-- ============================================================
-- AUDIT LOGS — read only for approver; NO mutations from any role
-- ============================================================
create policy "audit_logs_select_approver"
  on public.audit_logs for select
  using (public.current_user_role() = 'approver');

-- ============================================================
-- IMPORT ISSUES — read/write for approver only
-- ============================================================
create policy "import_issues_select_approver"
  on public.import_issues for select
  using (public.current_user_role() = 'approver');

create policy "import_issues_update_approver"
  on public.import_issues for update
  using (public.current_user_role() = 'approver');

-- ============================================================
-- ASSET TAG COUNTERS — service role only (no direct user access)
-- ============================================================
-- No policies = no user access; service role bypasses RLS.
