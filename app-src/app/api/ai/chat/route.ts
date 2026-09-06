import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AICard } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1].content.trim();
    const queryLower = lastMessage.toLowerCase();

    const supabase = await createClient();

    // ── 1. Retrieve Live Grounding Data from Database ─────────────────
    let dynamicContext = '';
    let directAnswer = '';
    const cards: AICard[] = [];

    // Check for room-specific queries (e.g., "lab 603", "lab 604", "room 101", "hall 301")
    const roomMatch = queryLower.match(/(lab|room|hall|office)\s*(\d+[a-z]?)/i);
    let matchedRooms: any[] = [];

    if (roomMatch) {
      const roomNum = roomMatch[2];
      let roomQuery = supabase
        .from('rooms')
        .select(`
          id, name, room_number, room_type, in_charge_user_id,
          floor:floors(name),
          building:buildings(name),
          assets:assets(id, asset_tag, name, status, category:asset_categories(name)),
          in_charge:profiles!in_charge_user_id(id, full_name, department, designation, role)
        `)
        .ilike('name', `%${roomNum}%`)
        .limit(3);

      let roomData: any[] | null = null;
      const primaryRes = await roomQuery;
      if (primaryRes.error) {
        // Fallback without in_charge join if migration 009 is pending
        const fb = await supabase
          .from('rooms')
          .select(`
            id, name, room_number, room_type,
            floor:floors(name),
            building:buildings(name),
            assets:assets(id, asset_tag, name, status, category:asset_categories(name))
          `)
          .ilike('name', `%${roomNum}%`)
          .limit(3);
        roomData = fb.data;
      } else {
        roomData = primaryRes.data;
      }

      if (roomData && roomData.length > 0) {
        matchedRooms = roomData;
        dynamicContext += `\n[Live Room Data for "${roomNum}"]: ` + JSON.stringify(roomData);

        // Generate interactive Room Cards
        matchedRooms.forEach((r: any) => {
          const inCharge = r.in_charge
            ? Array.isArray(r.in_charge)
              ? r.in_charge[0]
              : r.in_charge
            : null;

          cards.push({
            id: `room-${r.id}`,
            type: 'room',
            title: r.name,
            subtitle: `${r.floor?.name ?? 'Ground Floor'} · ${r.building?.name ?? 'Main Building'}`,
            status: inCharge?.full_name ? `In-Charge: ${inCharge.full_name}` : 'In-Charge: Unassigned',
            statusVariant: inCharge?.full_name ? 'active' : 'warning',
            badge: r.room_number ? `#${r.room_number}` : undefined,
            metadata: [
              { label: 'Facility Type', value: r.room_type || 'Room' },
              { label: 'Allocated Assets', value: `${r.assets?.length ?? 0} units` },
            ],
            linkUrl: `/locations/rooms/${r.id}`,
            linkText: 'Open Room Facility →',
            actionLabel: 'View Equipment',
            actionQuery: `Show all equipment in ${r.name}`,
          });

          // Also include top assets from this room as interactive asset cards
          if (r.assets && r.assets.length > 0) {
            r.assets.slice(0, 3).forEach((a: any) => {
              cards.push({
                id: `asset-${a.id}`,
                type: 'asset',
                title: a.name,
                subtitle: a.asset_tag,
                status: a.status === 'active' ? 'Active' : a.status === 'damaged' ? 'Damaged' : a.status,
                statusVariant: a.status === 'active' ? 'active' : a.status === 'damaged' ? 'danger' : 'warning',
                metadata: [
                  { label: 'Room', value: r.name },
                  { label: 'Category', value: a.category?.name ?? 'General' },
                ],
                linkUrl: `/inventory/${a.id}`,
                linkText: 'Inspect Asset →',
              });
            });
          }
        });
      }
    }

    // Check for damaged, missing, or maintenance queries
    if (
      queryLower.includes('damaged') ||
      queryLower.includes('missing') ||
      queryLower.includes('maintenance') ||
      queryLower.includes('repair')
    ) {
      const { data: flaggedAssets } = await supabase
        .from('assets')
        .select('id, asset_tag, name, status, room:rooms(name), floor:floors(name)')
        .in('status', ['damaged', 'missing', 'under_maintenance'])
        .limit(20);

      dynamicContext += `\n[Flagged / Maintenance Assets]: ` + JSON.stringify(flaggedAssets);

      if (flaggedAssets && flaggedAssets.length > 0) {
        flaggedAssets.slice(0, 4).forEach((a: any) => {
          cards.push({
            id: `flagged-${a.id}`,
            type: 'asset',
            title: a.name,
            subtitle: a.asset_tag,
            status:
              a.status === 'damaged'
                ? 'Damaged'
                : a.status === 'under_maintenance'
                ? 'In Maintenance'
                : 'Missing',
            statusVariant: 'danger',
            metadata: [
              { label: 'Room', value: a.room?.name || 'Unassigned' },
              { label: 'Floor', value: a.floor?.name || 'Main Building' },
            ],
            linkUrl: `/inventory/${a.id}`,
            linkText: 'Inspect Asset →',
            actionLabel: 'Initiate Transfer',
            actionQuery: `Transfer ${a.asset_tag} to Lab 604`,
          });
        });
      }
    }

    // Check for floor queries
    if (queryLower.includes('floor') || queryLower.includes('level')) {
      const { data: floors } = await supabase
        .from('floors')
        .select('id, name, level, assets(count)')
        .order('level');

      dynamicContext += `\n[Campus Floors Distribution]: ` + JSON.stringify(floors);

      if (cards.length === 0) {
        cards.push({
          id: 'explore-floors',
          type: 'quick_action',
          title: 'Campus Floor Directory',
          subtitle: 'Explore all 7 floors and 48 facilities across Main Building',
          linkUrl: '/locations/floors',
          linkText: 'Explore Floors →',
          actionLabel: 'Floor 6 Assets',
          actionQuery: 'What assets are on the sixth floor?',
        });
        cards.push({
          id: 'explore-rooms',
          type: 'quick_action',
          title: 'Campus Room Facilities',
          subtitle: 'View designated in-charge faculty, room capacity, and inventory',
          linkUrl: '/locations/rooms',
          linkText: 'View All Rooms →',
          actionLabel: 'Compare Lab 603 & 604',
          actionQuery: 'Compare Lab 603 vs 604',
        });
      }
    }

    // Check for category / equipment queries (e.g., "cisco", "switch", "dell", "computer", "projector")
    const searchTerms = [
      'cisco',
      'switch',
      'dell',
      'optiplex',
      'projector',
      'computer',
      'server',
      'monitor',
      'printer',
    ];
    const matchedTerm = searchTerms.find((t) => queryLower.includes(t));
    if (matchedTerm) {
      const { data: catAssets } = await supabase
        .from('assets')
        .select('id, asset_tag, name, status, room:rooms(name), floor:floors(name)')
        .or(`name.ilike.%${matchedTerm}%,description.ilike.%${matchedTerm}%`)
        .limit(15);

      dynamicContext += `\n[Assets matching "${matchedTerm}"]: ` + JSON.stringify(catAssets);

      if (catAssets && catAssets.length > 0) {
        catAssets.slice(0, 4).forEach((a: any) => {
          cards.push({
            id: `cat-${a.id}`,
            type: 'asset',
            title: a.name,
            subtitle: a.asset_tag,
            status: a.status === 'active' ? 'Active' : a.status,
            statusVariant: a.status === 'active' ? 'active' : 'warning',
            metadata: [
              { label: 'Room', value: a.room?.name || 'Unassigned' },
              { label: 'Floor', value: a.floor?.name || 'Campus' },
            ],
            linkUrl: `/inventory/${a.id}`,
            linkText: 'Inspect Asset →',
          });
        });
      }
    }

    // Check for pending requests / approvals
    if (queryLower.includes('pending') || queryLower.includes('approval') || queryLower.includes('request')) {
      const { data: requests } = await supabase
        .from('change_requests')
        .select('id, type, status, reason, created_at, asset:assets(name, asset_tag)')
        .eq('status', 'pending')
        .limit(10);

      dynamicContext += `\n[Pending Approval Requests]: ` + JSON.stringify(requests);

      if (requests && requests.length > 0) {
        requests.slice(0, 3).forEach((r: any) => {
          cards.push({
            id: `req-${r.id}`,
            type: 'quick_action',
            title: `${r.type.toUpperCase()} Request: ${r.asset?.name ?? 'Asset'}`,
            subtitle: `Reason: ${r.reason || 'Pending institutional review'}`,
            status: 'Pending Approval',
            statusVariant: 'warning',
            linkUrl: '/approvals',
            linkText: 'Review in Approvals →',
          });
        });
      }
    }

    // ── 2. Call Gemini API if Key is Available ────────────────────────
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (geminiApiKey) {
      const systemInstruction = `You are SPIT Asset AI Concierge, the official intelligent assistant for Sardar Patel Institute of Technology's physical asset management system.
You answer faculty, auditor, and lab staff questions accurately, concisely, and professionally.
FORMATTING RULES:
1. Always format equipment tags as clickable markdown links like [TAG-NAME](/inventory/[asset-id]) when asset IDs are present.
2. Format comparisons, inventories, and multi-column data into clean Markdown Tables with headers (| Asset Tag | Name | Room | Status |).
3. If user asks for ratios, formulas, or statistical calculations, use standard LaTeX math (e.g. $$\\text{Operational Health} = \\frac{\\text{Active Assets}}{\\text{Total Catalog}} \\times 100$$ or inline $x = y$).
4. Use status indicators: 🟢 Active, 🟡 Maintenance, 🔴 Missing, ⚪ Retired.
5. If room details are present in the context, clearly highlight the official Room In-Charge faculty/staff member.
Here is the live institutional database context retrieved for this query:
${dynamicContext || 'Database context loaded: 2,662 active assets across 7 floors and 48 rooms in SPIT.'}`;

      let geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${systemInstruction}\n\nUser Question: ${lastMessage}` }] },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!geminiRes.ok) {
        geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                { role: 'user', parts: [{ text: `${systemInstruction}\n\nUser Question: ${lastMessage}` }] },
              ],
            }),
          }
        );
      }

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return NextResponse.json({
            reply: text,
            cards: cards.slice(0, 4),
          });
        }
      }
    }

    // ── 3. Built-In Zero-Cost Intelligent NLP Engine (Fallback) ───────
    if (matchedRooms.length > 0) {
      const rawRoom = matchedRooms[0];
      const assetsList = rawRoom.assets || [];
      const activeCount = assetsList.filter((a: any) => a.status === 'active').length;
      const damaged = assetsList.filter((a: any) => a.status === 'damaged').length;
      const missing = assetsList.filter((a: any) => a.status === 'missing').length;
      const floorName = rawRoom.floor?.name ?? 'Campus Wing';
      const inChargeInfo = rawRoom.in_charge?.full_name
        ? `**${rawRoom.in_charge.full_name}** (${rawRoom.in_charge.designation || 'Room In-Charge'})`
        : '*Unassigned*';

      directAnswer =
        `### 📍 Facility Summary for **${rawRoom.name}**\n\n` +
        `* **Location**: ${floorName}\n` +
        `* **Official Room In-Charge**: ${inChargeInfo}\n` +
        `* **Total Registered Assets**: **${assetsList.length} units**\n` +
        `* **Operational Health**: 🟢 **${activeCount} Active**` +
        (damaged > 0 ? ` · 🔧 **${damaged} Damaged**` : '') +
        (missing > 0 ? ` · 🔴 **${missing} Missing**` : '') +
        `\n\n` +
        `#### Sample Equipment in this Room:\n` +
        assetsList
          .slice(0, 8)
          .map(
            (a: any) =>
              `- **[${a.asset_tag}](/inventory/${a.id})**: ${a.name} (${a.category?.name ?? 'General'})`
          )
          .join('\n') +
        (assetsList.length > 8
          ? `\n\n*...plus ${assetsList.length - 8} more items in this room.*`
          : '');
    } else if (roomMatch) {
      const roomNum = roomMatch[2];
      directAnswer = `I could not locate a specific facility matching **"${roomNum}"**. You can view all campus rooms and their designated in-charge faculty in the [Campus Room Directory](/locations/rooms).`;
    } else if (
      queryLower.includes('damaged') ||
      queryLower.includes('missing') ||
      queryLower.includes('repair')
    ) {
      const { data: flagged } = await supabase
        .from('assets')
        .select('id, asset_tag, name, status, room:rooms(name), floor:floors(name)')
        .in('status', ['damaged', 'missing', 'under_maintenance'])
        .limit(10);

      if (flagged && flagged.length > 0) {
        directAnswer =
          `### ⚠️ Flagged Equipment Requiring Attention\n\n` +
          `Currently, **${flagged.length} assets** are flagged in the system:\n\n` +
          flagged
            .map(
              (a: any) =>
                `- **[${a.asset_tag}](/inventory/${a.id})** (${a.name}) — Status: **${a.status.toUpperCase()}** in *${a.room?.name ?? 'Unknown Room'}*`
            )
            .join('\n') +
          `\n\n> You can manage repair status or submit relocations directly from the [Inventory](/inventory?status=damaged) catalog.`;
      } else {
        directAnswer = `✅ **Great news!** There are currently **0 assets** flagged as damaged or missing. The institutional inventory is 100% operational.`;
      }
    } else if (queryLower.includes('floor') || queryLower.includes('summary')) {
      const { data: floors } = await supabase
        .from('floors')
        .select('id, name, level, assets(count)')
        .order('level');

      directAnswer =
        `### Campus Floor Distribution\n\n` +
        (floors ?? [])
          .map((f: any) => `- **${f.name} (Level ${f.level})**: ${f.assets?.[0]?.count ?? 0} physical assets`)
          .join('\n') +
        `\n\nExplore detailed room maps and in-charge faculty in [Campus Floors](/locations/floors) and [Room Directory](/locations/rooms).`;
    } else {
      directAnswer =
        `Hello! I am your **SPIT Asset AI Assistant**.\n\n` +
        `I can help you look up equipment, verify laboratory inventories, check room in-charge staff, and track maintenance status across Sardar Patel Institute of Technology.\n\n` +
        `**Try asking me:**\n` +
        `- *"Who is in charge of Lab 603?"*\n` +
        `- *"How many computers are in Lab 603?"*\n` +
        `- *"Show all damaged or missing equipment"*\n` +
        `- *"Floor-wise asset breakdown"*\n` +
        `- *"Where are the Cisco switches located?"*`;
    }

    return NextResponse.json({
      reply: directAnswer,
      cards: cards.slice(0, 4),
    });
  } catch (err: any) {
    console.error('AI Chat Error:', err);
    return NextResponse.json({ error: err.message || 'Internal AI Error' }, { status: 500 });
  }
}
