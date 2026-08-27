'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface UpdateProfileInput {
  full_name: string;
  phone_number?: string;
  employee_id?: string;
  department?: string;
  designation?: string;
  status?: string;
  bio?: string;
}

export async function updateUserProfile(input: UpdateProfileInput) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: input.full_name.trim(),
      phone_number: input.phone_number?.trim() || null,
      employee_id: input.employee_id?.trim() || null,
      department: input.department?.trim() || null,
      designation: input.designation?.trim() || null,
      status: input.status || 'active',
      bio: input.bio?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to update profile');
  }

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  return { success: true, profile: data };
}

export async function fetchUserPersonalHistory(userId: string) {
  const supabase = await createClient();

  const [
    { data: requests },
    { data: events },
    { data: comments },
    { data: movements },
  ] = await Promise.all([
    supabase
      .from('change_requests')
      .select(`
        id, type, status, reason, created_at, reviewed_at,
        asset:assets(id, asset_tag, name),
        reviewer:profiles!reviewed_by(full_name)
      `)
      .eq('requested_by', userId)
      .order('created_at', { ascending: false })
      .limit(30),

    supabase
      .from('asset_history')
      .select(`
        id, event_type, occurred_at, reason,
        asset:assets(id, asset_tag, name)
      `)
      .eq('performed_by', userId)
      .order('occurred_at', { ascending: false })
      .limit(30),

    supabase
      .from('asset_comments')
      .select(`
        id, content, is_admin_only, created_at,
        asset:assets(id, asset_tag, name)
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(30),

    supabase
      .from('asset_movements')
      .select(`
        id, moved_at,
        asset:assets(id, asset_tag, name),
        from_room:rooms!from_room_id(name, room_number),
        to_room:rooms!to_room_id(name, room_number)
      `)
      .eq('moved_by', userId)
      .order('moved_at', { ascending: false })
      .limit(30),
  ]);

  return {
    requests: requests ?? [],
    events: events ?? [],
    comments: comments ?? [],
    movements: movements ?? [],
  };
}
