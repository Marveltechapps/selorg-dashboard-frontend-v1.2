import { useState, useEffect, useCallback, useRef } from 'react';

/** Uses unauthenticated /health endpoint to avoid 401 noise and auth requirements. */
function buildHealthUrl(): string {
  const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
  if (apiBase && apiBase.startsWith('http')) {
    try {
      const u = new URL(apiBase);
      return `${u.origin}/health`;
    } catch {
      /* fallback */
    }
  }
  return `${window.location.origin}/health`;
}

async function pingBackend(): Promise<boolean> {
  try {
    const res = await fetch(buildHealthUrl(), { method: 'GET', signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

export function useBackendHealth() {
  const [isReachable, setIsReachable] = useState<boolean | null>(null);
  const mounted = useRef(true);

  const check = useCallback(async () => {
    const ok = await pingBackend();
    if (mounted.current) setIsReachable(ok);
    return ok;
  }, []);

  useEffect(() => {
    mounted.current = true;
    check();
    const interval = setInterval(check, 10000);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [check]);

  return { isReachable, recheck: check };
}
