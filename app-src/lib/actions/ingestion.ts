'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { AssetStatus } from '@/lib/types';

export interface ValidatedImportRow {
  tempId: string;
  originalRowNumber: number;
  itemIndex: number;
  totalInGroup: number;
  name: string;
  categoryName: string;
  categoryId: string | null;
  categoryCode: string | null;
  assetTag: string | null;
  willAutoTag: boolean;
  acquisitionYear: number | null;
  status: AssetStatus;
  description: string;
  roomId: string | null;
  roomName: string;
  roomNumber: string | null;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationReport {
  totalOriginalRows: number;
  totalExpandedItems: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  targetRoom: { id: string; name: string; room_number: string | null } | null;
  rows: ValidatedImportRow[];
}

// ── Common Category Aliases for Smart Fuzzy Matching ────────────────────────
const CATEGORY_ALIASES: Record<string, string> = {
  pc: 'computer',
  desktop: 'computer',
  workstation: 'computer',
  screen: 'monitor',
  display: 'monitor',
  lcd: 'monitor',
  led: 'monitor',
  ac: 'air conditioner',
  'a/c': 'air conditioner',
  desk: 'furniture',
  chair: 'furniture',
  table: 'furniture',
  cupboard: 'furniture',
  shelf: 'furniture',
  switch: 'networking',
  router: 'networking',
  accesspoint: 'networking',
  projector: 'projector',
};

async function getCurrentUserAndProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, institution_id')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');
  return { user, profile, supabase };
}

// ============================================================
// 1. PRE-FLIGHT VALIDATION ENGINE (Safety Railroads)
// ============================================================
export async function validateAssetImport({
  rawRows,
  targetRoomId,
}: {
  rawRows: Record<string, any>[];
  targetRoomId?: string;
}): Promise<ValidationReport> {
  const { profile, supabase } = await getCurrentUserAndProfile();

  if (!['asset_manager', 'approver'].includes(profile.role)) {
    throw new Error('Unauthorized: Only Asset Managers and Approvers can ingest assets.');
  }

  // Load reference categories and rooms
  const [categoriesRes, roomsRes] = await Promise.all([
    supabase.from('asset_categories').select('id, name, code').order('name'),
    supabase.from('rooms').select('id, name, room_number').order('name'),
  ]);

  const categories = categoriesRes.data ?? [];
  const rooms = roomsRes.data ?? [];

  const targetRoom = targetRoomId ? rooms.find((r) => r.id === targetRoomId) || null : null;

  // Extract explicit tags provided in file to batch-check for DB duplicates
  const explicitTagsInFile: string[] = [];
  rawRows.forEach((r) => {
    const rawTag = (
      r['Asset Tag (Leave blank to auto-generate)'] ||
      r['Asset Tag'] ||
      r['asset_tag'] ||
      r['Tag'] ||
      ''
    ).toString().trim();
    if (rawTag) explicitTagsInFile.push(rawTag);
  });

  // Query existing tags from database
  let existingDbTags = new Set<string>();
  if (explicitTagsInFile.length > 0) {
    const { data: dbAssets } = await supabase
      .from('assets')
      .select('asset_tag')
      .in('asset_tag', explicitTagsInFile);

    if (dbAssets) {
      existingDbTags = new Set(dbAssets.map((a) => a.asset_tag.toLowerCase()));
    }
  }

  const seenTagsInFile = new Map<string, number>();
  const validatedRows: ValidatedImportRow[] = [];
  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  let rowCounter = 1; // 1-indexed for spreadsheet row numbers

  for (const raw of rawRows) {
    rowCounter++;

    // Normalize keys
    const name = (
      raw['Asset Name *'] ||
      raw['Asset Name'] ||
      raw['name'] ||
      raw['Item Description'] ||
      ''
    ).toString().trim();

    const categoryInput = (
      raw['Category *'] ||
      raw['Category'] ||
      raw['category'] ||
      raw['Category Name'] ||
      ''
    ).toString().trim();

    const rawTag = (
      raw['Asset Tag (Leave blank to auto-generate)'] ||
      raw['Asset Tag'] ||
      raw['asset_tag'] ||
      raw['Tag'] ||
      ''
    ).toString().trim();

    const rawYear = raw['Acquisition Year'] || raw['Year'] || raw['acquisition_year'];
    const rawStatus = (
      raw['Status (Active/Maintenance/Damaged/Retired)'] ||
      raw['Status'] ||
      raw['status'] ||
      'active'
    ).toString().trim().toLowerCase();

    const description = (
      raw['Description / Specifications'] ||
      raw['Description'] ||
      raw['description'] ||
      raw['Specs'] ||
      ''
    ).toString().trim();

    const rawQuantity =
      raw['Quantity (Defaults to 1; >1 auto-expands into serial items)'] ||
      raw['Quantity'] ||
      raw['quantity'] ||
      raw['Qty'] ||
      1;

    const rawRoomInput = (
      raw['Room Number or Room Name'] ||
      raw['Room'] ||
      raw['room'] ||
      raw['Room Number'] ||
      ''
    ).toString().trim();

    // Parse Quantity (safe range: 1 to 100)
    let parsedQty = 1;
    if (typeof rawQuantity === 'number' && !isNaN(rawQuantity)) {
      parsedQty = Math.max(1, Math.min(100, Math.floor(rawQuantity)));
    } else if (typeof rawQuantity === 'string') {
      const q = parseInt(rawQuantity, 10);
      if (!isNaN(q)) parsedQty = Math.max(1, Math.min(100, q));
    }

    // Parse Acquisition Year
    let parsedYear: number | null = null;
    if (rawYear) {
      const y = parseInt(rawYear.toString(), 10);
      const currentYear = new Date().getFullYear();
      if (!isNaN(y) && y >= 1970 && y <= currentYear + 2) {
        parsedYear = y;
      }
    }

    // Parse Status
    let status: AssetStatus = 'active';
    if (['under_maintenance', 'maintenance'].includes(rawStatus)) status = 'under_maintenance';
    else if (['damaged', 'faulty'].includes(rawStatus)) status = 'damaged';
    else if (['retired', 'disposed', 'obsolete'].includes(rawStatus)) status = 'retired';
    else if (['missing', 'lost'].includes(rawStatus)) status = 'missing';

    // Match Category
    let matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === categoryInput.toLowerCase() || c.code.toLowerCase() === categoryInput.toLowerCase()
    );

    if (!matchedCategory && categoryInput) {
      // Try alias match
      const aliasKey = categoryInput.toLowerCase().replace(/[^a-z0-9]/g, '');
      const mappedName = CATEGORY_ALIASES[aliasKey];
      if (mappedName) {
        matchedCategory = categories.find((c) => c.name.toLowerCase().includes(mappedName));
      }
    }

    // Match Room
    let matchedRoom = targetRoom;
    if (!matchedRoom && rawRoomInput) {
      matchedRoom =
        rooms.find(
          (r) =>
            (r.room_number && r.room_number.toLowerCase() === rawRoomInput.toLowerCase()) ||
            r.name.toLowerCase() === rawRoomInput.toLowerCase() ||
            r.name.toLowerCase().includes(rawRoomInput.toLowerCase())
        ) || null;
    }

    // Expand quantity rows into distinct validated records
    for (let itemIdx = 1; itemIdx <= parsedQty; itemIdx++) {
      const rowErrors: string[] = [];
      const rowWarnings: string[] = [];

      // Required field checks
      if (!name) {
        rowErrors.push('Missing required field: "Asset Name"');
      }

      if (!categoryInput) {
        rowErrors.push('Missing required field: "Category"');
      } else if (!matchedCategory) {
        rowWarnings.push(`Unknown category "${categoryInput}" — will be categorized as "General"`);
      }

      if (!matchedRoom) {
        rowErrors.push(
          rawRoomInput
            ? `Room "${rawRoomInput}" could not be identified in the campus directory`
            : 'No room assigned. Please select or specify a destination room.'
        );
      }

      if (rawYear && !parsedYear) {
        rowWarnings.push(`Invalid acquisition year "${rawYear}". Accepted range: 1970–${new Date().getFullYear() + 1}`);
      }

      // Tag validation & collision detection
      // Tag validation & collision detection
      let finalTag: string | null = null;
      const willAutoTag = false;

      if (!rawTag) {
        // User requirement: Leave asset tags blank if not provided in the spreadsheet
        finalTag = null;
      } else {
        // If quantity was > 1, append suffix to explicit tag to prevent intra-sheet collisions
        const tagCandidate = parsedQty > 1 ? `${rawTag}-${itemIdx}` : rawTag;
        const tagLower = tagCandidate.toLowerCase();

        if (seenTagsInFile.has(tagLower)) {
          rowErrors.push(`Duplicate tag "${tagCandidate}" in spreadsheet (first seen at row ${seenTagsInFile.get(tagLower)})`);
        } else {
          seenTagsInFile.set(tagLower, rowCounter);
        }

        if (existingDbTags.has(tagLower)) {
          rowErrors.push(`Asset tag "${tagCandidate}" already exists in the institutional database`);
        }

        finalTag = tagCandidate;
      }

      const isRowValid = rowErrors.length === 0;
      if (isRowValid) validCount++;
      else errorCount++;
      if (rowWarnings.length > 0) warningCount++;

      const displayName = parsedQty > 1 ? `${name} (#${itemIdx}/${parsedQty})` : name;

      validatedRows.push({
        tempId: `row-${rowCounter}-${itemIdx}-${Math.random().toString(36).substring(2, 7)}`,
        originalRowNumber: rowCounter,
        itemIndex: itemIdx,
        totalInGroup: parsedQty,
        name: displayName,
        categoryName: matchedCategory ? matchedCategory.name : categoryInput || 'General',
        categoryId: matchedCategory ? matchedCategory.id : categories[0]?.id || null,
        categoryCode: matchedCategory ? matchedCategory.code : 'GEN',
        assetTag: finalTag,
        willAutoTag,
        acquisitionYear: parsedYear,
        status,
        description,
        roomId: matchedRoom ? matchedRoom.id : null,
        roomName: matchedRoom ? matchedRoom.name : rawRoomInput || 'Unassigned',
        roomNumber: matchedRoom ? matchedRoom.room_number : null,
        isValid: isRowValid,
        errors: rowErrors,
        warnings: rowWarnings,
      });
    }
  }

  return {
    totalOriginalRows: rawRows.length,
    totalExpandedItems: validatedRows.length,
    validCount,
    warningCount,
    errorCount,
    targetRoom: targetRoom ? { id: targetRoom.id, name: targetRoom.name, room_number: targetRoom.room_number } : null,
    rows: validatedRows,
  };
}

// ============================================================
// 2. SAFE COMMIT ENGINE (Transaction Execution)
// ============================================================
export async function commitAssetImport({
  items,
  skipErrors = false,
  sourceFileName = 'Room_Asset_Ingestion.xlsx',
}: {
  items: ValidatedImportRow[];
  skipErrors?: boolean;
  sourceFileName?: string;
}) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!['asset_manager', 'approver'].includes(profile.role)) {
    throw new Error('Unauthorized: Only Asset Managers and Approvers can commit asset imports.');
  }

  // Filter items to commit
  const candidates = skipErrors ? items.filter((item) => item.isValid) : items;

  if (candidates.length === 0) {
    throw new Error('No valid items to import.');
  }

  if (!skipErrors && candidates.some((item) => !item.isValid)) {
    throw new Error('Validation safety halt: Spreadsheet contains error rows. Fix errors or enable "Skip invalid rows".');
  }

  const admin = createAdminClient();

  const assetsToInsert: any[] = [];

  for (const item of candidates) {
    const finalTag = item.assetTag && item.assetTag.trim() !== '' ? item.assetTag.trim() : null;

    assetsToInsert.push({
      institution_id: profile.institution_id,
      asset_tag: finalTag,
      name: item.name,
      description: item.description || null,
      category_id: item.categoryId,
      room_id: item.roomId,
      status: item.status,
      acquisition_year: item.acquisitionYear,
      original_tag: item.assetTag || null,
      source_sheet: 'Asset Ingestion',
      source_row: item.originalRowNumber,
    });
  }

  // Batch Insert into Assets table in chunks of 50
  const CHUNK_SIZE = 50;
  const insertedAssets: any[] = [];

  for (let i = 0; i < assetsToInsert.length; i += CHUNK_SIZE) {
    const chunk = assetsToInsert.slice(i, i + CHUNK_SIZE);
    const { data: createdChunk, error: insertErr } = await admin
      .from('assets')
      .insert(chunk)
      .select('id, asset_tag, name, room_id');

    if (insertErr) {
      console.error('Batch insert error:', insertErr);
      if (insertErr.message?.includes('null value in column "asset_tag"') || insertErr.code === '23502') {
        throw new Error(
          'Database constraint error: asset_tag currently has NOT NULL enabled in Supabase. Please run "ALTER TABLE public.assets ALTER COLUMN asset_tag DROP NOT NULL;" in your Supabase SQL editor to allow blank asset tags.'
        );
      }
      throw new Error(`Database insert failed: ${insertErr.message}`);
    }

    if (createdChunk) {
      insertedAssets.push(...createdChunk);
    }
  }

  // 3. Batch Insert Audit History Events
  const historyRecords = insertedAssets.map((a) => ({
    asset_id: a.id,
    event_type: 'creation',
    occurred_at: new Date().toISOString(),
    performed_by: user.id,
    approved_by: profile.role === 'approver' ? user.id : null,
    to_location: { room_id: a.room_id },
    reason: `Room-wise bulk Excel ingestion (${sourceFileName})`,
    metadata: {
      source_file: sourceFileName,
      ingested_by: user.id,
      batch_size: insertedAssets.length,
    },
  }));

  for (let i = 0; i < historyRecords.length; i += CHUNK_SIZE) {
    const histChunk = historyRecords.slice(i, i + CHUNK_SIZE);
    await admin.from('asset_history').insert(histChunk);
  }

  // Revalidate relevant pages
  revalidatePath('/inventory');
  revalidatePath('/locations/rooms');
  revalidatePath('/dashboard');
  revalidatePath('/admin/import');

  // If items had roomIds, revalidate those specific room pages
  const uniqueRoomIds = Array.from(new Set(insertedAssets.map((a) => a.room_id).filter(Boolean)));
  uniqueRoomIds.forEach((rId) => {
    revalidatePath(`/locations/rooms/${rId}`);
  });

  return {
    success: true,
    importedCount: insertedAssets.length,
    skippedCount: items.length - candidates.length,
    firstTag: insertedAssets[0]?.asset_tag,
    lastTag: insertedAssets[insertedAssets.length - 1]?.asset_tag,
  };
}
