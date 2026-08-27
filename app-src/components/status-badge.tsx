import { Badge } from './ui/badge';
import { STATUS_CONFIG } from '@/lib/utils';
import type { AssetStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: AssetStatus;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ status, showDot = true, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} dot={showDot} className={className}>
      {config.label}
    </Badge>
  );
}
