import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    // Fetch reference data: categories, rooms, and target room if provided
    const [categoriesRes, roomsRes, targetRoomRes] = await Promise.all([
      supabase
        .from('asset_categories')
        .select('name, code, description')
        .order('name'),
      supabase
        .from('rooms')
        .select('id, name, room_number, room_type, floor:floors(name, building:buildings(name))')
        .order('name'),
      roomId
        ? supabase
            .from('rooms')
            .select('id, name, room_number, floor:floors(name, building:buildings(name))')
            .eq('id', roomId)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const categories = categoriesRes.data ?? [];
    const allRooms = roomsRes.data ?? [];
    const targetRoom = targetRoomRes.data;

    const workbook = XLSX.utils.book_new();

    // ── 1. Main Sheet: Asset Ingestion ──────────────────────────────────────────
    const targetRoomLabel = targetRoom
      ? `${targetRoom.name}${targetRoom.room_number ? ` (${targetRoom.room_number})` : ''}`
      : 'Lab 603 (Computer Lab)';

    const sampleRows = [
      {
        'Asset Name *': 'Dell OptiPlex 7090 Desktop',
        'Category *': 'Computer',
        'Asset Tag (Leave blank to auto-generate)': '',
        'Acquisition Year': 2024,
        'Status (Active/Maintenance/Damaged/Retired)': 'Active',
        'Description / Specifications': 'Core i7 11th Gen, 16GB RAM, 512GB SSD',
        'Quantity (Defaults to 1; >1 auto-expands into serial items)': 2,
        'Room Number or Room Name': targetRoom ? targetRoom.room_number || targetRoom.name : 'Lab 603',
      },
      {
        'Asset Name *': 'Sony High-Res LCD Projector',
        'Category *': 'Projector',
        'Asset Tag (Leave blank to auto-generate)': 'SPIT/PROJ/2023/001',
        'Acquisition Year': 2023,
        'Status (Active/Maintenance/Damaged/Retired)': 'Active',
        'Description / Specifications': 'Ceiling mounted with HDMI/VGA switchbox',
        'Quantity (Defaults to 1; >1 auto-expands into serial items)': 1,
        'Room Number or Room Name': targetRoom ? targetRoom.room_number || targetRoom.name : 'Lab 603',
      },
      {
        'Asset Name *': 'Daikin 2.0 Ton Split Air Conditioner',
        'Category *': 'Air Conditioner',
        'Asset Tag (Leave blank to auto-generate)': '',
        'Acquisition Year': 2022,
        'Status (Active/Maintenance/Damaged/Retired)': 'Active',
        'Description / Specifications': 'Inverter Model, Outdoor compressor on Terrace',
        'Quantity (Defaults to 1; >1 auto-expands into serial items)': 1,
        'Room Number or Room Name': targetRoom ? targetRoom.room_number || targetRoom.name : 'Lab 603',
      },
    ];

    const ingestionSheet = XLSX.utils.json_to_sheet(sampleRows);

    // Set column widths for comfortable editing
    ingestionSheet['!cols'] = [
      { wch: 32 }, // Asset Name
      { wch: 22 }, // Category
      { wch: 36 }, // Asset Tag
      { wch: 18 }, // Acquisition Year
      { wch: 25 }, // Status
      { wch: 42 }, // Description
      { wch: 25 }, // Quantity
      { wch: 28 }, // Room
    ];

    XLSX.utils.book_append_sheet(workbook, ingestionSheet, 'Asset Ingestion');

    // ── 2. Reference Sheet: Valid Categories ────────────────────────────────────
    const categoryRows = categories.map((c) => ({
      'Category Name': c.name,
      'Category Code': c.code,
      Description: c.description || '—',
    }));

    const categorySheet = XLSX.utils.json_to_sheet(
      categoryRows.length > 0
        ? categoryRows
        : [
            { 'Category Name': 'Computer', 'Category Code': 'COMP', Description: 'Desktops, Workstations' },
            { 'Category Name': 'Laptop', 'Category Code': 'LAPT', Description: 'Portable computing devices' },
            { 'Category Name': 'Monitor', 'Category Code': 'MONI', Description: 'LCD/LED displays' },
            { 'Category Name': 'Projector', 'Category Code': 'PROJ', Description: 'Video projectors' },
            { 'Category Name': 'Furniture', 'Category Code': 'FURN', Description: 'Desks, chairs, cabinets' },
            { 'Category Name': 'Air Conditioner', 'Category Code': 'AC', Description: 'Split/Window ACs' },
          ]
    );

    categorySheet['!cols'] = [{ wch: 25 }, { wch: 16 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Valid Categories');

    // ── 3. Reference Sheet: Campus Rooms Directory ──────────────────────────────
    const roomRows = allRooms.map((r: any) => ({
      'Room Number': r.room_number || '—',
      'Room Name': r.name,
      'Room Type': r.room_type || 'General',
      Floor: r.floor?.name || '—',
      Building: r.floor?.building?.name || '—',
    }));

    const roomSheet = XLSX.utils.json_to_sheet(roomRows);
    roomSheet['!cols'] = [
      { wch: 16 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 26 },
    ];
    XLSX.utils.book_append_sheet(workbook, roomSheet, 'Campus Rooms');

    // ── 4. Guide Sheet: Instructions & Railroads ────────────────────────────────
    const instructionRows = [
      {
        'Safety Railroad Rule': '1. Required Fields',
        'Details & Guardrails':
          'Every row MUST have "Asset Name" and "Category". Missing values will trigger a pre-flight railroad stop.',
      },
      {
        'Safety Railroad Rule': '2. Smart Asset Tag Generation',
        'Details & Guardrails':
          'Leave the "Asset Tag" blank to let SPIT auto-generate compliant tags: SPIT/{CATEGORY}/{YEAR}/{COUNTER}. If you provide custom tags, the pre-flight check validates uniqueness against the database.',
      },
      {
        'Safety Railroad Rule': '3. Quantity Auto-Expansion',
        'Details & Guardrails':
          'If Quantity is > 1 (e.g. 10), the ingestion engine expands this row into 10 distinct, individually serialized asset items.',
      },
      {
        'Safety Railroad Rule': '4. Category Matching',
        'Details & Guardrails':
          'Use the exact names listed on the "Valid Categories" sheet. Common abbreviations (e.g. PC -> Computer, AC -> Air Conditioner) are automatically matched by our fuzzy mapper.',
      },
      {
        'Safety Railroad Rule': '5. Room Allocation',
        'Details & Guardrails':
          targetRoom
            ? `This template is pre-configured for ${targetRoomLabel}. All rows will be ingested into this room.`
            : 'Specify the Room Number (e.g. 603, R-01) or Room Name. The ingestion validator checks against active campus facilities.',
      },
      {
        'Safety Railroad Rule': '6. Pre-flight Validation',
        'Details & Guardrails':
          'Uploading the file does NOT immediately save to the database. You will see a live interactive preview table with green (valid), yellow (warning), and red (error) indicators.',
      },
    ];

    const instructionSheet = XLSX.utils.json_to_sheet(instructionRows);
    instructionSheet['!cols'] = [{ wch: 30 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instructions & Railroads');

    // Generate output buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = targetRoom
      ? `SPIT_Asset_Template_${(targetRoom.room_number || targetRoom.name).replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`
      : 'SPIT_Room_Asset_Ingestion_Template.xlsx';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate template' },
      { status: 500 }
    );
  }
}
