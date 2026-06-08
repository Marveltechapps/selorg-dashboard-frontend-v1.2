import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DarkstoreToolbar } from './DarkstoreToolbar';
import { cn } from '@/lib/utils';

interface DarkstoreScreenShellProps {
  title: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  toolbar?: {
    onRefresh?: () => void;
    refreshing?: boolean;
    lastSync?: Date;
    filters?: React.ReactNode;
    toolbarActions?: React.ReactNode;
    showDensityToggle?: boolean;
    showConnection?: boolean;
  };
  children: React.ReactNode;
  className?: string;
}

export function DarkstoreScreenShell({
  title,
  subtitle,
  actions,
  toolbar,
  children,
  className,
}: DarkstoreScreenShellProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      {toolbar && (
        <DarkstoreToolbar
          onRefresh={toolbar.onRefresh}
          refreshing={toolbar.refreshing}
          lastSync={toolbar.lastSync}
          filters={toolbar.filters}
          actions={toolbar.toolbarActions}
          showDensityToggle={toolbar.showDensityToggle}
          showConnection={toolbar.showConnection}
        />
      )}
      {children}
    </div>
  );
}
