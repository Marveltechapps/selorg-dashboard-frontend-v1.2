import React, { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ChevronUp, Loader2, RefreshCw, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  fetchLogisticsProviders,
  patchLogisticsProvider,
  reorderLogisticsProvider,
  type LogisticsProviderRow,
} from './logisticsProvidersApi';

const QUERY_KEY = ['logistics-admin-providers'] as const;

function sortProviders(list: LogisticsProviderRow[]) {
  return [...list].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

export function LogisticsProvidersAdmin() {
  const qc = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchLogisticsProviders,
  });

  const setProvidersCache = useCallback(
    (updater: (prev: LogisticsProviderRow[]) => LogisticsProviderRow[]) => {
      qc.setQueryData<LogisticsProviderRow[]>(QUERY_KEY, (prev) =>
        sortProviders(updater(prev ?? []))
      );
    },
    [qc]
  );

  const patchActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      patchLogisticsProvider(id, { isActive }),
    onMutate: async ({ id, isActive }) => {
      setPendingId(id);
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<LogisticsProviderRow[]>(QUERY_KEY);
      setProvidersCache((prev) =>
        prev.map((p) => (p._id === id ? { ...p, isActive } : p))
      );
      return { previous };
    },
    onSuccess: (updated) => {
      setProvidersCache((prev) =>
        prev.map((p) => (p._id === updated._id ? updated : p))
      );
      toast.success(
        updated.isActive ? `${updated.name} enabled` : `${updated.name} disabled`
      );
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previous) qc.setQueryData(QUERY_KEY, context.previous);
      toast.error(err.message || 'Failed to update provider');
    },
    onSettled: () => {
      setPendingId(null);
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const reorder = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
      reorderLogisticsProvider(id, direction),
    onMutate: async ({ id, direction }) => {
      setPendingId(id);
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<LogisticsProviderRow[]>(QUERY_KEY);
      const sorted = sortProviders(previous ?? []);
      const idx = sorted.findIndex((p) => p._id === id);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (idx >= 0 && swapIdx >= 0 && swapIdx < sorted.length) {
        const next = [...sorted];
        const a = next[idx];
        const b = next[swapIdx];
        next[idx] = { ...b, priority: a.priority };
        next[swapIdx] = { ...a, priority: b.priority };
        qc.setQueryData(QUERY_KEY, sortProviders(next));
      }
      return { previous };
    },
    onSuccess: (providers) => {
      qc.setQueryData(QUERY_KEY, sortProviders(providers));
      toast.success('Provider priority updated');
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previous) qc.setQueryData(QUERY_KEY, context.previous);
      toast.error(err.message || 'Failed to reorder provider');
    },
    onSettled: () => {
      setPendingId(null);
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const providers = sortProviders(list.data ?? []);
  const activeCount = providers.filter((p) => p.isActive).length;
  const isBusy = patchActive.isPending || reorder.isPending;

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Logistics providers</h1>
          <p className="text-sm text-[#71717a] mt-1">
            Toggle providers and adjust failover priority (lower number runs first).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void list.refetch()}
          disabled={list.isFetching}
        >
          {list.isFetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Total providers</p>
            <Truck className="text-[#4F46E5]" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{providers.length}</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Active</p>
            <ChevronUp className="text-emerald-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{activeCount}</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Failover order</p>
            <ArrowUp className="text-amber-600" size={16} />
          </div>
          <p className="text-sm font-medium text-[#18181b] mt-2 leading-snug">
            {providers.filter((p) => p.isActive).length > 0
              ? providers
                  .filter((p) => p.isActive)
                  .map((p) => p.name)
                  .join(' → ')
              : 'No active providers'}
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
          <h3 className="font-bold text-[#18181b]">Provider configuration</h3>
          <p className="text-xs text-[#71717a] mt-1">
            Active providers are used in priority order when booking deliveries.
          </p>
        </div>

        {list.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#4F46E5]" />
          </div>
        ) : list.isError ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-rose-600">Failed to load logistics providers.</p>
            <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
              Try again
            </Button>
          </div>
        ) : providers.length === 0 ? (
          <div className="py-12 text-center">
            <Truck className="mx-auto h-10 w-10 text-[#a1a1aa] mb-3" />
            <p className="text-sm text-[#71717a]">No logistics providers configured yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB]">
                  <TableHead className="w-14">Order</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>API base</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((p, index) => {
                  const rowBusy = pendingId === p._id && isBusy;
                  const canMoveUp = index > 0;
                  const canMoveDown = index < providers.length - 1;

                  return (
                    <TableRow key={p._id}>
                      <TableCell className="text-[#71717a] font-mono text-xs">
                        #{index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#18181b]">{p.name}</span>
                          {p.isActive ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[#71717a]">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={p.isActive === true}
                            disabled={rowBusy}
                            onCheckedChange={(v) =>
                              patchActive.mutate({ id: p._id, isActive: v })
                            }
                          />
                          {rowBusy && (
                            <Loader2 className="h-4 w-4 animate-spin text-[#6B7280]" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono min-w-[2.5rem] justify-center">
                            {p.priority}
                          </Badge>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            disabled={!canMoveUp || rowBusy}
                            title="Move up (runs sooner)"
                            onClick={() => reorder.mutate({ id: p._id, direction: 'up' })}
                          >
                            <ArrowUp className="h-3.5 w-3.5 mr-1" />
                            Up
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            disabled={!canMoveDown || rowBusy}
                            title="Move down (runs later)"
                            onClick={() => reorder.mutate({ id: p._id, direction: 'down' })}
                          >
                            <ArrowDown className="h-3.5 w-3.5 mr-1" />
                            Down
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        {p.apiBaseUrl ? (
                          <a
                            href={p.apiBaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#4F46E5] hover:underline truncate block"
                          >
                            {p.apiBaseUrl}
                          </a>
                        ) : (
                          <span className="text-xs text-[#a1a1aa]">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
