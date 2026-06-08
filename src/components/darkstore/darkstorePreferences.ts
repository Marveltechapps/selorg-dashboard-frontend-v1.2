/**
 * Darkstore UI preferences — persisted in localStorage.
 */

const PREFIX = 'darkstore:';

export type TableDensity = 'comfortable' | 'compact';
export type OpsRole = 'manager' | 'floor_lead' | 'inventory' | 'support';
export type LiveOrdersViewMode = 'table' | 'kanban';

export interface DarkstorePreferences {
  favoriteTabs: string[];
  density: TableDensity;
  sidebarCollapsed: boolean;
  savedFilters: Record<string, Record<string, string>>;
  opsRole: OpsRole;
  drawerWidthPx: number;
  liveOrdersViewMode: LiveOrdersViewMode;
  navSectionsCollapsed: Record<string, boolean>;
  alertSoundEnabled: boolean;
}

const DEFAULTS: DarkstorePreferences = {
  favoriteTabs: ['overview', 'liveorders', 'exception-inbox', 'slamonitor'],
  density: 'compact',
  sidebarCollapsed: false,
  savedFilters: {},
  opsRole: 'manager',
  drawerWidthPx: 480,
  liveOrdersViewMode: 'table',
  navSectionsCollapsed: { Fulfillment: true },
  alertSoundEnabled: true,
};

function read(): DarkstorePreferences {
  try {
    const raw = localStorage.getItem(`${PREFIX}prefs`);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<DarkstorePreferences>;
    return {
      favoriteTabs: Array.isArray(parsed.favoriteTabs) ? parsed.favoriteTabs : DEFAULTS.favoriteTabs,
      density: parsed.density === 'comfortable' ? 'comfortable' : 'compact',
      sidebarCollapsed: Boolean(parsed.sidebarCollapsed),
      savedFilters: parsed.savedFilters && typeof parsed.savedFilters === 'object' ? parsed.savedFilters : {},
      opsRole: (['manager', 'floor_lead', 'inventory', 'support'] as OpsRole[]).includes(parsed.opsRole as OpsRole)
        ? (parsed.opsRole as OpsRole)
        : DEFAULTS.opsRole,
      drawerWidthPx:
        typeof parsed.drawerWidthPx === 'number' && parsed.drawerWidthPx >= 320 && parsed.drawerWidthPx <= 800
          ? parsed.drawerWidthPx
          : DEFAULTS.drawerWidthPx,
      liveOrdersViewMode: parsed.liveOrdersViewMode === 'kanban' ? 'kanban' : 'table',
      navSectionsCollapsed:
        parsed.navSectionsCollapsed && typeof parsed.navSectionsCollapsed === 'object'
          ? parsed.navSectionsCollapsed
          : DEFAULTS.navSectionsCollapsed,
      alertSoundEnabled: parsed.alertSoundEnabled !== false,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(prefs: DarkstorePreferences): void {
  try {
    localStorage.setItem(`${PREFIX}prefs`, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

let _cache = read();

export const darkstorePreferences = {
  get(): DarkstorePreferences {
    return { ..._cache };
  },

  set(patch: Partial<DarkstorePreferences>): DarkstorePreferences {
    _cache = { ..._cache, ...patch };
    write(_cache);
    return { ..._cache };
  },

  toggleFavorite(tabId: string): string[] {
    const favs = [..._cache.favoriteTabs];
    const idx = favs.indexOf(tabId);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(tabId);
    _cache = { ..._cache, favoriteTabs: favs };
    write(_cache);
    return favs;
  },

  isFavorite(tabId: string): boolean {
    return _cache.favoriteTabs.includes(tabId);
  },

  setDensity(density: TableDensity): void {
    _cache = { ..._cache, density };
    write(_cache);
  },

  getDensity(): TableDensity {
    return _cache.density;
  },

  setSidebarCollapsed(collapsed: boolean): void {
    _cache = { ..._cache, sidebarCollapsed: collapsed };
    write(_cache);
  },

  getSidebarCollapsed(): boolean {
    return _cache.sidebarCollapsed;
  },

  saveFilter(screenId: string, filters: Record<string, string>): void {
    _cache = {
      ..._cache,
      savedFilters: { ..._cache.savedFilters, [screenId]: filters },
    };
    write(_cache);
  },

  getFilters(screenId: string): Record<string, string> {
    return { ...(_cache.savedFilters[screenId] ?? {}) };
  },

  setOpsRole(role: OpsRole): void {
    _cache = { ..._cache, opsRole: role };
    write(_cache);
  },

  setDrawerWidth(px: number): void {
    const clamped = Math.min(800, Math.max(320, px));
    _cache = { ..._cache, drawerWidthPx: clamped };
    write(_cache);
  },

  setLiveOrdersViewMode(mode: LiveOrdersViewMode): void {
    _cache = { ..._cache, liveOrdersViewMode: mode };
    write(_cache);
  },

  setNavSectionCollapsed(section: string, collapsed: boolean): void {
    _cache = {
      ..._cache,
      navSectionsCollapsed: { ..._cache.navSectionsCollapsed, [section]: collapsed },
    };
    write(_cache);
  },

  isNavSectionCollapsed(section: string): boolean {
    return _cache.navSectionsCollapsed[section] ?? false;
  },

  setAlertSoundEnabled(enabled: boolean): void {
    _cache = { ..._cache, alertSoundEnabled: enabled };
    write(_cache);
  },
};
