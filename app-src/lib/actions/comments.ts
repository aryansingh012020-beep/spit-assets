'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function getCurrentUserAndProfile() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, institution_id')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');
  return { user, profile, supabase };
}

export interface AddCommentInput {
  assetId: string;
  content: string;
  isAdminOnly?: boolean;
}

export async function addAssetComment({ assetId, content, isAdminOnly = false }: AddCommentInput) {
  const { user, profile, supabase } = await getCurrentUserAndProfile();

  if (!content || !content.trim()) {
    throw new Error('Comment content cannot be empty');
  }

  // Only approvers can create admin-only comments
  const finalIsAdminOnly = isAdminOnly && profile.role === 'approver';

  const { data, error } = await supabase
    .from('asset_comments')
    .insert({
      asset_id: assetId,
      author_id: user.id,
      content: content.trim(),
      is_admin_only: finalIsAdminOnly,
    })
    .select(`
      id,
      content,
      is_admin_only,
      created_at,
      author:profiles!author_id(id, full_name, role)
    `)
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to post comment');
  }

  revalidatePath(`/inventory/${assetId}`);
  return data;
}

export async function deleteAssetComment(commentId: string, assetId: string) {
  const { user, profile, supabase } = await getCurrentUserAndProfile();

  // RLS will enforce author or approver, but we can do a clean check
  const { error } = await supabase
    .from('asset_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    throw new Error(error.message || 'Failed to delete comment');
  }

  revalidatePath(`/inventory/${assetId}`);
  return { success: true };
}
