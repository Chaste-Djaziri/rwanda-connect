import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { atprotoClient } from '@/lib/atproto';

const verificationCache = new Map<string, boolean>();
const inflight = new Map<string, Promise<boolean>>();

const fetchVerified = async (handle: string) => {
  const cached = verificationCache.get(handle);
  if (cached !== undefined) return cached;
  if (inflight.has(handle)) {
    return inflight.get(handle) as Promise<boolean>;
  }
  const request = (async () => {
    const result = await atprotoClient.getProfilePublic(handle);
    const verification = result.success ? result.data?.verification : undefined;
    const verified =
      result.success &&
      (verification?.verifiedStatus === 'valid' ||
        verification?.trustedVerifierStatus === 'valid' ||
        Boolean(result.data?.verifications?.some((entry: { isValid?: boolean }) => entry?.isValid)));
    verificationCache.set(handle, Boolean(verified));
    inflight.delete(handle);
    return Boolean(verified);
  })();
  inflight.set(handle, request);
  return request;
};

export function VerifiedBadge({
  className,
  handle,
  verified,
}: {
  className?: string;
  handle?: string;
  verified?: boolean;
}) {
  const [isVerified, setIsVerified] = useState(Boolean(verified));

  useEffect(() => {
    if (verified !== undefined) {
      setIsVerified(Boolean(verified));
      return;
    }
    if (!handle) return;
    let active = true;
    fetchVerified(handle).then((value) => {
      if (active) setIsVerified(value);
    });
    return () => {
      active = false;
    };
  }, [handle, verified]);

  if (!isVerified) return null;
  return <CheckCircle2 className={className || 'w-4 h-4 text-primary'} aria-label="Verified account" />;
}
