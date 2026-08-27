'use client';

import * as React from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { buildLocationString, formatDateTime, formatRelativeTime } from '@/lib/utils';
import { fetchAssetInspectorDetails } from '@/lib/actions/assets';
import { AssetComments, CommentItem } from './[assetId]/asset-comments';
import { InventoryRowActions } from './inventory-row-actions';
import {
  X,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  Package,
  MapPin,
  Calendar,
  Tag,
  Clock,
  MessageSquare,
  History,
  Layers,
  ArrowRightLeft,
  FileText,
  Info,
} from 'lucide-react';

interface AssetInspectorDrawerProps {
  assetId: string | null;
  onClose: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  rooms: { id: string; name: string; room_number: string | null }[];
  canManage: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  addition_approved: '🟢 Added to inventory',
  transfer_approved: '🔄 Transfer approved',
  transfer_rejected: '🔴 Transfer rejected',
  transfer_requested: '📋 Transfer requested',
  edit_approved:     '✏️ Edit approved',
  edit_rejected:     '🔴 Edit rejected',
  edit_requested:    '📋 Edit requested',
  deletion_approved: '🗑️ Retired / Disposed',
  deletion_rejected: '🔴 Deletion rejected',
  deletion_requested: '📋 Deletion requested',
  photo_uploaded:    '📷 Photo uploaded',
  status_change:     '🔔 Status changed',
  creation:          '✨ Created',
};

export function AssetInspectorDrawer({
  assetId,
  onClose,
  onNavigatePrev,
  onNavigateNext,
  hasPrev,
  hasNext,
  rooms,
  canManage,
}: AssetInspectorDrawerProps) {
  const [data, setData] = React.useState<{
    asset: any;
    history: any[];
    comments: CommentItem[];
    currentUserId: string;
    currentUserRole: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'comments' | 'history'>('overview');

  const { toast } = useToast();

  // Fetch asset details whenever assetId changes
  React.useEffect(() => {
    if (!assetId) {
      setData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetchAssetInspectorDetails(assetId)
      .then((res) => {
        if (isMounted) {
          setData(res as any);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          toast({
            variant: 'error',
            title: 'Failed to load details',
            description: err.message || 'Could not fetch asset information',
          });
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [assetId, toast]);

  // Keyboard navigation
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!assetId) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowUp' && hasPrev && onNavigatePrev) {
        // Prevent default only if not in an input/textarea
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
        e.preventDefault();
        onNavigatePrev();
      } else if (e.key === 'ArrowDown' && hasNext && onNavigateNext) {
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
        e.preventDefault();
        onNavigateNext();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [assetId, hasPrev, hasNext, onNavigatePrev, onNavigateNext, onClose]);

  if (!assetId) return null;

  const asset = data?.asset;
  const location = asset
    ? buildLocationString([asset.building?.name, asset.floor?.name, asset.room?.name])
    : '';

  function copyTag() {
    if (!asset?.asset_tag) return;
    navigator.clipboard.writeText(asset.asset_tag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Dimmed Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-over Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        <div className="w-screen max-w-lg pointer-events-auto bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col transition-transform animate-in slide-in-from-right duration-250 select-text">
          {/* Header Controls */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Asset Inspector
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Prev / Next Keyboard Navigation */}
              <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5 mr-2">
                <button
                  type="button"
                  onClick={onNavigatePrev}
                  disabled={!hasPrev}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Previous item (↑)"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onNavigateNext}
                  disabled={!hasNext}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Next item (↓)"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Expand to Full Page */}
              <Link
                href={`/inventory/${assetId}`}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                title="Open full dedicated page"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Full Page</span>
              </Link>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-1"
                title="Close drawer (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Drawer Title & Quick Hero */}
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/80 bg-gradient-to-b from-zinc-50/50 to-transparent dark:from-zinc-900/50">
            {loading && !asset ? (
              <div className="space-y-2.5 animate-pulse">
                <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-6 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
            ) : asset ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={copyTag}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 text-xs font-mono font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                    title="Click to copy asset tag"
                  >
                    {asset.asset_tag}
                    {copied ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3 text-indigo-400" />
                    )}
                  </button>

                  <StatusBadge status={asset.status} />

                  {asset.category && (
                    <Badge variant="default" className="text-xs">
                      {asset.category.name}
                    </Badge>
                  )}
                </div>

                <h2 className="text-base font-bold text-zinc-900 dark:text-white leading-snug">
                  {asset.name}
                </h2>

                {/* Quick Row Actions in Drawer */}
                {canManage && (
                  <div className="pt-2 flex items-center gap-2">
                    <InventoryRowActions
                      assetId={asset.id}
                      assetName={asset.name}
                      assetTag={asset.asset_tag}
                      currentRoomId={asset.room?.id}
                      rooms={rooms}
                      canManage={canManage}
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Asset record not found.</p>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-5">
            <nav className="-mb-px flex gap-5">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Overview & Specs
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`pb-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'comments'
                    ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <MessageSquare className="h-3 w-3" />
                Discussion
                {data?.comments && data.comments.length > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/80 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 px-1">
                    {data.comments.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`pb-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'history'
                    ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <History className="h-3 w-3" />
                Audit Trail
              </button>
            </nav>
          </div>

          {/* Drawer Body Scroll Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {loading && !asset ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-24 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl" />
                <div className="h-32 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl" />
              </div>
            ) : asset ? (
              <>
                {/* ── TAB 1: OVERVIEW ── */}
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Location Card */}
                    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 p-3.5 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                        Location Placement
                      </div>
                      <p className="text-xs text-zinc-900 dark:text-white font-medium pl-5.5">
                        {location || 'Location unassigned'}
                      </p>
                      {asset.room && (
                        <div className="pl-5.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                          Room: {asset.room.name} {asset.room.room_number ? `(${asset.room.room_number})` : ''} · Floor: {asset.floor?.name ?? 'Ground'} · {asset.building?.name ?? 'Main Building'}
                        </div>
                      )}
                    </div>

                    {/* Specifications & Properties */}
                    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-800/20 divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                      <div className="flex justify-between p-3">
                        <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" /> Acquisition Year
                        </span>
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {asset.acquisition_year ?? '—'}
                        </span>
                      </div>

                      <div className="flex justify-between p-3">
                        <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5" /> Category Code
                        </span>
                        <span className="font-mono text-zinc-900 dark:text-white">
                          {asset.category?.code ?? '—'}
                        </span>
                      </div>

                      {asset.source_sheet && (
                        <div className="flex justify-between p-3">
                          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" /> Source Register
                          </span>
                          <span className="text-zinc-700 dark:text-zinc-300 font-mono text-[11px]">
                            {asset.source_sheet} (Row {asset.source_row})
                          </span>
                        </div>
                      )}

                      {asset.created_at && (
                        <div className="flex justify-between p-3">
                          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" /> Recorded In System
                          </span>
                          <span className="text-zinc-600 dark:text-zinc-300 text-[11px]">
                            {formatDateTime(asset.created_at)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Description / Remarks */}
                    {asset.description && (
                      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 p-3.5 space-y-1.5">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5 text-zinc-400" /> Specifications & Notes
                        </span>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                          {asset.description}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 2: COMMENTS ── */}
                {activeTab === 'comments' && data && (
                  <div>
                    <AssetComments
                      assetId={asset.id}
                      initialComments={data.comments}
                      currentUserId={data.currentUserId}
                      currentUserRole={data.currentUserRole}
                    />
                  </div>
                )}

                {/* ── TAB 3: AUDIT HISTORY ── */}
                {activeTab === 'history' && (
                  <div className="space-y-3">
                    {data?.history.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center text-xs text-zinc-400">
                        No recorded change events yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {data?.history.map((event: any) => (
                          <div key={event.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-zinc-900 dark:text-white">
                                {EVENT_LABELS[event.event_type] ?? event.event_type}
                              </span>
                              <time className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                {formatRelativeTime(event.occurred_at)}
                              </time>
                            </div>
                            {event.reason && (
                              <p className="text-zinc-600 dark:text-zinc-300 text-[11px]">
                                {event.reason}
                              </p>
                            )}
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                              By {event.performer?.full_name ?? 'System'}
                              {event.approver?.full_name && ` · Approved by ${event.approver.full_name}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
