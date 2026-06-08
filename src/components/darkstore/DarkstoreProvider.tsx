import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  darkstorePreferences,
  type DarkstorePreferences,
  type TableDensity,
  type OpsRole,
  type LiveOrdersViewMode,
} from './darkstorePreferences';

export type { OpsRole, LiveOrdersViewMode };

interface DarkstoreContextValue {
  preferences: DarkstorePreferences;
  density: TableDensity;
  setDensity: (d: TableDensity) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleFavorite: (tabId: string) => void;
  isFavorite: (tabId: string) => boolean;
  saveFilters: (screenId: string, filters: Record<string, string>) => void;
  getFilters: (screenId: string) => Record<string, string>;
  setOpsRole: (role: OpsRole) => void;
  setDrawerWidth: (px: number) => void;
  setLiveOrdersViewMode: (mode: LiveOrdersViewMode) => void;
}

const DarkstoreContext = createContext<DarkstoreContextValue | null>(null);

export function DarkstoreProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<DarkstorePreferences>(darkstorePreferences.get());

  const refresh = useCallback(() => {
    setPreferences(darkstorePreferences.get());
  }, []);

  const setDensity = useCallback((d: TableDensity) => {
    darkstorePreferences.setDensity(d);
    refresh();
  }, [refresh]);

  const setSidebarCollapsed = useCallback((v: boolean) => {
    darkstorePreferences.setSidebarCollapsed(v);
    refresh();
  }, [refresh]);

  const toggleFavorite = useCallback((tabId: string) => {
    darkstorePreferences.toggleFavorite(tabId);
    refresh();
  }, [refresh]);

  const isFavorite = useCallback((tabId: string) => darkstorePreferences.isFavorite(tabId), []);

  const saveFilters = useCallback((screenId: string, filters: Record<string, string>) => {
    darkstorePreferences.saveFilter(screenId, filters);
    refresh();
  }, [refresh]);

  const getFilters = useCallback((screenId: string) => darkstorePreferences.getFilters(screenId), []);

  const setOpsRole = useCallback((role: OpsRole) => {
    darkstorePreferences.setOpsRole(role);
    refresh();
  }, [refresh]);

  const setDrawerWidth = useCallback((px: number) => {
    darkstorePreferences.setDrawerWidth(px);
    refresh();
  }, [refresh]);

  const setLiveOrdersViewMode = useCallback((mode: LiveOrdersViewMode) => {
    darkstorePreferences.setLiveOrdersViewMode(mode);
    refresh();
  }, [refresh]);

  useEffect(() => {
    document.documentElement.classList.toggle('darkstore-density-compact', preferences.density === 'compact');
    document.documentElement.classList.toggle('darkstore-sidebar-collapsed', preferences.sidebarCollapsed);
    document.documentElement.style.setProperty('--ds-drawer-width', `${preferences.drawerWidthPx}px`);
  }, [preferences.density, preferences.sidebarCollapsed, preferences.drawerWidthPx]);

  return (
    <DarkstoreContext.Provider
      value={{
        preferences,
        density: preferences.density,
        setDensity,
        sidebarCollapsed: preferences.sidebarCollapsed,
        setSidebarCollapsed,
        toggleFavorite,
        isFavorite,
        saveFilters,
        getFilters,
        setOpsRole,
        setDrawerWidth,
        setLiveOrdersViewMode,
      }}
    >
      {children}
    </DarkstoreContext.Provider>
  );
}

export function useDarkstore(): DarkstoreContextValue {
  const ctx = useContext(DarkstoreContext);
  if (!ctx) throw new Error('useDarkstore must be used within DarkstoreProvider');
  return ctx;
}
