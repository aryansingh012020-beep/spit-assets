import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const { data: allAssets } = await admin.from('assets').select('id').limit(1);
  if (!allAssets || allAssets.length === 0) return;
  const testId = allAssets[0].id;
  const res = await admin.from('assets').select(`
    id,
    photos:asset_photos!asset_photos_asset_id_fkey(id)
  `).eq('id', testId).maybeSingle();
  console.dir(res, { depth: null });
}
main().catch(console.error);
