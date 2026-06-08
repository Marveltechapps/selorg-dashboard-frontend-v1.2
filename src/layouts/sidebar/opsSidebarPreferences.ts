/**
 * Per-dashboard sidebar preferences — favorites, section collapse, sidebar width.
 */

export interface OpsSidebarPreferences {
  favoriteTabs: string[];
  sidebarCollapsed: boolean;
  navSectionsCollapsed: Record<string, boolean>;
}

const DEFAULTS: OpsSidebarPreferences = {
  favoriteTabs: [],
  sidebarCollapsed: false,
  navSectionsCollapsed: {},
};

function storageKey(dashboardId: string): string {
  return `${dashboardId}:sidebar-prefs`;
}

function read(dashboardId: string): OpsSidebarPreferences {
  try {
    const raw = localStorage.getItem(storageKey(dashboardId));
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<OpsSidebarPreferences>;
    return {
      favoriteTabs: Array.isArray(parsed.favoriteTabs) ? parsed.favoriteTabs : DEFAULTS.favoriteTabs,
      sidebarCollapsed: Boolean(parsed.sidebarCollapsed),
      navSectionsCollapsed:
        parsed.navSectionsCollapsed && typeof parsed.navSectionsCollapsed === 'object'
          ? parsed.navSectionsCollapsed
          : DEFAULTS.navSectionsCollapsed,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(dashboardId: string, prefs: OpsSidebarPreferences): void {
  try {
    localStorage.setItem(storageKey(dashboardId), JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

const caches = new Map<string, OpsSidebarPreferences>();

export function getOpsSidebarPreferences(dashboardId: string): OpsSidebarPreferences {
  if (!caches.has(dashboardId)) {
    caches.set(dashboardId, read(dashboardId));
  }
  return { ...caches.get(dashboardId)! };
}

export function patchOpsSidebarPreferences(
  dashboardId: string,
  patch: Partial<OpsSidebarPreferences>,
): OpsSidebarPreferences {
  const next = { ...getOpsSidebarPreferences(dashboardId), ...patch };
  caches.set(dashboardId, next);
  write(dashboardId, next);
  return { ...next };
}

export function toggleOpsFavorite(dashboardId: string, tabId: string): OpsSidebarPreferences {
  const prefs = getOpsSidebarPreferences(dashboardId);
  const has = prefs.favoriteTabs.includes(tabId);
  const favoriteTabs = has
    ? prefs.favoriteTabs.filter((id) => id !== tabId)
    : [...prefs.favoriteTabs, tabId];
  return patchOpsSidebarPreferences(dashboardId, { favoriteTabs });
}

export function isOpsFavorite(dashboardId: string, tabId: string): boolean {
  return getOpsSidebarPreferences(dashboardId).favoriteTabs.includes(tabId);
}

export function setOpsNavSectionCollapsed(
  dashboardId: string,
  category: string,
  collapsed: boolean,
): OpsSidebarPreferences {
  const prefs = getOpsSidebarPreferences(dashboardId);
  return patchOpsSidebarPreferences(dashboardId, {
    navSectionsCollapsed: { ...prefs.navSectionsCollapsed, [category]: collapsed },
  });
}

export function setOpsSidebarCollapsed(dashboardId: string, collapsed: boolean): OpsSidebarPreferences {
  return patchOpsSidebarPreferences(dashboardId, { sidebarCollapsed: collapsed });
}
