-- ============================================================
-- SPIT Asset Management System — Migration 004: SECURITY DEFINER Functions
-- These bypass RLS and are called by server actions (service role).
-- They are the ONLY path to mutating assets/asset_history/asset_movements.
-- ============================================================

-- ============================================================
-- Helper: generate asset tag
-- Format: SPIT/{DEPT_CODE}/{CATEGORY_CODE}/{YYYY}/{SEQUENCE_5DIGITS}
-- ============================================================
create or replace function public.generate_asset_tag(
  p_institution_id uuid,
  p_category_code  text,
  p_year           integer default null
)
returns text language plpgsql security definer as $$
declare
  v_next_val  bigint;
  v_year      text;
  v_tag       text;
begin
  v_year := coalesce(p_year::text, extract(year from now())::text);

  -- Atomic increment
  update public.asset_tag_counters
  set next_val = next_val + 1
  where institution_id = p_institution_id
  returning next_val - 1 into v_next_val;

  if not found then
    insert into public.asset_tag_counters (institution_id, next_val)
    values (p_institution_id, 2)
    returning next_val - 1 into v_next_val;
  end if;

  v_tag := 'SPIT/' || upper(p_category_code) || '/' || v_year || '/' || lpad(v_next_val::text, 5, '0');
  return v_tag;
end;
$$;

-- ============================================================
-- Process ADDITION Approval
-- Transaction: create asset + history + mark request approved
-- ============================================================
create or replace function public.process_addition_approval(
  p_request_id  uuid,
  p_approver_id uuid
)
returns uuid language plpgsql security definer as $$
declare
  v_req         public.change_requests%rowtype;
  v_asset_id    uuid;
  v_tag         text;
  v_new         jsonb;
  v_category_code text;
  v_room        record;
begin
  -- Lock and validate the request (status check in same txn prevents double-apply)
  select * into v_req
  from public.change_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Change request not found: %', p_request_id;
  end if;

  if v_req.status <> 'pending' then
    raise exception 'Request is no longer pending (status: %)', v_req.status;
  end if;

  if v_req.type <> 'addition' then
    raise exception 'Request is not an addition request';
  end if;

  -- Self-approval guard (belt-and-suspenders, RLS also enforces)
  if v_req.requested_by = p_approver_id then
    raise exception 'Approver cannot approve their own request';
  end if;

  v_new := v_req.new_values;

  -- Get or generate asset tag
  v_tag := v_new->>'asset_tag';
  if v_tag is null or trim(v_tag) = '' then
    select code into v_category_code
    from public.asset_categories
    where id = (v_new->>'category_id')::uuid;

    v_tag := public.generate_asset_tag(
      v_req.institution_id,
      coalesce(v_category_code, 'GEN'),
      (v_new->>'acquisition_year')::integer
    );
  end if;

  -- Fetch room location
  select r.id, r.floor_id, f.building_id, r.name, f.name as floor_name, b.name as building_name
  into v_room
  from public.rooms r
  join public.floors f on f.id = r.floor_id
  join public.buildings b on b.id = f.building_id
  where r.id = (v_new->>'room_id')::uuid;

  -- Create the asset
  v_asset_id := uuid_generate_v4();

  insert into public.assets (
    id, institution_id, asset_tag, name, description,
    category_id, room_id, floor_id, building_id,
    status, acquisition_year, original_tag
  ) values (
    v_asset_id,
    v_req.institution_id,
    v_tag,
    v_new->>'name',
    v_new->>'description',
    (v_new->>'category_id')::uuid,
    (v_new->>'room_id')::uuid,
    v_room.floor_id,
    v_room.building_id,
    coalesce(v_new->>'status', 'active'),
    (v_new->>'acquisition_year')::integer,
    v_new->>'original_tag'
  );

  -- Write asset history: creation event
  insert into public.asset_history (
    asset_id, event_type, performed_by, approved_by,
    to_location, new_value, reason, metadata
  ) values (
    v_asset_id,
    'addition_approved',
    v_req.requested_by,
    p_approver_id,
    jsonb_build_object(
      'room_id', v_room.id,
      'floor_id', v_room.floor_id,
      'building_id', v_room.building_id,
      'room_name', v_room.name,
      'floor_name', v_room.floor_name,
      'building_name', v_room.building_name
    ),
    jsonb_build_object('asset_tag', v_tag, 'name', v_new->>'name'),
    v_req.reason,
    jsonb_build_object('request_id', p_request_id)
  );

  -- Mark request approved and link to asset
  update public.change_requests
  set status      = 'approved',
      asset_id    = v_asset_id,
      reviewed_by = p_approver_id,
      reviewed_at = now()
  where id = p_request_id;

  -- Audit log
  insert into public.audit_logs (performed_by, action, entity_type, entity_id, new_value)
  values (p_approver_id, 'addition_approved', 'asset', v_asset_id,
          jsonb_build_object('asset_tag', v_tag, 'request_id', p_request_id));

  return v_asset_id;
end;
$$;

-- ============================================================
-- Process TRANSFER Approval
-- ============================================================
create or replace function public.process_transfer_approval(
  p_request_id  uuid,
  p_approver_id uuid
)
returns void language plpgsql security definer as $$
declare
  v_req       public.change_requests%rowtype;
  v_asset     public.assets%rowtype;
  v_new       jsonb;
  v_to_room   record;
  v_from_loc  jsonb;
  v_to_loc    jsonb;
begin
  select * into v_req from public.change_requests
  where id = p_request_id for update;

  if not found or v_req.status <> 'pending' then
    raise exception 'Request not found or no longer pending';
  end if;

  if v_req.type <> 'transfer' then
    raise exception 'Request is not a transfer request';
  end if;

  if v_req.requested_by = p_approver_id then
    raise exception 'Cannot approve own request';
  end if;

  select * into v_asset from public.assets where id = v_req.asset_id;

  v_new := v_req.new_values;

  select r.id, r.floor_id, f.building_id, r.name, f.name as floor_name, b.name as building_name
  into v_to_room
  from public.rooms r
  join public.floors f on f.id = r.floor_id
  join public.buildings b on b.id = f.building_id
  where r.id = (v_new->>'to_room_id')::uuid;

  -- Capture from/to location snapshots
  v_from_loc := jsonb_build_object(
    'room_id', v_asset.room_id,
    'floor_id', v_asset.floor_id,
    'building_id', v_asset.building_id
  );
  v_to_loc := jsonb_build_object(
    'room_id', v_to_room.id,
    'floor_id', v_to_room.floor_id,
    'building_id', v_to_room.building_id,
    'room_name', v_to_room.name,
    'floor_name', v_to_room.floor_name,
    'building_name', v_to_room.building_name
  );

  -- Move the asset (trigger will sync floor_id/building_id)
  update public.assets
  set room_id = v_to_room.id,
      status  = 'active'
  where id = v_req.asset_id;

  -- Write movement record
  insert into public.asset_movements (
    asset_id, from_room_id, to_room_id,
    from_building_id, to_building_id,
    moved_by, approved_by, request_id
  ) values (
    v_req.asset_id,
    v_asset.room_id, v_to_room.id,
    v_asset.building_id, v_to_room.building_id,
    v_req.requested_by, p_approver_id, p_request_id
  );

  -- History event
  insert into public.asset_history (
    asset_id, event_type, performed_by, approved_by,
    from_location, to_location, reason, metadata
  ) values (
    v_req.asset_id, 'transfer_approved',
    v_req.requested_by, p_approver_id,
    v_from_loc, v_to_loc,
    v_req.reason,
    jsonb_build_object('request_id', p_request_id)
  );

  -- Mark approved
  update public.change_requests
  set status = 'approved', reviewed_by = p_approver_id, reviewed_at = now()
  where id = p_request_id;

  insert into public.audit_logs (performed_by, action, entity_type, entity_id, old_value, new_value)
  values (p_approver_id, 'transfer_approved', 'asset', v_req.asset_id, v_from_loc, v_to_loc);
end;
$$;

-- ============================================================
-- Process EDIT Approval
-- ============================================================
create or replace function public.process_edit_approval(
  p_request_id  uuid,
  p_approver_id uuid
)
returns void language plpgsql security definer as $$
declare
  v_req     public.change_requests%rowtype;
  v_new     jsonb;
  v_old     jsonb;
begin
  select * into v_req from public.change_requests
  where id = p_request_id for update;

  if not found or v_req.status <> 'pending' then
    raise exception 'Request not found or no longer pending';
  end if;

  if v_req.type <> 'edit' then
    raise exception 'Not an edit request';
  end if;

  if v_req.requested_by = p_approver_id then
    raise exception 'Cannot approve own request';
  end if;

  v_new := v_req.new_values;
  v_old := v_req.old_values;

  -- Apply changes (only non-null fields in new_values)
  update public.assets set
    name             = coalesce(v_new->>'name',             name),
    description      = coalesce(v_new->>'description',      description),
    category_id      = coalesce((v_new->>'category_id')::uuid, category_id),
    room_id          = coalesce((v_new->>'room_id')::uuid,  room_id),
    acquisition_year = coalesce((v_new->>'acquisition_year')::integer, acquisition_year),
    status           = coalesce(v_new->>'status',            status)
  where id = v_req.asset_id;

  insert into public.asset_history (
    asset_id, event_type, performed_by, approved_by,
    old_value, new_value, reason, metadata
  ) values (
    v_req.asset_id, 'edit_approved',
    v_req.requested_by, p_approver_id,
    v_old, v_new, v_req.reason,
    jsonb_build_object('request_id', p_request_id)
  );

  update public.change_requests
  set status = 'approved', reviewed_by = p_approver_id, reviewed_at = now()
  where id = p_request_id;

  insert into public.audit_logs (performed_by, action, entity_type, entity_id, old_value, new_value)
  values (p_approver_id, 'edit_approved', 'asset', v_req.asset_id, v_old, v_new);
end;
$$;

-- ============================================================
-- Process DELETION Approval
-- ============================================================
create or replace function public.process_deletion_approval(
  p_request_id   uuid,
  p_approver_id  uuid
)
returns void language plpgsql security definer as $$
declare
  v_req       public.change_requests%rowtype;
  v_new_status text;
begin
  select * into v_req from public.change_requests
  where id = p_request_id for update;

  if not found or v_req.status <> 'pending' then
    raise exception 'Request not found or no longer pending';
  end if;

  if v_req.type <> 'deletion' then
    raise exception 'Not a deletion request';
  end if;

  if v_req.requested_by = p_approver_id then
    raise exception 'Cannot approve own request';
  end if;

  -- Determine final status from new_values.disposition
  v_new_status := coalesce(v_req.new_values->>'disposition', 'retired');

  update public.assets
  set status = v_new_status
  where id = v_req.asset_id;

  insert into public.asset_history (
    asset_id, event_type, performed_by, approved_by,
    old_value, new_value, reason, metadata
  ) values (
    v_req.asset_id, 'deletion_approved',
    v_req.requested_by, p_approver_id,
    jsonb_build_object('status', 'active'),
    jsonb_build_object('status', v_new_status),
    v_req.reason,
    jsonb_build_object('request_id', p_request_id)
  );

  update public.change_requests
  set status = 'approved', reviewed_by = p_approver_id, reviewed_at = now()
  where id = p_request_id;

  insert into public.audit_logs (performed_by, action, entity_type, entity_id, new_value)
  values (p_approver_id, 'deletion_approved', 'asset', v_req.asset_id,
          jsonb_build_object('status', v_new_status, 'reason', v_req.reason));
end;
$$;

-- ============================================================
-- Reject any change request
-- ============================================================
create or replace function public.reject_change_request(
  p_request_id     uuid,
  p_approver_id    uuid,
  p_reason         text
)
returns void language plpgsql security definer as $$
declare
  v_req     public.change_requests%rowtype;
  v_event   text;
begin
  select * into v_req from public.change_requests
  where id = p_request_id for update;

  if not found or v_req.status <> 'pending' then
    raise exception 'Request not found or no longer pending';
  end if;

  if v_req.requested_by = p_approver_id then
    raise exception 'Cannot reject own request';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'Rejection reason is required';
  end if;

  -- Map request type to history event
  v_event := case v_req.type
    when 'transfer' then 'transfer_rejected'
    when 'edit'     then 'edit_rejected'
    when 'deletion' then 'deletion_rejected'
    else                 'edit_rejected'  -- addition rejection: no asset to log against
  end;

  update public.change_requests
  set status           = 'rejected',
      reviewed_by      = p_approver_id,
      reviewed_at      = now(),
      rejection_reason = p_reason
  where id = p_request_id;

  -- Only write asset history if there's an existing asset
  if v_req.asset_id is not null then
    insert into public.asset_history (
      asset_id, event_type, performed_by, approved_by,
      reason, metadata
    ) values (
      v_req.asset_id, v_event,
      v_req.requested_by, p_approver_id,
      p_reason,
      jsonb_build_object('request_id', p_request_id, 'request_type', v_req.type)
    );
  end if;

  insert into public.audit_logs (performed_by, action, entity_type, entity_id, new_value)
  values (p_approver_id, 'request_rejected', 'change_request', p_request_id,
          jsonb_build_object('reason', p_reason, 'type', v_req.type));
end;
$$;

-- ============================================================
-- Record photo event (upload/replace/delete)
-- ============================================================
create or replace function public.record_photo_event(
  p_asset_id    uuid,
  p_event_type  text,
  p_performed_by uuid,
  p_photo_id    uuid,
  p_storage_path text
)
returns void language plpgsql security definer as $$
begin
  insert into public.asset_history (
    asset_id, event_type, performed_by,
    new_value, metadata
  ) values (
    p_asset_id, p_event_type, p_performed_by,
    jsonb_build_object('photo_id', p_photo_id, 'storage_path', p_storage_path),
    jsonb_build_object()
  );
end;
$$;
