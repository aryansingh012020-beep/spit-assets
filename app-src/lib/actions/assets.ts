'use server';

import { createClient } from '@/lib/supabase/server';

export async function fetchAssetInspectorDetails(assetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: asset }, { data: history }, { data: comments }, { data: profile }] =
    await Promise.all([
      supabase
        .from('assets')
        .select(`
          id, asset_tag, name, description, status, acquisition_year,
          original_tag, source_sheet, source_row, created_at, updated_at,
          category:asset_categories(id, name, code),
          room:rooms(id, name, room_number),
          floor:floors(id, name, level),
          building:buildings(id, name),
          photos:asset_photos(id, url, is_primary, uploaded_at)
        `)
        .eq('id', assetId)
        .maybeSingle(),
      supabase
        .from('asset_history')
        .select(`
          id, event_type, occurred_at, reason,
          performer:profiles!performed_by(full_name),
          approver:profiles!approved_by(full_name)
        `)
        .eq('asset_id', assetId)
        .order('occurred_at', { ascending: false })
        .limit(5),
      supabase
        .from('asset_comments')
        .select(`
          id, content, is_admin_only, created_at,
          author:profiles!author_id(id, full_name, role)
        `)
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false })
        .limit(20),
      user
        ? supabase.from('profiles').select('id, role').eq('id', user.id).single()
        : Promise.resolve({ data: null, error: null }),
    ]);

  const profileData = (profile as any)?.data;

  return {
    asset,
    history: history ?? [],
    comments: comments ?? [],
    currentUserId: user?.id ?? '',
    currentUserRole: profileData?.role ?? 'viewer',
  };
}
