import React, { useState, useEffect } from 'react';
import { AdminModal } from './AdminModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Users, 
  Store, 
  Clock,
  AlertTriangle,
  Activity,
  Loader2,
} from 'lucide-react';
import { Zone, Incident, LiveMetrics, fetchIncidents, fetchLiveMetrics, fetchZoneDetails, fetchZoneOrderTrend } from '../citywideControlApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ZoneDetailModalProps {
  zoneId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ZoneDetailModal({ zoneId, open, onClose }: ZoneDetailModalProps) {
  const [zone, setZone] = useState<Zone | null>(null);
  const [trendData, setTrendData] = useState<{ time: string; orders: number }[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && zoneId) {
      loadZoneDetails();
    }
  }, [open, zoneId]);

  useEffect(() => {
    if (!open || !zoneId) return;
    const interval = window.setInterval(() => {
      loadZoneDetails(true);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [open, zoneId]);

  const loadZoneDetails = async (silent = false) => {
    if (!zoneId) return;
    if (!silent) setLoading(true);
    try {
      const [zoneData, trend, latestIncidents, metrics] = await Promise.all([
        fetchZoneDetails(zoneId),
        fetchZoneOrderTrend(zoneId),
        fetchIncidents(undefined, 'ongoing'),
        fetchLiveMetrics(),
      ]);
      setZone(zoneData);
      setTrendData(trend);
      setIncidents(latestIncidents);
      setLiveMetrics(metrics);
    } catch (error) {
      console.error('Failed to load zone details:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-rose-500';
      case 'warning': return 'bg-amber-500';
      case 'surge': return 'bg-orange-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-emerald-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'critical': return 'CRITICAL';
      case 'warning': return 'WARNING';
      case 'surge': return 'SURGE ACTIVE';
      case 'offline': return 'OFFLINE';
      default: return 'NORMAL';
    }
  };

  const getSLAColor = (slaStatus: string) => {
    switch (slaStatus) {
      case 'breach': return 'text-rose-600 bg-rose-50';
      case 'warning': return 'text-amber-600 bg-amber-50';
      default: return 'text-emerald-600 bg-emerald-50';
    }
  };

  const zoneIncidents = zone
    ? incidents.filter((incident) => {
    const normalizedZoneName = zone.zoneName.toLowerCase();
    const storeNames = zone.stores.map((store) => store.storeName.toLowerCase());
    const storeIds = zone.stores.map((store) => store.storeId.toLowerCase());
    const text = `${incident.title || ''} ${incident.description || ''} ${incident.storeName || ''} ${incident.storeId || ''}`.toLowerCase();
    return (
      text.includes(normalizedZoneName) ||
      storeNames.some((name) => name && text.includes(name)) ||
      storeIds.some((id) => id && text.includes(id))
    );
  })
    : [];

  const targetTime = liveMetrics?.targetDeliveryFormatted || '15m 00s';
  const fulfillmentRate = zone && zone.activeOrders > 0
    ? Math.max(80, 100 - Math.round((zoneIncidents.length * 100) / Math.max(zone.activeOrders, 1)))
    : 100;

  return (
    <AdminModal
      open={open}
      onOpenChange={handleOpenChange}
      scrollBody={false}
      title={zone ? `Zone ${zone.zoneNumber} - ${zone.zoneName}` : 'Zone details'}
      subtitle={zone ? `Capacity: ${zone.capacityPercent}%` : 'Loading zone data…'}
      maxWidth="max-w-3xl"
    >
      {loading || !zone ? (
        <div className="flex min-h-[16rem] items-center justify-center px-6 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : (
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
        <div className="flex items-center gap-2 mb-4">
          <Badge className={`${getStatusColor(zone.status)} text-white`}>
            {getStatusLabel(zone.status)}
          </Badge>
          <Badge className={getSLAColor(zone.slaStatus)}>
            SLA: {zone.slaStatus === 'breach' ? 'Breach' : zone.slaStatus === 'warning' ? 'Warning' : 'On Track'}
          </Badge>
        </div>

        <Tabs defaultValue="overview" className="flex flex-1 min-h-0 flex-col">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stores">Stores</TabsTrigger>
            <TabsTrigger value="riders">Riders</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Activity size={16} />
                  Capacity Usage
                </div>
                <div className="text-2xl font-bold">{zone.capacityPercent}%</div>
                <Progress value={zone.capacityPercent} className="mt-2" />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <TrendingUp size={16} />
                  Active Orders
                </div>
                <div className="text-2xl font-bold">{zone.activeOrders}</div>
                <div className="text-xs text-gray-500 mt-1">Live count</div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Users size={16} />
                  Active Riders
                </div>
                <div className="text-2xl font-bold">{zone.activeRiders}</div>
                {zone.riderStatus === 'overload' && (
                  <Badge variant="destructive" className="mt-1">OVERLOAD</Badge>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Clock size={16} />
                  Avg Delivery Time
                </div>
                <div className="text-2xl font-bold">{zone.avgDeliveryTime}</div>
                <div className="text-xs text-gray-500 mt-1">Target: 15m 00s</div>
              </div>
            </div>

            <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
              <h4 className="font-bold mb-3">Order Trend (Last 12 Hours)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData.length > 0 ? trendData : [{ time: 'No data', orders: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="stores" className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            <div className="text-sm text-gray-500 mb-2">
              {zone.stores.length} stores in this zone
            </div>
            {zone.stores.map((store) => (
              <div key={store.storeId} className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Store size={16} className="text-gray-500" />
                    <span className="font-bold">{store.storeName}</span>
                  </div>
                  <Badge variant={store.status === 'active' ? 'default' : 'destructive'}>
                    {store.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Store ID</div>
                    <div className="font-medium">{store.storeId}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Capacity</div>
                    <div className="font-medium">{store.capacityPercent}%</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Active Orders</div>
                    <div className="font-medium">{store.activeOrders}</div>
                  </div>
                </div>
                {store.status === 'offline' && (
                  <div className="mt-2 text-xs text-rose-600 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Store is currently offline
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="riders" className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-500">Total Riders</div>
                  <div className="text-2xl font-bold">{zone.activeRiders}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Utilization</div>
                  <div className="text-2xl font-bold">{zone.capacityPercent}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <Badge variant={zone.riderStatus === 'overload' ? 'destructive' : 'default'}>
                    {zone.riderStatus.toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              {zone.riderStatus === 'overload' && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg mb-4">
                  <div className="flex items-center gap-2 text-rose-900 font-bold mb-1">
                    <AlertTriangle size={16} />
                    Rider Overload Detected
                  </div>
                  <div className="text-sm text-rose-700">
                    Current demand exceeds available rider capacity. Consider assigning more riders to this zone.
                  </div>
                </div>
              )}

              <Button className="w-full">Assign More Riders</Button>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
                <div className="text-sm text-gray-500">Delivery SLA</div>
                <div className={`text-2xl font-bold ${
                  zone.slaStatus === 'breach' ? 'text-rose-600' : 
                  zone.slaStatus === 'warning' ? 'text-amber-600' : 
                  'text-emerald-600'
                }`}>
                  {zone.avgDeliveryTime}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Target: {targetTime}
                </div>
              </div>

              <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
                <div className="text-sm text-gray-500">Order Fulfillment</div>
                <div className="text-2xl font-bold text-emerald-600">{fulfillmentRate}%</div>
                <div className="text-xs text-gray-500 mt-1">Derived from live orders vs incidents</div>
              </div>

              <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
                <div className="text-sm text-gray-500">Rider Utilization</div>
                <div className="text-2xl font-bold">{zone.capacityPercent}%</div>
                <Progress value={zone.capacityPercent} className="mt-2" />
              </div>

              <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
                <div className="text-sm text-gray-500">Surge Factor</div>
                <div className="text-2xl font-bold">
                  {zone.surgeMultiplier ? `${zone.surgeMultiplier}x` : 'None'}
                </div>
                <div className="text-xs text-gray-500 mt-1">Current multiplier</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="incidents" className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            {zoneIncidents.length > 0 ? (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-rose-900 font-bold mb-2">
                  <AlertTriangle size={16} />
                  Active Incidents
                </div>
                {zoneIncidents.map((incident) => (
                  <div key={incident.id} className="bg-white p-3 rounded border border-rose-200 mb-2 last:mb-0">
                    <div className="font-bold">{incident.title}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {incident.storeName || incident.storeId || zone.zoneName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{incident.description}</div>
                    <div className="text-xs text-rose-700 mt-1 uppercase font-semibold">{incident.severity}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity size={48} className="mx-auto mb-2 opacity-20" />
                <div>No active incidents in this zone</div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      )}
    </AdminModal>
  );
}