import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Check for room-specific queries (e.g., "lab 603", "lab 604", "room 101")
    const roomMatch = queryLower.match(/(lab|room)\s*(\d+[a-z]?)/i);
    if (roomMatch) {
      const roomNum = roomMatch[2];
      const { data: roomData } = await supabase
        .from('rooms')
        .select(`
          id, name, room_number,
          floor:floors(name),
          building:buildings(name),
          assets:assets(id, asset_tag, name, status, category:asset_categories(name))
        `)
        .ilike('name', `%${roomNum}%`)
        .limit(3);

      if (roomData && roomData.length > 0) {
        dynamicContext += `\n[Live Room Data for "${roomNum}"]: ` + JSON.stringify(roomData);
      }
    }

    // Check for damaged, missing, or maintenance queries
    if (queryLower.includes('damaged') || queryLower.includes('missing') || queryLower.includes('maintenance') || queryLower.includes('repair')) {
      const { data: flaggedAssets } = await supabase
        .from('assets')
        .select('id, asset_tag, name, status, room:rooms(name), floor:floors(name)')
        .in('status', ['damaged', 'missing', 'under_maintenance'])
        .limit(20);

      dynamicContext += `\n[Flagged / Maintenance Assets]: ` + JSON.stringify(flaggedAssets);
    }

    // Check for floor queries
    if (queryLower.includes('floor') || queryLower.includes('level')) {
      const { data: floors } = await supabase
        .from('floors')
        .select('id, name, level, assets(count)')
        .order('level');

      dynamicContext += `\n[Campus Floors Distribution]: ` + JSON.stringify(floors);
    }

    // Check for category / equipment queries (e.g., "cisco", "switch", "dell", "computer", "projector")
    const searchTerms = ['cisco', 'switch', 'dell', 'optiplex', 'projector', 'computer', 'server', 'monitor', 'printer'];
    const matchedTerm = searchTerms.find((t) => queryLower.includes(t));
    if (matchedTerm) {
      const { data: catAssets } = await supabase
        .from('assets')
        .select('id, asset_tag, name, status, room:rooms(name), floor:floors(name)')
        .or(`name.ilike.%${matchedTerm}%,description.ilike.%${matchedTerm}%`)
        .limit(15);

      dynamicContext += `\n[Assets matching "${matchedTerm}"]: ` + JSON.stringify(catAssets);
    }

    // Check for pending requests / approvals
    if (queryLower.includes('pending') || queryLower.includes('approval') || queryLower.includes('request')) {
      const { data: requests } = await supabase
        .from('change_requests')
        .select('id, type, status, reason, created_at, asset:assets(name, asset_tag)')
        .eq('status', 'pending')
        .limit(10);

      dynamicContext += `\n[Pending Approval Requests]: ` + JSON.stringify(requests);
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
          return NextResponse.json({ reply: text });
        }
      }
    }

    // ── 3. Built-In Zero-Cost Intelligent NLP Engine (Fallback) ───────
    // If Gemini key is not set, run our deterministic natural language engine
    if (roomMatch) {
      const roomNum = roomMatch[2];
      const { data: roomData } = await supabase
        .from('rooms')
        .select(`
          id, name, room_number,
          floor:floors(name),
          assets:assets(id, asset_tag, name, status, category:asset_categories(name))
        `)
        .ilike('name', `%${roomNum}%`)
        .single();

      if (roomData) {
        const rawRoom = roomData as any;
        const assetsList = rawRoom.assets || [];
        const activeCount = assetsList.filter((a: any) => a.status === 'active').length;
        const damaged = assetsList.filter((a: any) => a.status === 'damaged').length;
        const missing = assetsList.filter((a: any) => a.status === 'missing').length;
        const floorName = rawRoom.floor?.name ?? rawRoom.floor?.[0]?.name ?? 'Campus Wing';

        directAnswer = `### 📍 Asset Summary for **${rawRoom.name}**\n\n` +
          `* **Location**: ${floorName}\n` +
          `* **Total Registered Assets**: **${assetsList.length} units**\n` +
          `* **Operational Health**: 🟢 **${activeCount} Active**` +
          (damaged > 0 ? ` · 🔧 **${damaged} Damaged**` : '') +
          (missing > 0 ? ` · 🔴 **${missing} Missing**` : '') + `\n\n` +
          `#### Sample Equipment in this Room:\n` +
          assetsList.slice(0, 8).map((a: any) => `- **[${a.asset_tag}](/inventory/${a.id})**: ${a.name} (${a.category?.name ?? 'General'})`).join('\n') +
          (assetsList.length > 8 ? `\n\n*...plus ${assetsList.length - 8} more items in this room.*` : '');
      } else {
        directAnswer = `I could not locate a specific room matching **"${roomNum}"**. You can view all campus rooms in the [Campus Room Directory](/locations/rooms).`;
      }
    } else if (queryLower.includes('damaged') || queryLower.includes('missing') || queryLower.includes('repair')) {
      const { data: flagged } = await supabase
        .from('assets')
        .select('id, asset_tag, name, status, room:rooms(name), floor:floors(name)')
        .in('status', ['damaged', 'missing', 'under_maintenance'])
        .limit(10);

      if (flagged && flagged.length > 0) {
        directAnswer = `### ⚠️ Flagged Equipment Requiring Attention\n\n` +
          `Currently, **${flagged.length} assets** are flagged in the system:\n\n` +
          flagged.map((a: any) => `- **[${a.asset_tag}](/inventory/${a.id})** (${a.name}) — Status: **${a.status.toUpperCase()}** in *${a.room?.name ?? 'Unknown Room'}*`).join('\n') +
          `\n\n> You can manage repair status or submit relocations directly from the [Inventory](/inventory?status=damaged) catalog.`;
      } else {
        directAnswer = `✅ **Great news!** There are currently **0 assets** flagged as damaged or missing. The institutional inventory is 100% operational.`;
      }
    } else if (queryLower.includes('floor') || queryLower.includes('summary')) {
      const { data: floors } = await supabase
        .from('floors')
        .select('id, name, level, assets(count)')
        .order('level');

      directAnswer = `### Campus Floor Distribution\n\n` +
        (floors ?? []).map((f: any) => `- **${f.name} (Level ${f.level})**: ${f.assets?.[0]?.count ?? 0} physical assets`).join('\n') +
        `\n\nExplore detailed room maps in [Campus Floors](/locations/floors).`;
    } else {
      directAnswer = `Hello! I am your **SPIT Asset AI Assistant**.\n\n` +
        `I can help you look up equipment, verify laboratory inventories, and check maintenance status across Sardar Patel Institute of Technology.\n\n` +
        `**Try asking me:**\n` +
        `- *"How many computers are in Lab 603?"*\n` +
        `- *"Show all damaged or missing equipment"*\n` +
        `- *"Floor-wise asset breakdown"*\n` +
        `- *"Where are the Cisco switches located?"*`;
    }

    return NextResponse.json({ reply: directAnswer });
  } catch (err: any) {
    console.error('AI Chat Error:', err);
    return NextResponse.json({ error: err.message || 'Internal AI Error' }, { status: 500 });
  }
}
