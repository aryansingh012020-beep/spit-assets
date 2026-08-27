'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SkipForward, Plus } from 'lucide-react';

export function ImportIssueActions({ issueId }: { issueId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = React.useState<'skip' | 'import' | null>(null);

  async function handle(action: 'skipped' | 'imported') {
    setLoading(action === 'skipped' ? 'skip' : 'import');
    const supabase = createClient();
    const { error } = await supabase
      .from('import_issues')
      .update({ status: action, resolved_at: new Date().toISOString() })
      .eq('id', issueId);

    if (error) {
      toast({ variant: 'error', title: 'Action failed', description: error.message });
    } else {
      toast({ variant: 'success', title: action === 'skipped' ? 'Issue skipped' : 'Marked as imported' });
      router.refresh();
    }
    setLoading(null);
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button
        variant="outline"
        size="sm"
        isLoading={loading === 'skip'}
        onClick={() => handle('skipped')}
        aria-label="Skip this import issue"
      >
        <SkipForward className="h-3.5 w-3.5" />
        Skip
      </Button>
      <Button
        variant="primary"
        size="sm"
        isLoading={loading === 'import'}
        onClick={() => handle('imported')}
        aria-label="Mark as imported"
      >
        <Plus className="h-3.5 w-3.5" />
        Mark Imported
      </Button>
    </div>
  );
}
