import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getStoreProfile, getWarehouseProfile } from '@/api/darkstore/store.api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createLogisticsHttp, type LogisticsApiPrefix } from '@/api/logisticsHttp';
import type { LogisticsItem, LogisticsLocation, LogisticsOrder, LogisticsOrderDetailResponse } from '@/types/logistics';
import { StatusBadge } from '@/components/logistics/shared/StatusBadge';
import { JsonViewer } from '@/components/logistics/shared/JsonViewer';
import { Timeline, type TimelineItem } from '@/components/logistics/shared/Timeline';
import { PickupDropMap } from '@/components/logistics/shared/PickupDropMap';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, RefreshCw, Search } from 'lucide-react';
import { DarkstoreScreenShell } from '@/components/darkstore/DarkstoreScreenShell';
import { MetricCard } from '@/components/darkstore/MetricCard';

export type LogisticsVariant = 'warehouse' | 'darkstore';
export type LogisticsSection = 'hub' | 'tracking' | 'estimate';

function prefixFor(variant: LogisticsVariant): LogisticsApiPrefix {
  return variant === 'warehouse' ? '/warehouse/logistics' : '/darkstore/logistics';
}

function titleFor(variant: LogisticsVariant) {
  return variant === 'warehouse' ? 'Vendor → Warehouse pickups' : 'Warehouse → Darkstore replenishment';
}

function DarkstoreLogisticsShell({
  variant,
  title,
  subtitle,
  toolbar,
  actions,
  children,
}: {
  variant: LogisticsVariant;
  title: string;
  subtitle?: string;
  toolbar?: React.ComponentProps<typeof DarkstoreScreenShell>['toolbar'];
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (variant !== 'darkstore') return <>{children}</>;
  return (
    <DarkstoreScreenShell title={title} subtitle={subtitle} actions={actions} toolbar={toolbar}>
      {children}
    </DarkstoreScreenShell>
  );
}

export function LogisticsModule({ variant, section }: { variant: LogisticsVariant; section: LogisticsSection }) {
  const { activeStoreId } = useAuth();
  const http = useMemo(() => createLogisticsHttp(prefixFor(variant)), [variant]);
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [refId, setRefId] = useState('');
  const [pickup, setPickup] = useState<LogisticsLocation>({
    name: 'Warehouse',
    phone: '',
    address: '',
    lat: 12.97,
    lng: 77.59,
  });
  const [drop, setDrop] = useState<LogisticsLocation>({
    name: 'Darkstore',
    phone: '',
    address: '',
    lat: 12.93,
    lng: 77.62,
  });

  useEffect(() => {
    if (variant !== 'darkstore' || !activeStoreId) return;
    Promise.all([
      getWarehouseProfile(activeStoreId).catch(() => null),
      getStoreProfile(activeStoreId).catch(() => null),
    ]).then(([warehouseRes, storeRes]) => {
      if (warehouseRes?.data) {
        setPickup({
          name: warehouseRes.data.name,
          phone: warehouseRes.data.phone || '',
          address: warehouseRes.data.address,
          lat: warehouseRes.data.lat,
          lng: warehouseRes.data.lng,
        });
        setEstPickup({
          name: warehouseRes.data.name,
          phone: warehouseRes.data.phone || '',
          address: warehouseRes.data.address,
          lat: warehouseRes.data.lat,
          lng: warehouseRes.data.lng,
        });
      }
      if (storeRes?.data) {
        setDrop({
          name: storeRes.data.name,
          phone: storeRes.data.phone || '',
          address: storeRes.data.address,
          lat: storeRes.data.lat,
          lng: storeRes.data.lng,
        });
        setEstDrop({
          name: storeRes.data.name,
          phone: storeRes.data.phone || '',
          address: storeRes.data.address,
          lat: storeRes.data.lat,
          lng: storeRes.data.lng,
        });
      }
    });
  }, [variant, activeStoreId]);
  const [items, setItems] = useState<LogisticsItem[]>([{ name: 'Pallet', quantity: 1, weight: 50 }]);
  const [trackId, setTrackId] = useState('');
  const [estPickup, setEstPickup] = useState<LogisticsLocation>({
    name: 'Origin',
    phone: '+919999999991',
    address: 'Origin address',
    lat: 12.97,
    lng: 77.59,
  });
  const [estDrop, setEstDrop] = useState<LogisticsLocation>({
    name: 'Destination',
    phone: '+919999999992',
    address: 'Destination address',
    lat: 12.93,
    lng: 77.62,
  });
  const [estItems, setEstItems] = useState<LogisticsItem[]>([{ name: 'SKU', quantity: 2, weight: 5 }]);

  const startOfDay = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const listQuery = useQuery({
    queryKey: ['logistics-orders', variant],
    queryFn: async () => {
      const res = await http.get<{ data: LogisticsOrder[]; meta: { total: number } }>('/orders', {
        params: { limit: 50, page: 1 },
      });
      return res.data;
    },
    enabled: section === 'hub',
    refetchInterval: section === 'hub' ? 30_000 : false,
  });

  const kpiQuery = useQuery({
    queryKey: ['logistics-kpi', variant, startOfDay],
    queryFn: async () => {
      const res = await http.get<{ data: LogisticsOrder[] }>('/orders', {
        params: { limit: 100, from: startOfDay },
      });
      const rows = res.data.data || [];
      const inTransit = rows.filter((r) => r.status === 'IN_TRANSIT').length;
      const delivered = rows.filter((r) => r.status === 'DELIVERED').length;
      const sumFare = rows.reduce((s, r) => s + (r.actualFare ?? r.estimatedFare ?? 0), 0);
      const sumKm = rows.reduce((s, r) => s + (r.distanceKm ?? 0), 0);
      return {
        today: rows.length,
        inTransit,
        delivered,
        costPerKm: sumKm > 0 ? sumFare / sumKm : 0,
      };
    },
    enabled: section === 'hub',
    refetchInterval: 60_000,
  });

  const detailQuery = useQuery({
    queryKey: ['logistics-order', variant, selectedId],
    queryFn: async () => {
      const res = await http.get<{ data: LogisticsOrderDetailResponse }>(`/orders/${selectedId}`);
      return res.data.data;
    },
    enabled: Boolean(selectedId) && section === 'hub',
  });

  const trackingQuery = useQuery({
    queryKey: ['logistics-tracking', variant, trackId],
    queryFn: async () => {
      const res = await http.get<{ data: { order: LogisticsOrder; tracking: { status: string; raw: unknown } } }>(
        `/orders/${trackId}/tracking`
      );
      return res.data.data;
    },
    enabled: Boolean(trackId) && section === 'tracking',
    refetchInterval: (q) => {
      const st = q.state.data?.order?.status;
      if (!q.state.data || !trackId) return false;
      if (!st) return 15_000;
      if (st === 'DELIVERED' || st === 'CANCELLED' || st === 'FAILED') return false;
      return 15_000;
    },
  });

  const estimateQuery = useMutation({
    mutationFn: async () => {
      const res = await http.post('/estimate', {
        pickup: estPickup,
        drop: estDrop,
        items: estItems,
      });
      return res.data;
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const body = {
        referenceId: refId,
        type: variant === 'warehouse' ? 'VENDOR_TO_WAREHOUSE' : 'WAREHOUSE_TO_DARKSTORE',
        provider: 'PORTER' as const,
        pickup,
        drop,
        items,
        vehicleType: 'mini_truck',
      };
      const res = await http.post('/orders', body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistics-orders', variant] });
      qc.invalidateQueries({ queryKey: ['logistics-kpi', variant] });
      setOpen(false);
      setRefId('');
    },
  });

  const cancelMut = useMutation({
    mutationFn: async (id: string) => {
      await http.post(`/orders/${id}/cancel`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistics-orders', variant] });
      qc.invalidateQueries({ queryKey: ['logistics-order', variant, selectedId] });
    },
  });

  if (section === 'estimate') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fare estimate</h1>
          <p className="text-sm text-slate-600">Compare active providers for {titleFor(variant)}.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
            <Label>Pickup lat / lng</Label>
            <div className="flex gap-2">
              <Input value={estPickup.lat} type="number" onChange={(e) => setEstPickup({ ...estPickup, lat: Number(e.target.value) })} />
              <Input value={estPickup.lng} type="number" onChange={(e) => setEstPickup({ ...estPickup, lng: Number(e.target.value) })} />
            </div>
            <Label>Drop lat / lng</Label>
            <div className="flex gap-2">
              <Input value={estDrop.lat} type="number" onChange={(e) => setEstDrop({ ...estDrop, lat: Number(e.target.value) })} />
              <Input value={estDrop.lng} type="number" onChange={(e) => setEstDrop({ ...estDrop, lng: Number(e.target.value) })} />
            </div>
            <Button onClick={() => estimateQuery.mutate()} disabled={estimateQuery.isPending}>
              {estimateQuery.isPending ? 'Estimating…' : 'Get estimates'}
            </Button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-semibold text-slate-900">Results</h3>
            {estimateQuery.data && (
              <pre className="mt-2 max-h-96 overflow-auto text-xs">{JSON.stringify(estimateQuery.data, null, 2)}</pre>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (section === 'tracking') {
    return (
      <DarkstoreLogisticsShell
        variant={variant}
        title="Replenishment Tracking"
        subtitle="Polls provider tracking every 15s while the move is active."
        toolbar={{ showConnection: true }}
      >
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[240px] flex-1">
            <Label>Logistics order ID</Label>
            <Input value={trackId} onChange={(e) => setTrackId(e.target.value)} placeholder="Mongo ObjectId" />
          </div>
          <Button type="button" onClick={() => qc.invalidateQueries({ queryKey: ['logistics-tracking', variant, trackId] })}>
            <Search className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        {trackingQuery.data && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-600">Internal status</p>
              <div className="mt-2">
                <StatusBadge status={trackingQuery.data.order.status} />
              </div>
              <p className="mt-4 text-sm text-slate-600">Provider snapshot</p>
              <JsonViewer title="Tracking raw" data={trackingQuery.data.tracking.raw} />
            </div>
            <PickupDropMap pickup={trackingQuery.data.order.pickup} drop={trackingQuery.data.order.drop} />
          </div>
        )}
      </div>
      </DarkstoreLogisticsShell>
    );
  }

  const timelineItems: TimelineItem[] =
    detailQuery.data?.history?.map((h) => ({
      id: h._id,
      title: h.status,
      subtitle: h.message,
      time: h.eventTime,
    })) ?? [];

  const kpiCards =
    variant === 'darkstore' ? (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Moves today" value={kpiQuery.data?.today ?? '—'} loading={kpiQuery.isLoading} />
        <MetricCard label="In transit" value={kpiQuery.data?.inTransit ?? '—'} loading={kpiQuery.isLoading} />
        <MetricCard label="Delivered today" value={kpiQuery.data?.delivered ?? '—'} loading={kpiQuery.isLoading} />
        <MetricCard
          label="Cost / km (today)"
          value={kpiQuery.data ? kpiQuery.data.costPerKm.toFixed(2) : '—'}
          loading={kpiQuery.isLoading}
        />
      </div>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Moves today', value: kpiQuery.data?.today ?? '—' },
          { label: 'In transit', value: kpiQuery.data?.inTransit ?? '—' },
          { label: 'Delivered today', value: kpiQuery.data?.delivered ?? '—' },
          { label: 'Cost / km (today)', value: kpiQuery.data ? kpiQuery.data.costPerKm.toFixed(2) : '—' },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>
    );

  const hubBody = (
    <>
      <div className={variant === 'darkstore' ? 'darkstore-card overflow-hidden' : 'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Orders</h2>
          {variant !== 'darkstore' && (
            <Button variant="outline" size="sm" onClick={() => listQuery.refetch()} className="gap-1">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Reference</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Provider</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {((listQuery.data as { data?: LogisticsOrder[] } | undefined)?.data ?? []).map((row) => (
                <tr key={row._id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-2 font-mono text-xs">{row.referenceId}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-2">{row.provider}</td>
                  <td className="px-4 py-2 text-slate-600">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedId(row._id)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId && detailQuery.data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <PickupDropMap pickup={detailQuery.data.order.pickup} drop={detailQuery.data.order.drop} />
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={() => cancelMut.mutate(selectedId)} disabled={cancelMut.isPending}>
                Cancel move
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="font-semibold text-slate-900">Driver</h3>
              <p className="text-sm text-slate-700">{detailQuery.data.order.driverInfo?.name ?? '—'}</p>
              <p className="text-sm text-slate-600">{detailQuery.data.order.driverInfo?.phone ?? ''}</p>
              <p className="text-xs text-slate-500">{detailQuery.data.order.driverInfo?.vehicleNumber ?? ''}</p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-slate-900">Status timeline</h3>
              <Timeline items={timelineItems} />
            </div>
            {detailQuery.data.audits?.[0] && (
              <JsonViewer title="Latest provider response" data={detailQuery.data.audits[0].rawResponse} />
            )}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create bulk logistics move</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Reference ID</Label>
              <Input value={refId} onChange={(e) => setRefId(e.target.value)} placeholder="Internal PO / batch id" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Pickup phone</Label>
                <Input value={pickup.phone} onChange={(e) => setPickup({ ...pickup, phone: e.target.value })} />
              </div>
              <div>
                <Label>Drop phone</Label>
                <Input value={drop.phone} onChange={(e) => setDrop({ ...drop, phone: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={() => createMut.mutate()} disabled={!refId || createMut.isPending}>
              {createMut.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return (
    <DarkstoreLogisticsShell
      variant={variant}
      title="Replenishment"
      subtitle={titleFor(variant)}
      toolbar={{
        onRefresh: () => listQuery.refetch(),
        refreshing: listQuery.isFetching,
        showConnection: variant === 'darkstore',
        toolbarActions: (
          <Button onClick={() => setOpen(true)} className="gap-2 h-9">
            <Truck className="h-4 w-4" />
            New bulk move
          </Button>
        ),
      }}
    >
      <div className="space-y-6">
        {variant !== 'darkstore' && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Logistics</h1>
              <p className="text-sm text-slate-600">{titleFor(variant)}</p>
            </div>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Truck className="h-4 w-4" />
              New bulk move
            </Button>
          </div>
        )}
        {kpiCards}
        {hubBody}
      </div>
    </DarkstoreLogisticsShell>
  );
}
