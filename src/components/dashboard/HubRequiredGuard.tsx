import React from 'react';
import { Warehouse } from 'lucide-react';
import { resolveOperationalScope, useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/ui/ux-components';

interface HubRequiredGuardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  /** When true, requires activeStoreId from auth */
  requireStore?: boolean;
  /** External scope id (e.g. factory) — when provided, must be non-empty */
  scopeId?: string | null;
  scopeLabel?: string;
}

export function HubRequiredGuard({
  children,
  title = 'Select an operational hub',
  description = 'Choose a hub or store from the sidebar to load operational data.',
  requireStore = true,
  scopeId,
  scopeLabel = 'hub',
}: HubRequiredGuardProps) {
  const { activeStoreId, user } = useAuth();
  const effectiveStoreId = resolveOperationalScope(user, activeStoreId);

  if (scopeId !== undefined) {
    if (!scopeId) {
      return (
        <EmptyState
          icon={Warehouse}
          title={title}
          description={`Select a ${scopeLabel} from the sidebar to continue.`}
        />
      );
    }
    return <>{children}</>;
  }

  if (requireStore && !effectiveStoreId) {
    return <EmptyState icon={Warehouse} title={title} description={description} />;
  }

  return <>{children}</>;
}
