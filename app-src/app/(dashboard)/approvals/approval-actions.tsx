'use client';

import * as React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { approveRequest, rejectRequest } from '@/lib/actions/requests';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/primitives';

export function ApprovalActions({ requestId }: { requestId: string }) {
  const { toast } = useToast();
  const [approvingId, setApprovingId] = React.useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');
  const [rejecting, setRejecting] = React.useState(false);

  async function handleApprove() {
    setApprovingId(requestId);
    try {
      await approveRequest(requestId);
      toast({ variant: 'success', title: 'Request approved', description: 'The inventory has been updated.' });
    } catch (err) {
      toast({ variant: 'error', title: 'Approval failed', description: (err as Error).message });
    } finally {
      setApprovingId(null);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast({ variant: 'warning', title: 'Reason required', description: 'Please provide a rejection reason.' });
      return;
    }
    setRejecting(true);
    try {
      await rejectRequest(requestId, rejectReason);
      toast({ variant: 'success', title: 'Request rejected', description: 'The requester will be notified.' });
      setRejectOpen(false);
      setRejectReason('');
    } catch (err) {
      toast({ variant: 'error', title: 'Rejection failed', description: (err as Error).message });
    } finally {
      setRejecting(false);
    }
  }

  return (
    <>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="success"
          size="sm"
          isLoading={approvingId === requestId}
          onClick={handleApprove}
          aria-label="Approve request"
        >
          <Check className="h-3.5 w-3.5" />
          Approve
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRejectOpen(true)}
          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          aria-label="Reject request"
        >
          <X className="h-3.5 w-3.5" />
          Reject
        </Button>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be visible to the requester and recorded in the audit log.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            label="Rejection Reason"
            required
            placeholder="Explain why this request is being rejected…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={rejecting}
              onClick={handleReject}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
