import React from 'react';
import { Store } from 'lucide-react';
import { resolveOperationalScope, useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/ui/ux-components';

interface StoreRequiredGuardProps {
  children: React.ReactNode;
  title?: string;
}

export function StoreRequiredGuard({ children, title = 'Select a store' }: StoreRequiredGuardProps) {
  const { activeStoreId, user } = useAuth();
  const effectiveStoreId = resolveOperationalScope(user, activeStoreId);

  if (!effectiveStoreId) {
    return (
      <EmptyState
        icon={Store}
        title={title}
        description="Choose a store from the sidebar switcher to load operational data for that darkstore."
      />
    );
  }

  return <>{children}</>;
}
