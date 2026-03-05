import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  fetchPickerActivityLogs,
  PickerActionLog,
  PickerActivityLogsFilter,
} from './pickerActivityLogsApi';
import { toast } from 'sonner';
import { History, RefreshCw, Filter, Search } from 'lucide-react';
import { EmptyState, LoadingState } from '@/components/ui/ux-components';

const ACTION_TYPES = [
  'PUNCH_IN', 'PUNCH_OUT', 'BREAK_START', 'BREAK_END',
  'ORDER_ASSIGNED', 'PICKING_STARTED', 'ITEM_SCANNED', 'MISSING_ITEM_REPORTED',
  'ORDER_COMPLETED', 'DEVICE_COLLECTED', 'DEVICE_RETURNED',
];

export function PickerActivityLogs() {
  const [logs, setLogs] = useState<PickerActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{ total: number; page: number; limit: number; pages: number } | null>(null);
  const [filters, setFilters] = useState<PickerActivityLogsFilter>({
    page: 1,
    limit: 50,
  });
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPickerActivityLogs(filters);
      setLogs(result.logs);
      setMeta({ total: result.total, page: result.page, limit: result.limit, pages: result.pages });
    } catch (e) {
      toast.error('Failed to load picker activity logs');
      setLogs([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (updates: Partial<PickerActivityLogsFilter>) => {
    setFilters((prev) => ({ ...prev, ...updates, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Picker Activity Logs</h1>
          <p className="text-[#757575] text-sm">
            Audit trail for picker and HHD actions (punch in/out, order assignment, item scans, etc.)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
        {showFilters && (
          <div className="flex flex-wrap gap-3 items-center">
            <Input
              placeholder="Picker ID"
              value={filters.pickerId ?? ''}
              onChange={(e) => handleFilterChange({ pickerId: e.target.value || undefined })}
              className="w-40"
            />
            <Input
              placeholder="Order ID"
              value={filters.orderId ?? ''}
              onChange={(e) => handleFilterChange({ orderId: e.target.value || undefined })}
              className="w-40"
            />
            <Select
              value={filters.actionType ?? 'all'}
              onValueChange={(v) => handleFilterChange({ actionType: v === 'all' ? undefined : v })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {ACTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Start date"
              value={filters.startDate ?? ''}
              onChange={(e) => handleFilterChange({ startDate: e.target.value || undefined })}
              className="w-36"
            />
            <Input
              type="date"
              placeholder="End date"
              value={filters.endDate ?? ''}
              onChange={(e) => handleFilterChange({ endDate: e.target.value || undefined })}
              className="w-36"
            />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[#e4e4e7] bg-white overflow-hidden">
        {loading ? (
          <LoadingState message="Loading activity logs..." />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity logs"
            description="No picker activity logs match your filters. Try adjusting the filters or time range."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Picker ID</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id ?? `${log.pickerId}-${log.timestamp}-${log.actionType}`}>
                    <TableCell className="font-mono text-xs">{formatTimestamp(log.timestamp)}</TableCell>
                    <TableCell>
                      <span className="font-medium text-[#18181b]">{log.actionType}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.pickerId}</TableCell>
                    <TableCell className="font-mono text-xs">{log.orderId || '—'}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-[#71717a]">
                      {log.metadata && Object.keys(log.metadata).length > 0
                        ? JSON.stringify(log.metadata)
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {meta && meta.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#e4e4e7]">
                <span className="text-sm text-[#71717a]">
                  Showing page {meta.page} of {meta.pages} ({meta.total} total)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.page <= 1}
                    onClick={() => handlePageChange(meta.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.page >= meta.pages}
                    onClick={() => handlePageChange(meta.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
