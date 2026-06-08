import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { RiderCashReconciliation } from '../finance/RiderCashReconciliation';

/** Rider ops view of floating cash & COD — uses finance APIs with rider dashboard chrome. */
export function RiderCashOps() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Rider Cash & COD"
        subtitle="Monitor floating cash, pending deposits, and COD reconciliation for delivery partners"
      />
      <RiderCashReconciliation />
    </div>
  );
}
