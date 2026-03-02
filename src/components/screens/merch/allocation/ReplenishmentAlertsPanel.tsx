import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AllocateStockModal } from './AllocateStockModal';
import { ClearancePromoModal } from './ClearancePromoModal';
import { allocationApi } from './allocationApi';
import { toast } from 'sonner';

interface Alert {
  _id?: string;
  id?: string;
  type: string;
  severity: string;
  sku: string;
  location: string;
  message: string;
  batch?: string;
  time?: string;
}

export function ReplenishmentAlertsPanel() {
  const [filter, setFilter] = useState('all');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await allocationApi.fetchAlerts();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleAllocationComplete = async () => {
    if (selectedAlert) {
      try {
        await allocationApi.dismissAlert(selectedAlert._id ?? selectedAlert.id ?? '');
        setAlerts(prev => prev.filter(a => (a._id ?? a.id) !== (selectedAlert._id ?? selectedAlert.id)));
        setSelectedAlert(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to dismiss');
      }
    }
    loadAlerts();
  };

  const handlePromoComplete = () => {
    if (selectedAlert) {
      setAlerts(prev => prev.filter(a => (a._id ?? a.id) !== (selectedAlert._id ?? selectedAlert.id)));
      setSelectedAlert(null);
    }
    loadAlerts();
  };

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'low_stock') return a.type === 'low_stock';
    if (filter === 'expiry') return a.type === 'expiry';
    return true;
  });

  const handleDismiss = async (id: string) => {
    try {
      await allocationApi.dismissAlert(id);
      setAlerts(prev => prev.filter(a => (a._id ?? a.id) !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to dismiss');
    }
  };

  const handleAction = (alert: Alert) => {
    setSelectedAlert(alert);
    if (alert.type === 'low_stock') {
      setAllocateOpen(true);
    } else if (alert.type === 'expiry') {
      setPromoOpen(true);
    }
  };

  const alertId = (a: Alert) => a._id ?? a.id ?? '';

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col h-full items-center justify-center">
        <Loader2 className="h-10 w-10 text-[#7C3AED] animate-spin mb-4" />
        <p className="text-gray-500 text-sm">Loading replenishment alerts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col h-full items-center justify-center">
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button onClick={loadAlerts} className="text-[#7C3AED] text-sm font-medium hover:underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-[#212121] flex items-center gap-2">
          <AlertTriangle size={18} className="text-[#EF4444]" /> Replenishment Alerts
        </h3>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-xs ${filter === 'all' ? 'bg-gray-100 font-bold' : 'text-gray-500'}`}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-xs ${filter === 'low_stock' ? 'bg-red-50 text-red-700 font-bold' : 'text-gray-500'}`}
            onClick={() => setFilter('low_stock')}
          >
            Low Stock
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-xs ${filter === 'expiry' ? 'bg-yellow-50 text-yellow-700 font-bold' : 'text-gray-500'}`}
            onClick={() => setFilter('expiry')}
          >
            Expiry
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              No alerts found.
            </div>
          ) : filteredAlerts.map((alert) => (
            <div
              key={alertId(alert)}
              className={`flex items-start gap-3 p-3 rounded-lg border relative group transition-all ${
                alert.severity === 'critical' ? 'bg-red-50 border-red-100' :
                alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-100' : 'bg-blue-50 border-blue-100'
              }`}
            >
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); handleDismiss(alertId(alert)); }}
                title="Dismiss Alert"
              >
                <X size={14} />
              </button>

              <div className={`p-1.5 rounded-full mt-0.5 ${
                alert.severity === 'critical' ? 'bg-white text-red-500' :
                alert.severity === 'warning' ? 'bg-white text-yellow-600' : 'bg-white text-blue-500'
              }`}>
                <AlertTriangle size={14} />
              </div>
              <div className="flex-1 pr-6">
                <div className="flex justify-between items-start">
                  <h4 className={`text-sm font-bold ${
                    alert.severity === 'critical' ? 'text-[#991B1B]' :
                    alert.severity === 'warning' ? 'text-[#92400E]' : 'text-blue-900'
                  }`}>
                    {alert.type === 'low_stock' ? 'Low Stock' : 'Expiry Warning'}: {alert.sku}
                  </h4>
                </div>
                <p className={`text-xs mt-1 ${
                  alert.severity === 'critical' ? 'text-[#7F1D1D]' :
                  alert.severity === 'warning' ? 'text-[#92400E]' : 'text-blue-800'
                }`}>
                  {alert.message}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-medium bg-white/50 px-1.5 py-0.5 rounded">
                    {alert.location} • Due in {alert.time ?? '—'}
                  </span>
                  <Button
                    size="sm"
                    className={`h-7 text-xs font-bold ${
                      alert.type === 'low_stock'
                        ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white'
                        : 'bg-white border border-[#92400E] text-[#92400E] hover:bg-[#FEF3C7]'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAction(alert);
                    }}
                  >
                    {alert.type === 'low_stock' ? 'Allocate Stock' : 'Create Promo'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <AllocateStockModal
        open={allocateOpen}
        onOpenChange={setAllocateOpen}
        alert={selectedAlert}
        onComplete={handleAllocationComplete}
      />
      <ClearancePromoModal
        open={promoOpen}
        onOpenChange={setPromoOpen}
        alert={selectedAlert}
        onComplete={handlePromoComplete}
      />
    </div>
  );
}
