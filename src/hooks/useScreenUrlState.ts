import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function parseUrlTab<T extends string>(
  value: string | null,
  allowed: readonly T[],
  defaultTab: T,
): T {
  if (value && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return defaultTab;
}

/**
 * URL persistence for screens with internal subtabs only.
 * Writes `?tab=<name>` on mount and when the user switches tabs.
 */
export function useScreenTab<T extends string>(
  tabs: readonly T[],
  defaultTab: T,
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = parseUrlTab(searchParams.get('tab'), tabs, defaultTab);
  const activeTab = tabFromUrl;

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (!tab || !tabs.includes(tab as T)) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', defaultTab);
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams, tabs, defaultTab]);

  const changeTab = useCallback(
    (tab: T) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      }, { replace: false });
    },
    [setSearchParams],
  );

  return { activeTab, changeTab, searchParams, setSearchParams };
}
