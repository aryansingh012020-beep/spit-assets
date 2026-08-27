import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) {
    console.error('List error:', error);
    return;
  }
  console.log('Existing buckets:', buckets.map(b => b.name));

  const exists = buckets && buckets.some(b => b.name === 'asset-photos');
  if (!exists) {
    const { data, error: createError } = await admin.storage.createBucket('asset-photos', {
      public: true,
      fileSizeLimit: 10485760,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/jpg']
    });
    if (createError) {
      console.error('Create bucket error:', createError);
    } else {
      console.log('✅ Created storage bucket: asset-photos (public)');
    }
  } else {
    console.log('✅ asset-photos bucket already exists');
  }
}

main().catch(console.error);
