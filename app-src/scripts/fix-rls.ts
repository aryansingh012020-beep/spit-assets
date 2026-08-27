import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Let's create a SQL executor function or fix policies directly
  // In Supabase, let's replace `auth.role() = 'authenticated'` with `auth.uid() is not null`
  // on all tables: assets, asset_photos, buildings, floors, rooms, asset_categories, institutions
  
  console.log('Testing SQL update to RLS policies...');
  
  // Update policy for assets
  const sql = `
    drop policy if exists "assets_select_authenticated" on public.assets;
    create policy "assets_select_authenticated" on public.assets for select using (auth.uid() is not null);

    drop policy if exists "asset_photos_select_authenticated" on public.asset_photos;
    create policy "asset_photos_select_authenticated" on public.asset_photos for select using (auth.uid() is not null);

    drop policy if exists "buildings_select_authenticated" on public.buildings;
    create policy "buildings_select_authenticated" on public.buildings for select using (auth.uid() is not null);

    drop policy if exists "floors_select_authenticated" on public.floors;
    create policy "floors_select_authenticated" on public.floors for select using (auth.uid() is not null);

    drop policy if exists "rooms_select_authenticated" on public.rooms;
    create policy "rooms_select_authenticated" on public.rooms for select using (auth.uid() is not null);

    drop policy if exists "categories_select_authenticated" on public.asset_categories;
    create policy "categories_select_authenticated" on public.asset_categories for select using (auth.uid() is not null);

    drop policy if exists "institutions_select_authenticated" on public.institutions;
    create policy "institutions_select_authenticated" on public.institutions for select using (auth.uid() is not null);

    drop policy if exists "asset_history_select_authenticated" on public.asset_history;
    create policy "asset_history_select_authenticated" on public.asset_history for select using (auth.uid() is not null);

    drop policy if exists "asset_movements_select_authenticated" on public.asset_movements;
    create policy "asset_movements_select_authenticated" on public.asset_movements for select using (auth.uid() is not null);
  `;
  
  console.log('SQL to apply in Supabase or via RPC:');
  console.log(sql);
}

main().catch(console.error);
