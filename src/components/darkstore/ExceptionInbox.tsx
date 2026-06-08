import React, { useCallback, useEffect, useState } from 'react';
import { Inbox, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRTOAlerts, getStockAlerts, restockItem } from '@/api/dashboard';
import { getExceptionQueue, getOperationalAlerts } from '@/api/darkstore/operations.api';
import { callCustomer, markRTO } from '@/api/dashboard/orders.api';
import { DarkstoreScreenShell } from './DarkstoreScreenShell';
import { DarkstoreDataTable } from './DarkstoreDataTable';
import { StatusBadge } from './StatusBadge';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { toast } from 'sonner';
import { websocketService } from '@/utils/websocket';
import { Button } from '@/components/ui/button';
import { useDarkstore } from './DarkstoreProvider';
import { ExceptionPlaybook } from './ExceptionPlaybook';
import { DarkstoreTabBar } from './DarkstoreTabBar';
import { OrderJourneyStepper } from './OrderJourneyStepper';
import { SlaPostMortemPanel } from './SlaPostMortemPanel';
import { getOrderWorkflow } from '@/api/darkstore/operations.api';

type InboxItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  orderId?: string;
  sku?: string;
  severity: 'danger' | 'warning' | 'info';
};

export function ExceptionInbox({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';
  const { saveFilters, getFilters } = useDarkstore();
  const saved = getFilters('exception-inbox');
  const [typeFilter, setTypeFilter] = useState(saved.type || 'all');
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmRto, setConfirmRto] = useState<string | null>(null);
  const [confirmRestock, setConfirmRestock] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<{ status: string; timeline: { status: string; timestamp?: string }[] } | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    try {
      const [exceptions, rto, stock, ops] = await Promise.all([
        getExceptionQueue({ storeId, status: 'open', limit: 50, page: 1 }),
        getRTOAlerts(storeId),
        getStockAlerts(storeId),
        getOperationalAlerts({ storeId, status: 'open' }),
      ]);

      const merged: InboxItem[] = [];

      (exceptions.data || []).forEach((row) => {
        merged.push({
          id: `ex-${row.orderId}-${row.type}`,
          type: row.type,
          title: `Order ${row.orderId}`,
          description: row.reason || row.product || row.type,
          createdAt: row.createdAt,
          orderId: row.orderId,
          severity: row.type === 'sla_breach' ? 'danger' : 'warning',
        });
      });

      (rto.alerts || []).forEach((a: any) => {
        merged.push({
          id: `rto-${a.order_id}`,
          type: 'rto',
          title: `RTO Risk — ${a.order_id}`,
          description: a.description || a.issue_type || 'Customer unreachable',
          createdAt: a.created_at || new Date().toISOString(),
          orderId: a.order_id,
          severity: 'danger',
        });
      });

      (stock.alerts || []).forEach((a: any) => {
        merged.push({
          id: `stock-${a.sku}`,
          type: 'stock_out',
          title: a.item_name || a.sku,
          description: `${a.current_count ?? 0} left · ${a.sku}`,
          createdAt: a.created_at || new Date().toISOString(),
          sku: a.sku,
          severity: 'warning',
        });
      });

      (ops.data || []).forEach((a) => {
        merged.push({
          id: `ops-${a._id}`,
          type: 'ops_alert',
          title: a.title,
          description: a.description || a.alertType,
          createdAt: a.createdAt,
          orderId: a.orderId,
          severity: 'info',
        });
      });

      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(merged);
    } catch {
      toast.error('Failed to load exception inbox');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeId]);

  useEffect(() => {
    setLoading(true);
    load();
    const onEvt = () => load();
    websocketService.on('order:updated', onEvt);
    websocketService.on('order:created', onEvt);
    return () => {
      websocketService.off('order:updated', onEvt);
      websocketService.off('order:created', onEvt);
    };
  }, [load]);

  useEffect(() => {
    saveFilters('exception-inbox', { type: typeFilter });
  }, [typeFilter, saveFilters]);

  const filtered =
    typeFilter === 'all' ? items : items.filter((i) => i.type === typeFilter);

  useEffect(() => {
    if (!selectedItem?.orderId) {
      setSelectedWorkflow(null);
      return;
    }
    getOrderWorkflow(selectedItem.orderId)
      .then((res) => {
        if (res?.data) {
          setSelectedWorkflow({ status: res.data.status, timeline: res.data.timeline || [] });
        }
      })
      .catch(() => setSelectedWorkflow(null));
  }, [selectedItem?.orderId]);

  const handleMarkRto = async (orderId: string) => {
    try {
      await markRTO(orderId, { reason: 'Customer unreachable', rto_status: 'marked_rto' });
      toast.success(`Order ${orderId} marked as RTO — logged for audit`);
      setSelectedItem(null);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to mark RTO');
    }
  };

  const handleExportCompliance = () => {
    const lines = [
      'EXCEPTION INBOX — COMPLIANCE EXPORT',
      `Store: ${storeId}`,
      `Exported: ${new Date().toISOString()}`,
      `Filter: ${typeFilter}`,
      `Total items: ${filtered.length}`,
      '',
      'ID,Type,Title,Description,OrderId,SKU,CreatedAt,Severity',
      ...filtered.map((i) =>
        [
          i.id,
          i.type,
          `"${i.title.replace(/"/g, '""')}"`,
          `"${i.description.replace(/"/g, '""')}"`,
          i.orderId || '',
          i.sku || '',
          i.createdAt || '',
          i.severity,
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exception-inbox-${storeId || 'store'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exception inbox exported for compliance');
  };

  const handleRestock = async (sku: string) => {
    try {
      await restockItem(sku, storeId, 50, 'high');
      toast.success('Restock initiated');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Restock failed');
    }
  };

  return (
    <DarkstoreScreenShell
      title="Exception Inbox"
      subtitle="Unified queue for SLA breaches, RTO risks, stock-outs, and operational alerts."
      toolbar={{
        onRefresh: () => {
          setRefreshing(true);
          load();
        },
        refreshing,
        showConnection: true,
        filters: null,
        toolbarActions: (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleExportCompliance}
              disabled={filtered.length === 0}
            >
              <Download size={14} className="mr-1" />
              Export
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setActiveTab?.('slamonitor')}
            >
              SLA Monitor
            </Button>
          </div>
        ),
      }}
    >
      <DarkstoreTabBar
        variant="pill"
        active={typeFilter}
        onChange={setTypeFilter}
        tabs={[
          { id: 'all', label: 'All', count: items.length },
          { id: 'sla_breach', label: 'SLA', count: items.filter((i) => i.type === 'sla_breach').length },
          { id: 'missing_item', label: 'Missing', count: items.filter((i) => i.type === 'missing_item').length },
          { id: 'rto', label: 'RTO', count: items.filter((i) => i.type === 'rto').length },
          { id: 'stock_out', label: 'Stock', count: items.filter((i) => i.type === 'stock_out').length },
          { id: 'ops_alert', label: 'Ops', count: items.filter((i) => i.type === 'ops_alert').length },
        ]}
      />

      {selectedItem && (
        <div className="space-y-4 mb-4 darkstore-content-loaded">
          {selectedItem.orderId && selectedWorkflow && (
            <OrderJourneyStepper status={selectedWorkflow.status} timeline={selectedWorkflow.timeline} compact />
          )}
          <ExceptionPlaybook exceptionType={selectedItem.type} />
          {selectedItem.type === 'sla_breach' && selectedItem.orderId && (
            <SlaPostMortemPanel orderId={selectedItem.orderId} />
          )}
        </div>
      )}

      <DarkstoreDataTable
        loading={loading}
        data={filtered}
        rowKey={(r) => r.id}
        onRowClick={(r) => setSelectedItem(r)}
        emptyIcon={Inbox}
        emptyTitle="All clear"
        emptyDescription="No open exceptions for this store."
        emptyAction={
          setActiveTab ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab('overview')}>
              Back to Overview
            </Button>
          ) : undefined
        }
        rowClassName={(r) =>
          r.severity === 'danger' ? 'border-l-2 border-l-red-500' : r.severity === 'warning' ? 'border-l-2 border-l-amber-400' : ''
        }
        columns={[
          {
            key: 'type',
            header: 'Type',
            render: (r) => <StatusBadge variant="exception" status={r.type} />,
          },
          {
            key: 'title',
            header: 'Item',
            sticky: true,
            render: (r) => (
              <div>
                <p className="font-semibold text-slate-800">{r.title}</p>
                <p className="text-xs text-slate-500 truncate max-w-xs">{r.description}</p>
              </div>
            ),
          },
          {
            key: 'time',
            header: 'When',
            render: (r) => (
              <span className="text-xs text-slate-500">
                {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
              </span>
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (r) => (
              <div className="flex gap-1">
                {r.orderId && r.type === 'rto' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        callCustomer(r.orderId!).then(() => toast.success('Call initiated')).catch(() => toast.error('Call failed'));
                      }}
                    >
                      Call
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmRto(r.orderId!);
                      }}
                    >
                      Mark RTO
                    </Button>
                  </>
                )}
                {r.sku && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmRestock(r.sku!);
                    }}
                  >
                    Restock
                  </Button>
                )}
                {r.orderId && r.type === 'sla_breach' && setActiveTab && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('liveorders');
                    }}
                  >
                    View order
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />

      <ConfirmationDialog
        open={!!confirmRto}
        onOpenChange={(o) => !o && setConfirmRto(null)}
        title="Mark order as RTO?"
        description="This will move the order to returns and cannot be undone easily."
        variant="destructive"
        confirmText="Mark RTO"
        onConfirm={() => confirmRto && handleMarkRto(confirmRto)}
      />
      <ConfirmationDialog
        open={!!confirmRestock}
        onOpenChange={(o) => !o && setConfirmRestock(null)}
        title="Initiate restock?"
        description="A replenishment task will be created for this SKU."
        confirmText="Restock"
        onConfirm={() => confirmRestock && handleRestock(confirmRestock)}
      />
    </DarkstoreScreenShell>
  );
}
