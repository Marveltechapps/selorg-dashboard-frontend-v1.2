import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type AdminDashboardContextValue = {
  /** Increments when home/CMS data changes; consumers can refetch. */
  dataVersion: number;
  bumpDashboardData: () => void;
};

const AdminDashboardContext = createContext<AdminDashboardContextValue>({
  dataVersion: 0,
  bumpDashboardData: () => {},
});

export function AdminDashboardProvider({ children }: { children: React.ReactNode }) {
  const [dataVersion, setDataVersion] = useState(0);
  const bumpDashboardData = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);
  const value = useMemo(
    () => ({ dataVersion, bumpDashboardData }),
    [dataVersion, bumpDashboardData]
  );
  return <AdminDashboardContext.Provider value={value}>{children}</AdminDashboardContext.Provider>;
}

export function useAdminDashboardRefresh() {
  return useContext(AdminDashboardContext);
}
