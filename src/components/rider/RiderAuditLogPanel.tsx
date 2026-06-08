import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/api/apiClient';
import { format } from 'date-fns';

interface AuditRow {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  severity?: string;
  details?: { actorEmail?: string; actorName?: string };
  createdAt: string;
}

export function RiderAuditLogPanel({ limit = 15 }: { limit?: number }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: { items: AuditRow[] } }>(
        `/rider/audit/logs?limit=${limit}`
      );
      setRows(res.data?.items ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText size={18} className="text-[#F97316]" />
          <div>
            <h3 className="font-bold text-[#212121]">Ops Audit Log</h3>
            <p className="text-xs text-[#757575]">Assign, shift, and dispatch actions</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>
      <div className="max-h-[280px] overflow-y-auto divide-y divide-[#F0F0F0]">
        {loading && rows.length === 0 ? (
          <p className="p-4 text-sm text-gray-500 text-center">Loading audit log…</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-gray-500 text-center">No audit entries yet</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-[#212121]">{row.action}</span>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {format(new Date(row.createdAt), 'MMM d, h:mm a')}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {row.entityType && row.entityId ? `${row.entityType}: ${row.entityId}` : '—'}
                {row.details?.actorEmail ? ` · ${row.details.actorEmail}` : ''}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
