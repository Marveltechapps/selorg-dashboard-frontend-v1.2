import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DarkstoreScreenShell } from '../darkstore/DarkstoreScreenShell';
import { RegionalCommandPanel } from '../darkstore/RegionalCommandPanel';

interface RegionalCommandScreenProps {
  setActiveTab?: (tab: string) => void;
}

export function RegionalCommandScreen({ setActiveTab }: RegionalCommandScreenProps) {
  const { switchStore } = useAuth();

  return (
    <DarkstoreScreenShell
      title="Regional Command"
      subtitle="Compare pipeline health and SLA threat across all assigned stores."
      toolbar={{ showDensityToggle: false, showConnection: true }}
    >
      <RegionalCommandPanel
        defaultExpanded
        onStoreClick={(storeId) => {
          switchStore(storeId);
          setActiveTab?.('overview');
        }}
        className="darkstore-content-loaded"
      />
    </DarkstoreScreenShell>
  );
}
