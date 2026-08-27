#!/usr/bin/env tsx
/**
 * SPIT Asset Management — Excel Import Script
 * 
 * Usage:
 *   npx tsx scripts/import-excel.ts [path-to-xlsx]
 * 
 * - Idempotent: skips already-imported asset_tags
 * - Expands quantity ranges into individual asset rows
 * - Flags ambiguous/missing tags to import_issues table
 * - Requires SUPABASE_SERVICE_ROLE_KEY env var
 */

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const XLSX_PATH = process.argv[2] ?? path.join(__dirname, '../../../asset_management_sheet.xlsx');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const RUN_ID = `import-${Date.now()}`;

// ============================================================
// Type helpers
// ============================================================

interface RawRow {
  srNo:        number | null;
  roomRef:     string | null;
  description: string | null;
  quantity:    string | number | null;
  tag:         string | null;
}

interface ParsedAsset {
  asset_tag:         string;
  name:              string;
  description:       string | null;
  room_key:          string;
  acquisition_year:  number | null;
  original_tag:      string | null;
  source_sheet:      string;
  source_row:        number;
}

interface ImportIssue {
  run_id:       string;
  sheet_name:   string;
  row_number:   number;
  raw_data:     Record<string, unknown>;
  issue_type:   'no_tag' | 'duplicate_tag' | 'ambiguous_range' | 'missing_room' | 'fuzzy_duplicate' | 'parse_error';
  issue_detail: string;
}

// ============================================================
// Floor name detection
// ============================================================

function detectFloor(headerText: string): string {
  const t = headerText.toLowerCase();
  if (t.includes('ground'))  return 'Ground Floor';
  if (t.includes('first'))   return 'First Floor';
  if (t.includes('second'))  return 'Second Floor';
  if (t.includes('third'))   return 'Third Floor';
  if (t.includes('fourth'))  return 'Fourth Floor';
  if (t.includes('fifth'))   return 'Fifth Floor';
  if (t.includes('sixth'))   return 'Sixth Floor';
  if (t.includes('seventh')) return 'Seventh Floor';
  if (t.includes('8th') || t.includes('eighth')) return 'Eighth Floor';
  if (t.includes('faculty room cabin') || t.includes('faculty room cabins')) return 'Sixth Floor';
  return 'Unknown Floor';
}

// ============================================================
// Ditto marker detection
// ============================================================
function isDitto(val: string | null | undefined): boolean {
  if (!val) return false;
  const v = val.trim().toLowerCase();
  return v.startsWith('--') && (v.endsWith('--') || v.endsWith('-'));
}

// ============================================================
// Section header detection
// ============================================================
function isSectionHeader(row: unknown[]): { isHeader: boolean; sectionName: string } {
  // Pattern: col[0]=null, col[1]=null, col[2]=non-null text, col[3]=null
  // OR col[0]='Section: ...'
  const c0 = row[0];
  const c2 = row[2] as string | null;

  if (typeof c0 === 'string' && c0.startsWith('Section:')) {
    return { isHeader: true, sectionName: c0.replace(/^Section:\s*/, '').trim() };
  }
  if (c0 === null && c2 && typeof c2 === 'string') {
    const trimmed = c2.trim();
    if (trimmed.match(/^(Lab Room|Classroom|Big C\.?R\.|Big Classroom|Faculty Room|Passage|Outside Room|Section:|Cabin|Conference|Library|Canteen|Seminar|Server|Reception|Tech Shop|Exam Section|Maint|D-\d+|Apple Lab|8th Floor)/i)) {
      return { isHeader: true, sectionName: trimmed.replace(/^Section:\s*/, '').trim() };
    }
  }
  return { isHeader: false, sectionName: '' };
}

// ============================================================
// Parse quantity — returns a count number
// ============================================================
function parseQuantity(qty: string | number | null): number {
  if (qty === null || qty === undefined) return 1;
  if (typeof qty === 'number') return Math.max(1, Math.round(qty));
  const s = qty.toString().trim();
  // "R-66" pattern → 66
  const rMatch = s.match(/^R-?(\d+)$/i);
  if (rMatch) return parseInt(rMatch[1]);
  const n = parseInt(s);
  return isNaN(n) ? 1 : Math.max(1, n);
}

// ============================================================
// Parse tag field → array of individual tags
// Returns null if can't expand (signals an issue)
// ============================================================
function parseTagField(
  tagRaw: string | null,
  qty: number,
  assetName: string
): { tags: string[]; ambiguous: boolean } {
  if (!tagRaw || tagRaw.trim() === '-' || tagRaw.trim() === '') {
    return { tags: [], ambiguous: false };
  }

  const tag = tagRaw.trim();

  // Single item (qty=1)
  if (qty === 1) {
    return { tags: [tag], ambiguous: false };
  }

  // Check for range: "R-01 to R-20", "01 to 03", "01,02,03", "01,02...N"
  // "SPIT/ASH/001/2023/24/ 235-36 /PR. P./R-01 TO R-20"
  const toRangeMatch = tag.match(/R-?(\d+)\s+TO\s+R-?(\d+)/i) ||
                       tag.match(/(\d+)\s+to\s+(\d+)$/i);
  if (toRangeMatch) {
    const start = parseInt(toRangeMatch[1]);
    const end   = parseInt(toRangeMatch[2]);
    const prefix = tag.replace(/R-?\d+\s+TO\s+R-?\d+.*$/i, '').replace(/\d+\s+to\s+\d+.*$/i, '').trim();
    const tags: string[] = [];
    for (let i = start; i <= end; i++) {
      tags.push(`${prefix}R-${String(i).padStart(2, '0')}`);
    }
    if (tags.length !== qty && tags.length > 0) {
      // Mismatch: use generated range anyway
    }
    return { tags: tags.length > 0 ? tags : [], ambiguous: tags.length === 0 };
  }

  // Comma/dots pattern: "01,02...N" or "01,02,03"
  const commaMatch = tag.match(/(\d+),\s*(\d+)[,.\s]*\.\.\.?\s*(\d+)$/);
  if (commaMatch) {
    const start = parseInt(commaMatch[1]);
    const end   = parseInt(commaMatch[3]);
    const prefix = tag.replace(/\d+,\s*\d+[,.\s]*\.\.\.?\s*\d+$/, '').trim();
    const tags: string[] = [];
    for (let i = start; i <= end; i++) {
      tags.push(`${prefix}${String(i).padStart(2, '0')}`);
    }
    return { tags, ambiguous: false };
  }

  // "01,02" style — comma-separated explicit list
  const commaList = tag.split(',').map(s => s.trim()).filter(Boolean);
  if (commaList.length === qty) {
    return { tags: commaList.map(t => tag.replace(/,.*$/, '').replace(/\d+$/, '').trim() + t), ambiguous: false };
  }

  // Cannot parse range → flag as ambiguous, generate synthetic tags
  const baseTag = tag.replace(/\s+/g, '_');
  const syntheticTags = Array.from({ length: qty }, (_, i) =>
    `${baseTag}__UNIT_${i + 1}`
  );
  return { tags: syntheticTags, ambiguous: true };
}

// ============================================================
// Infer room type from room name
// ============================================================
function inferRoomType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('lab'))            return 'lab';
  if (n.includes('classroom') || n.includes('c.r.') || n.includes('c. r.')) return 'classroom';
  if (n.includes('library'))        return 'library';
  if (n.includes('canteen'))        return 'canteen';
  if (n.includes('seminar'))        return 'seminar_hall';
  if (n.includes('conference'))     return 'conference_room';
  if (n.includes('server'))         return 'server_room';
  if (n.includes('reception'))      return 'reception';
  if (n.includes('passage') || n.includes('outside')) return 'passage';
  if (n.includes('faculty') || n.includes('cabin') || n.includes('sub-cabin')) return 'faculty_room';
  if (n.includes('office') || n.includes('tpo') || n.includes('ccd')) return 'office';
  if (n.includes('store') || n.includes('storage')) return 'storage';
  return 'general';
}

// ============================================================
// Infer acquisition year from tag
// ============================================================
function extractYear(tag: string | null): number | null {
  if (!tag) return null;
  const m = tag.match(/\b(20\d{2})\b/);
  return m ? parseInt(m[1]) : null;
}

// ============================================================
// Category inference from asset name
// ============================================================
function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('table') || n.includes('chair') || n.includes('bench') ||
      n.includes('stool') || n.includes('desk') || n.includes('sofa') ||
      n.includes('cabinet') || n.includes('cupboard') || n.includes('locker') ||
      n.includes('teepoy') || n.includes('podium') || n.includes('trolley') ||
      n.includes('shelf') || n.includes('rack') || n.includes('platform'))
    return 'Furniture';
  if (n.includes('a.c.') || n.includes('ac ') || n.includes('air condition') ||
      n.includes('cooler') || n.includes('fan'))
    return 'Air Conditioning';
  if (n.includes('computer') || n.includes('printer') || n.includes('scanner') ||
      n.includes('desktop') || n.includes('laptop') || n.includes('keyboard') ||
      n.includes('monitor') || n.includes('server'))
    return 'Computers & Peripherals';
  if (n.includes('smart board') || n.includes('tv') || n.includes('board') ||
      n.includes('display') || n.includes('notice') || n.includes('projector') ||
      n.includes('whiteboard') || n.includes('pinup'))
    return 'Notice Boards & Displays';
  if (n.includes('refrigerator') || n.includes('microwave') || n.includes('aquaguard') ||
      n.includes('water') || n.includes('oven'))
    return 'Appliances';
  return 'General';
}

// ============================================================
// Main import
// ============================================================
async function runImport() {
  console.log(`\n🏗  SPIT Asset Management — Excel Import`);
  console.log(`📁 File: ${XLSX_PATH}`);
  console.log(`🔑 Run ID: ${RUN_ID}\n`);

  if (!fs.existsSync(XLSX_PATH)) {
    console.error(`ERROR: File not found: ${XLSX_PATH}`);
    process.exit(1);
  }

  // Load workbook
  const wb = XLSX.readFile(XLSX_PATH);
  console.log(`📋 Sheets: ${wb.SheetNames.length}`);

  // Get institution
  const { data: institution } = await supabase
    .from('institutions')
    .select('id')
    .eq('code', 'SPIT')
    .single();

  if (!institution) {
    console.error('ERROR: Run seed.sql first to create the institution record');
    process.exit(1);
  }

  // Get building
  const { data: buildingData } = await supabase
    .from('buildings')
    .select('id')
    .eq('institution_id', institution.id)
    .single();

  if (!buildingData) {
    console.error('ERROR: Run seed.sql first to create the building record');
    process.exit(1);
  }
  // Non-null assertion safe here — process.exit() above guarantees it
  const building = buildingData as { id: string };

  // Load existing data
  const { data: existingFloors } = await supabase
    .from('floors')
    .select('id, name, level')
    .eq('building_id', building.id);

  const { data: existingRooms } = await supabase
    .from('rooms')
    .select('id, name, room_number, floor_id')
    .eq('building_id', building.id);

  const { data: existingAssetTags } = await supabase
    .from('assets')
    .select('asset_tag');

  const { data: existingCategories } = await supabase
    .from('asset_categories')
    .select('id, name');

  const knownTags = new Set((existingAssetTags ?? []).map((a: any) => a.asset_tag));
  const floorMap = new Map<string, string>(); // floor name → id
  const roomMap  = new Map<string, string>(); // "room_number|floor_name" → id
  const catMap   = new Map<string, string>(); // category name → id

  (existingFloors ?? []).forEach((f: any) => floorMap.set(f.name, f.id));
  (existingRooms ?? []).forEach((r: any) => {
    const floor = (existingFloors ?? []).find((f: any) => f.id === r.floor_id);
    if (floor) roomMap.set(`${r.room_number}|${floor.name}`, r.id);
    roomMap.set(`${r.name}|${floor?.name ?? ''}`, r.id);
  });
  (existingCategories ?? []).forEach((c: any) => catMap.set(c.name, c.id));

  // Upsert helper functions
  async function ensureFloor(name: string, level: number): Promise<string> {
    if (floorMap.has(name)) return floorMap.get(name)!;
    const { data, error } = await supabase
      .from('floors')
      .upsert({ building_id: building.id, name, level }, { onConflict: 'building_id,level' })
      .select('id')
      .single();
    if (error || !data) throw new Error(`Failed to create floor "${name}": ${error?.message}`);
    floorMap.set(name, data.id);
    return data.id;
  }

  async function ensureRoom(roomName: string, roomNumber: string | null, floorId: string, floorName: string): Promise<string> {
    const key = roomNumber ? `${roomNumber}|${floorName}` : `${roomName}|${floorName}`;
    if (roomMap.has(key)) return roomMap.get(key)!;
    const roomType = inferRoomType(roomName);
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        floor_id:    floorId,
        building_id: building.id,
        name:        roomName,
        room_number: roomNumber,
        room_type:   roomType,
      })
      .select('id')
      .single();
    if (error || !data) {
      // May already exist (race); try to fetch
      const { data: existing } = await supabase
        .from('rooms')
        .select('id')
        .eq('floor_id', floorId)
        .eq('name', roomName)
        .single();
      if (existing) {
        roomMap.set(key, existing.id);
        return existing.id;
      }
      throw new Error(`Failed to create room "${roomName}": ${error?.message}`);
    }
    roomMap.set(key, data.id);
    return data.id;
  }

  async function ensureCategory(name: string): Promise<string> {
    if (catMap.has(name)) return catMap.get(name)!;
    const code = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
    const { data, error } = await supabase
      .from('asset_categories')
      .upsert({ name, code }, { onConflict: 'name' })
      .select('id')
      .single();
    if (error || !data) throw new Error(`Failed to create category "${name}": ${error?.message}`);
    catMap.set(name, data.id);
    return data.id;
  }

  // ============================================================
  // Parse all sheets
  // ============================================================

  const FLOOR_LEVELS: Record<string, number> = {
    'Ground Floor': 0, 'First Floor': 1, 'Second Floor': 2,
    'Third Floor': 3, 'Fourth Floor': 4, 'Fifth Floor': 5,
    'Sixth Floor': 6, 'Seventh Floor': 7, 'Eighth Floor': 8,
  };

  let sheetsProcessed  = 0;
  let roomsFound       = new Set<string>();
  let assetsCreated    = 0;
  let assetsSkipped    = 0;
  let issueCount       = 0;
  const issues: ImportIssue[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

    if (!rows || rows.length < 2) continue;
    sheetsProcessed++;

    // Detect floor from row 0
    const firstCell = (rows[0] as unknown[])[0];
    const floorName = (typeof firstCell === 'string' && firstCell.trim())
      ? detectFloor(firstCell)
      : 'Unknown Floor';
    const floorLevel = FLOOR_LEVELS[floorName] ?? 0;

    let currentFloorId: string | null = null;
    let currentFloorName = floorName;
    let currentRoomId: string | null = null;
    let currentRoomName: string | null = null;
    let currentRoomNumber: string | null = null;

    // Ensure floor
    try {
      currentFloorId = await ensureFloor(floorName, floorLevel);
    } catch (e) {
      console.warn(`  ⚠ Could not create floor "${floorName}": ${e}`);
      continue;
    }

    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx] as unknown[];
      if (!row || !row.some(c => c !== null && c !== undefined && c !== '')) continue;

      // Check for section header
      const { isHeader, sectionName } = isSectionHeader(row);
      if (isHeader) {
        currentRoomName   = sectionName;
        currentRoomNumber = extractRoomNumber(sectionName);
        currentRoomId     = null; // will be lazily created
        roomsFound.add(sectionName);
        continue;
      }

      // Skip column header rows
      if (row[0] === 'Sr. No.' || row[1] === 'Room No.') continue;

      // Parse data row
      const srNo       = row[0] as number | null;
      const roomRef    = row[1] as string | null;
      const description = row[2] as string | null;
      const quantity   = row[3] as string | number | null;
      const tagRaw     = row[4] as string | null;

      if (!description || typeof description !== 'string') continue;
      const desc = description.trim();
      if (!desc) continue;

      // Update current room reference if not ditto
      if (roomRef && !isDitto(String(roomRef))) {
        const newRoomRef = String(roomRef).trim();
        if (newRoomRef && newRoomRef !== currentRoomNumber) {
          // Might be a room number or name update
          const roomNum = extractRoomNumber(newRoomRef);
          if (roomNum) {
            currentRoomNumber = roomNum;
            currentRoomName   = `Room ${roomNum}`;
          } else if (newRoomRef.length > 3) {
            currentRoomName   = newRoomRef;
            currentRoomNumber = null;
          }
          currentRoomId = null;
        }
      }

      // Ensure room exists
      if (!currentRoomId && currentRoomName && currentFloorId) {
        try {
          currentRoomId = await ensureRoom(
            currentRoomName,
            currentRoomNumber,
            currentFloorId,
            currentFloorName
          );
          roomsFound.add(currentRoomName);
        } catch (e) {
          issues.push({
            run_id: RUN_ID, sheet_name: sheetName, row_number: rowIdx + 1,
            raw_data: { srNo, roomRef, description: desc, quantity, tagRaw },
            issue_type: 'missing_room',
            issue_detail: `Could not create room "${currentRoomName}": ${e}`,
          });
          issueCount++;
          continue;
        }
      }

      // Parse quantity
      const qty = parseQuantity(quantity);

      // Parse tags
      const { tags, ambiguous } = parseTagField(tagRaw, qty, desc);

      // Infer category
      const categoryName = inferCategory(desc);
      let categoryId: string | null = null;
      try {
        categoryId = await ensureCategory(categoryName);
      } catch { /* non-fatal */ }

      const acqYear = extractYear(tagRaw);

      if (tags.length === 0) {
        // No tag — flag as issue
        issues.push({
          run_id: RUN_ID, sheet_name: sheetName, row_number: rowIdx + 1,
          raw_data: { srNo, roomRef, description: desc, quantity, tagRaw },
          issue_type: 'no_tag',
          issue_detail: `No asset tag found for "${desc}" (qty ${qty})`,
        });
        issueCount++;
        continue;
      }

      if (ambiguous) {
        issues.push({
          run_id: RUN_ID, sheet_name: sheetName, row_number: rowIdx + 1,
          raw_data: { srNo, roomRef, description: desc, quantity, tagRaw },
          issue_type: 'ambiguous_range',
          issue_detail: `Could not parse tag range "${tagRaw}" for qty ${qty}`,
        });
        issueCount++;
        // Still proceed with synthetic tags
      }

      // Insert individual asset rows
      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i].trim().replace(/\s+/g, ' ');
        const assetName = qty > 1 ? `${desc} — ${tag.split('/').pop() ?? i + 1}` : desc;

        // Idempotency check
        if (knownTags.has(tag)) {
          assetsSkipped++;
          continue;
        }

        // Check for duplicate tag in this run
        const { data: dup } = await supabase
          .from('assets')
          .select('id')
          .eq('asset_tag', tag)
          .maybeSingle();

        if (dup) {
          knownTags.add(tag);
          assetsSkipped++;
          continue;
        }

        const { error } = await supabase.from('assets').insert({
          institution_id:   institution.id,
          asset_tag:        tag,
          name:             assetName,
          description:      qty > 1 ? `Unit ${i + 1} of ${qty}. ${desc}` : desc,
          category_id:      categoryId,
          room_id:          currentRoomId,
          // building_id and floor_id filled by DB trigger
          status:           'active',
          acquisition_year: acqYear,
          original_tag:     tagRaw,
          source_sheet:     sheetName,
          source_row:       rowIdx + 1,
        });

        if (error) {
          if (error.code === '23505') {
            // Unique violation — already exists
            knownTags.add(tag);
            assetsSkipped++;
          } else {
            issues.push({
              run_id: RUN_ID, sheet_name: sheetName, row_number: rowIdx + 1,
              raw_data: { srNo, description: assetName, tag, error: error.message },
              issue_type: 'parse_error',
              issue_detail: error.message,
            });
            issueCount++;
          }
        } else {
          knownTags.add(tag);
          assetsCreated++;
          if (assetsCreated % 50 === 0) {
            process.stdout.write(`  ✓ ${assetsCreated} assets created so far…\r`);
          }
        }
      }
    }
  }

  // Write import issues to DB
  if (issues.length > 0) {
    const { error } = await supabase.from('import_issues').insert(issues);
    if (error) console.warn('  ⚠ Could not write import issues:', error.message);
  }

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Import Complete — Run ID: ${RUN_ID}`);
  console.log(`${'='.repeat(50)}`);
  console.log(`  Sheets processed:      ${sheetsProcessed}`);
  console.log(`  Rooms found/created:   ${roomsFound.size}`);
  console.log(`  Individual assets created: ${assetsCreated}`);
  console.log(`  Already imported (skipped): ${assetsSkipped}`);
  console.log(`  Records requiring review:   ${issueCount}`);
  console.log(issueCount > 0
    ? `\n  ⚠ Visit /admin/import to review ${issueCount} flagged records\n`
    : `\n  🎉 No issues — clean import!\n`
  );
}

// ============================================================
// Extract room number from section header
// ============================================================
function extractRoomNumber(sectionName: string): string | null {
  const m = sectionName.match(/\b(\d{3}[A-Za-z-]*)\b/);
  return m ? m[1] : null;
}

runImport().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
