import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import type { DrillDownResult } from '@/api/analytics/analyticsApi';

interface Props {
  open: boolean;
  onClose: () => void;
  data: DrillDownResult | null;
  loading?: boolean;
  onOpenDispatch?: () => void;
}

export function AnalyticsDrillDownDrawer({ open, onClose, data, loading, onOpenDispatch }: Props) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[420px] sm:w-[520px]">
        <SheetHeader>
          <SheetTitle>{data?.label || 'Drill-down details'}</SheetTitle>
          <SheetDescription>
            {data?.timestamp
              ? format(new Date(data.timestamp), 'MMM d, yyyy HH:mm')
              : 'Select a chart point to view underlying records'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500">Loading details…</p>
          ) : !data || data.rows.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No records for this period</p>
          ) : (
            <>
              <p className="text-xs text-gray-500">{data.total} record(s)</p>
              <div className="border rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-3 py-2">Order</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Rider</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                        <td className="px-3 py-2 capitalize">{String(row.status || '').replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2 text-xs">{row.riderId || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {onOpenDispatch && (
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={onOpenDispatch}>
              <ExternalLink size={14} className="mr-1" /> Open Dispatch
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
