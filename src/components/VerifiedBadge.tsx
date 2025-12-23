import { CheckCircle2 } from 'lucide-react';

export function VerifiedBadge({ className }: { className?: string }) {
  return <CheckCircle2 className={className || 'w-4 h-4 text-primary'} aria-label="Verified account" />;
}
