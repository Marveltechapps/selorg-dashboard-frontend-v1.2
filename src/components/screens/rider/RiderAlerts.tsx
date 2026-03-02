import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import { CheckCircle, Clock, UserX, MapPin, RefreshCw } from 'lucide-react';
import { alertsApi, Alert } from './alertsApi';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export function RiderAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await alertsApi.getAlerts({ status: 'pending' });
      setAlerts(data.alerts);
    } catch (error) {
      console.error('Failed to load alerts', error);
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertsApi.markAllRead();
      toast.success('All alerts marked as read');
      loadData();
    } catch (error) {
      console.error('Failed to mark all as read', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleAction = async (id: string, actionType: string) => {
    try {
      await alertsApi.performAction(id, actionType);
      toast.success(`Action '${actionType}' performed successfully`);
      loadData();
    } catch (error) {
      console.error(`Failed to perform action ${actionType}`, error);
      toast.error(`Failed to perform action`);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'sla_breach': return <Clock size={24} />;
      case 'rider_no_show': return <UserX size={24} />;
      case 'zone_deviation': return <MapPin size={24} />;
      default: return <Clock size={24} />;
    }
  };

  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'sla_breach': return 'bg-red-50 border-red-200 text-[#EF4444] text-[#991B1B] text-[#7F1D1D]';
      case 'rider_no_show': return 'bg-yellow-50 border-yellow-200 text-[#F59E0B] text-[#92400E] text-[#92400E]';
      case 'zone_deviation': return 'bg-orange-50 border-orange-200 text-[#F97316] text-[#9A3412] text-[#9A3412]';
      default: return 'bg-blue-50 border-blue-200 text-[#3B82F6] text-[#1E3A8A] text-[#1E3A8A]';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rider Alerts"
        subtitle="Delivery incidents and notifications"
        actions={
          <div className="flex gap-2">
            <button 
              onClick={loadData}
              className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button 
              onClick={handleMarkAllRead}
              className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
            >
              <CheckCircle size={16} />
              Mark All Read
            </button>
          </div>
        }
      />

      <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              No active alerts at the moment.
            </div>
          ) : (
            alerts.map((alert) => {
              const styles = getAlertStyles(alert.type).split(' ');
              return (
                <div key={alert.id} className={`p-4 ${styles[0]} border ${styles[1]} rounded-xl flex gap-4 items-start shadow-sm`}>
                    <div className="p-2 bg-white rounded-full shadow-sm" style={{ color: styles[2] }}>
                        {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold" style={{ color: styles[3] }}>{alert.title}</h3>
                            <span className="text-xs font-bold" style={{ color: styles[3] }}>
                              {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                            </span>
                        </div>
                        <p className="text-sm mt-1" style={{ color: styles[4] }}>{alert.description}</p>
                        <div className="flex gap-3 mt-3">
                            {alert.type === 'sla_breach' && (
                              <>
                                <button onClick={() => handleAction(alert.id, 'notify_customer')} className="px-3 py-1.5 bg-[#EF4444] text-white text-xs font-bold rounded hover:bg-[#DC2626] transition-colors">Notify Customer</button>
                                <button onClick={() => handleAction(alert.id, 'reassign_rider')} className={`px-3 py-1.5 bg-white border ${styles[1]} text-xs font-bold rounded hover:bg-white/50 transition-colors`} style={{ color: styles[3] }}>Re-assign</button>
                              </>
                            )}
                            {alert.type === 'rider_no_show' && (
                              <>
                                <button onClick={() => handleAction(alert.id, 'call_rider')} className="px-3 py-1.5 bg-[#F59E0B] text-white text-xs font-bold rounded hover:bg-[#D97706] transition-colors">Call Rider</button>
                                <button onClick={() => handleAction(alert.id, 'mark_offline')} className={`px-3 py-1.5 bg-white border ${styles[1]} text-xs font-bold rounded hover:bg-white/50 transition-colors`} style={{ color: styles[3] }}>Mark Offline</button>
                              </>
                            )}
                            {alert.type === 'zone_deviation' && (
                              <button onClick={() => handleAction(alert.id, 'acknowledge')} className="px-3 py-1.5 bg-[#F97316] text-white text-xs font-bold rounded hover:bg-[#EA580C] transition-colors">Acknowledge</button>
                            )}
                            <button onClick={() => handleAction(alert.id, 'resolve')} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded hover:bg-gray-50 transition-colors">Resolve</button>
                        </div>
                    </div>
                </div>
              );
            })
          )}
      </div>
    </div>
  );
}