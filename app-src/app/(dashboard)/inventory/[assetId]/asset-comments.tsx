'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Textarea } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { addAssetComment, deleteAssetComment } from '@/lib/actions/comments';
import { formatRelativeTime, formatDateTime, getInitials } from '@/lib/utils';
import { MessageSquare, Lock, Globe, Trash2, Send, ShieldAlert } from 'lucide-react';

export interface CommentItem {
  id: string;
  content: string;
  is_admin_only: boolean;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    role: string;
  } | null;
}

interface AssetCommentsProps {
  assetId: string;
  initialComments: CommentItem[];
  currentUserId: string;
  currentUserRole: string;
}

export function AssetComments({
  assetId,
  initialComments,
  currentUserId,
  currentUserRole,
}: AssetCommentsProps) {
  const [comments, setComments] = React.useState<CommentItem[]>(initialComments);
  const [content, setContent] = React.useState('');
  const [isAdminOnly, setIsAdminOnly] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  const isApprover = currentUserRole === 'approver';

  // Sync state if props change
  React.useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      const newComment = await addAssetComment({
        assetId,
        content: content.trim(),
        isAdminOnly: isApprover ? isAdminOnly : false,
      });

      if (newComment) {
        setComments((prev) => [newComment as any, ...prev]);
      }
      setContent('');
      setIsAdminOnly(false);
      toast({
        variant: 'success',
        title: 'Comment added',
        description: isAdminOnly ? 'Private note saved for Admins.' : 'Public comment posted.',
      });
      router.refresh();
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Failed to post comment',
        description: err.message || 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    setDeletingId(commentId);
    try {
      await deleteAssetComment(commentId, assetId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast({
        variant: 'success',
        title: 'Comment deleted',
      });
      router.refresh();
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Failed to delete comment',
        description: err.message || 'Could not delete',
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <CardTitle>Asset Comments & Discussion</CardTitle>
          </div>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-6">
        {/* New Comment Input */}
        <form onSubmit={handleAddComment} className="space-y-3">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a remark, maintenance note, or query about this asset…"
              rows={2}
              required
              className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors resize-y min-h-[72px]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Visibility Toggle for Approver / Admin */}
            {isApprover ? (
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAdminOnly}
                  onChange={(e) => setIsAdminOnly(e.target.checked)}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3 text-amber-500" />
                  Admin-Only Note <span className="text-[10px] text-zinc-400 font-normal">(Hidden from regular viewers)</span>
                </span>
              </label>
            ) : (
              <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                <Globe className="h-3 w-3" /> Visible to Everyone
              </span>
            )}

            <Button
              type="submit"
              size="sm"
              isLoading={loading}
              disabled={!content.trim()}
              className="gap-1.5 ml-auto"
            >
              <Send className="h-3.5 w-3.5" /> Post Comment
            </Button>
          </div>
        </form>

        {/* Comment List */}
        <div className="pt-2">
          {comments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center">
              <MessageSquare className="h-6 w-6 text-zinc-300 dark:text-zinc-600 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">No comments yet</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                Leave a note or audit remarks regarding this asset.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {comments.map((comment) => {
                const canDelete =
                  comment.author?.id === currentUserId || currentUserRole === 'approver';

                return (
                  <div key={comment.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Avatar */}
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                          {getInitials(comment.author?.full_name ?? 'User')}
                        </div>

                        <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                          {comment.author?.full_name ?? 'Anonymous User'}
                        </span>

                        {comment.author?.role && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 capitalize">
                            · {comment.author.role.replace('_', ' ')}
                          </span>
                        )}

                        {/* Visibility Pill */}
                        {comment.is_admin_only ? (
                          <Badge variant="warning" className="text-[10px] gap-1 py-0 px-1.5">
                            <Lock className="h-2.5 w-2.5" /> Admin Only
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px] gap-1 py-0 px-1.5">
                            <Globe className="h-2.5 w-2.5 text-zinc-400" /> Public
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <time
                          className="text-[10px] text-zinc-400 dark:text-zinc-500"
                          title={formatDateTime(comment.created_at)}
                        >
                          {formatRelativeTime(comment.created_at)}
                        </time>

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={deletingId === comment.id}
                            className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 rounded"
                            title="Delete comment"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-zinc-700 dark:text-zinc-200 pl-8 whitespace-pre-wrap leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
