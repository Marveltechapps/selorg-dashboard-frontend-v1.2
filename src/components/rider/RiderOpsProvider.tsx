import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { riderPreferences, type TableDensity } from './riderPreferences';

interface RiderOpsContextValue {
  density: TableDensity;
  setDensity: (d: TableDensity) => void;
}

const RiderOpsContext = createContext<RiderOpsContextValue | null>(null);

export function RiderOpsProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<TableDensity>(() => riderPreferences.get().density);

  useEffect(() => {
    document.documentElement.classList.toggle('rider-density-compact', density === 'compact');
  }, [density]);

  const value = useMemo(
    () => ({
      density,
      setDensity: (d: TableDensity) => {
        riderPreferences.setDensity(d);
        setDensityState(d);
      },
    }),
    [density]
  );

  return <RiderOpsContext.Provider value={value}>{children}</RiderOpsContext.Provider>;
}

export function useRiderOps() {
  const ctx = useContext(RiderOpsContext);
  if (!ctx) {
    return {
      density: riderPreferences.get().density,
      setDensity: (d: TableDensity) => riderPreferences.setDensity(d),
    };
  }
  return ctx;
}
