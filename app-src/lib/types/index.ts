// ============================================================
// Database Types — mirrors the Postgres schema exactly
// ============================================================

export type UserRole = 'viewer' | 'asset_manager' | 'approver';

export type AssetStatus =
  | 'active'
  | 'under_maintenance'
  | 'missing'
  | 'damaged'
  | 'transferred'
  | 'retired'
  | 'disposed';

export type RequestType = 'addition' | 'transfer' | 'edit' | 'deletion';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type RoomType =
  | 'classroom'
  | 'lab'
  | 'office'
  | 'faculty_room'
  | 'cabin'
  | 'library'
  | 'canteen'
  | 'seminar_hall'
  | 'conference_room'
  | 'server_room'
  | 'reception'
  | 'passage'
  | 'storage'
  | 'general';

export type AssetHistoryEventType =
  | 'creation'
  | 'addition_approved'
  | 'transfer_requested'
  | 'transfer_approved'
  | 'transfer_rejected'
  | 'room_change'
  | 'edit_requested'
  | 'edit_approved'
  | 'edit_rejected'
  | 'photo_uploaded'
  | 'photo_replaced'
  | 'photo_deleted'
  | 'deletion_requested'
  | 'deletion_approved'
  | 'deletion_rejected'
  | 'status_change'
  | 'admin_change';

export type ImportIssueType =
  | 'no_tag'
  | 'duplicate_tag'
  | 'ambiguous_range'
  | 'missing_room'
  | 'fuzzy_duplicate'
  | 'parse_error';

// ============================================================
// Database Row Types
// ============================================================

export interface Institution {
  id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  institution_id: string | null;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  employee_id: string | null;
  department: string | null;
  phone_number?: string | null;
  designation?: string | null;
  status?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: string;
  institution_id: string;
  name: string;
  code: string;
  address: string | null;
  floors_count: number;
  created_at: string;
  updated_at: string;
}

export interface Floor {
  id: string;
  building_id: string;
  name: string;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  floor_id: string;
  building_id: string;
  name: string;
  room_number: string | null;
  room_type: RoomType;
  capacity: number | null;
  created_at: string;
  updated_at: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
}

export interface Asset {
  id: string;
  institution_id: string;
  asset_tag: string;
  name: string;
  description: string | null;
  category_id: string | null;
  building_id: string | null;
  floor_id: string | null;
  room_id: string | null;
  status: AssetStatus;
  acquisition_year: number | null;
  original_tag: string | null;
  source_sheet: string | null;
  source_row: number | null;
  primary_photo_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetPhoto {
  id: string;
  asset_id: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  is_primary: boolean;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface ChangeRequest {
  id: string;
  institution_id: string;
  type: RequestType;
  status: RequestStatus;
  asset_id: string | null;
  requested_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  reason: string;
  new_values: Record<string, unknown>;
  old_values: Record<string, unknown> | null;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetMovement {
  id: string;
  asset_id: string;
  from_room_id: string | null;
  to_room_id: string;
  from_building_id: string | null;
  to_building_id: string | null;
  moved_by: string | null;
  approved_by: string | null;
  request_id: string | null;
  moved_at: string;
}

export interface AssetHistory {
  id: string;
  asset_id: string;
  event_type: AssetHistoryEventType;
  occurred_at: string;
  performed_by: string | null;
  approved_by: string | null;
  from_location: Record<string, unknown> | null;
  to_location: Record<string, unknown> | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  metadata: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  performed_by: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

export interface ImportIssue {
  id: string;
  run_id: string;
  sheet_name: string;
  row_number: number;
  raw_data: Record<string, unknown>;
  issue_type: ImportIssueType;
  issue_detail: string | null;
  status: 'pending' | 'imported' | 'merged' | 'skipped';
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

// ============================================================
// Enriched/Joined Types (for UI)
// ============================================================

export interface AssetWithRelations extends Asset {
  category?: AssetCategory | null;
  room?: Room | null;
  floor?: Floor | null;
  building?: Building | null;
  primary_photo?: AssetPhoto | null;
}

export interface ChangeRequestWithRelations extends ChangeRequest {
  asset?: Asset | null;
  requester?: Profile | null;
  reviewer?: Profile | null;
}

export interface RoomWithCounts extends Room {
  floor?: Floor | null;
  building?: Building | null;
  asset_count?: number;
}

export interface FloorWithCounts extends Floor {
  building?: Building | null;
  room_count?: number;
  asset_count?: number;
}

export interface BuildingWithCounts extends Building {
  floor_count?: number;
  room_count?: number;
  asset_count?: number;
}

// ============================================================
// Form / Action Input Types
// ============================================================

export interface AddAssetFormData {
  name: string;
  asset_tag?: string;
  category_id: string;
  room_id: string;
  acquisition_year?: number;
  status: AssetStatus;
  description?: string;
  reason: string;
}

export interface TransferRequestFormData {
  asset_id: string;
  to_room_id: string;
  reason: string;
}

export interface EditRequestFormData {
  asset_id: string;
  name?: string;
  description?: string;
  category_id?: string;
  acquisition_year?: number;
  reason: string;
}

export interface DeleteRequestFormData {
  asset_id: string;
  disposition: 'retired' | 'disposed';
  reason: string;
}

// ============================================================
// Dashboard Stats
// ============================================================

export interface DashboardStats {
  total_assets: number;
  active_assets: number;
  total_rooms: number;
  total_buildings: number;
  pending_approvals: number;
  recent_transfers: number;
}

// ============================================================
// Search Result
// ============================================================

export interface SearchResult {
  id: string;
  type: 'asset' | 'room' | 'building';
  title: string;
  subtitle: string;
  href: string;
  status?: AssetStatus;
}

// ============================================================
// Pagination
// ============================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================
// Account Onboarding Requests
// ============================================================

export interface AccountRequest {
  id: string;
  institution_id?: string | null;
  full_name: string;
  email: string;
  requested_role: UserRole;
  department: string;
  designation?: string | null;
  phone_number?: string | null;
  employee_id?: string | null;
  reason?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}
