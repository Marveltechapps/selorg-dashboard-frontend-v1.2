import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  Activity
} from 'lucide-react';
import { Zone, fetchZoneDetails, fetchZoneOrderTrend } from '../citywideControlApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ZoneDetailModalProps {
  zoneId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ZoneDetailModal({ zoneId, open, onClose }: ZoneDetailModalProps) {
  const [zone, setZone] = useState<Zone | null>(null);
  const [trendData, setTrendData] = useState<{ time: string; orders: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && zoneId) {
      loadZoneDetails();
    }
  }, [open, zoneId]);

  const loadZoneDetails = async () => {
    if (!zoneId) return;
    setLoading(true);
    try {
      const [zoneData, trend] = await Promise.all([
        fetchZoneDetails(zoneId),
        fetchZoneOrderTrend(zoneId),
      ]);
      setZone(zoneData);
      setTrendData(trend);
    } catch (error) {
      console.error('Failed to load zone details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!zone) {
    return null;
  }

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">
                Zone {zone.zoneNumber} - {zone.zoneName}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`${getStatusColor(zone.status)} text-white`}>
                  {getStatusLabel(zone.status)}
                </Badge>
                <Badge className={getSLAColor(zone.slaStatus)}>
                  SLA: {zone.slaStatus === 'breach' ? 'Breach' : zone.slaStatus === 'warning' ? 'Warning' : 'On Track'}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#71717a]">Capacity</div>
              <div className="text-2xl font-bold">{zone.capacityPercent}%</div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stores">Stores</TabsTrigger>
            <TabsTrigger value="riders">Riders</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#f4f4f5] p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-[#71717a] mb-1">
                  <Activity size={16} />
                  Capacity Usage
                </div>
                <div className="text-2xl font-bold">{zone.capacityPercent}%</div>
                <Progress value={zone.capacityPercent} className="mt-2" />
              </div>

              <div className="bg-[#f4f4f5] p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-[#71717a] mb-1">
                  <TrendingUp size={16} />
                  Active Orders
                </div>
                <div className="text-2xl font-bold">{zone.activeOrders}</div>
                <div className="text-xs text-[#71717a] mt-1">Live count</div>
              </div>

              <div className="bg-[#f4f4f5] p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-[#71717a] mb-1">
                  <Users size={16} />
                  Active Riders
                </div>
                <div className="text-2xl font-bold">{zone.activeRiders}</div>
                {zone.riderStatus === 'overload' && (
                  <Badge variant="destructive" className="mt-1">OVERLOAD</Badge>
                )}
              </div>

              <div className="bg-[#f4f4f5] p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-[#71717a] mb-1">
                  <Clock size={16} />
                  Avg Delivery Time
                </div>
                <div className="text-2xl font-bold">{zone.avgDeliveryTime}</div>
                <div className="text-xs text-[#71717a] mt-1">Target: 15m 00s</div>
              </div>
            </div>

            {zone.surgeMultiplier && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-orange-900">Surge Pricing Active</div>
                    <div className="text-sm text-orange-700">Multiplier: {zone.surgeMultiplier}x</div>
                  </div>
                  <Badge className="bg-orange-500 text-white">SURGE</Badge>
                </div>
              </div>
            )}

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

          <TabsContent value="stores" className="space-y-3">
            <div className="text-sm text-[#71717a] mb-2">
              {zone.stores.length} stores in this zone
            </div>
            {zone.stores.map((store) => (
              <div key={store.storeId} className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Store size={16} className="text-[#71717a]" />
                    <span className="font-bold">{store.storeName}</span>
                  </div>
                  <Badge variant={store.status === 'active' ? 'default' : 'destructive'}>
                    {store.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-[#71717a]">Store ID</div>
                    <div className="font-medium">{store.storeId}</div>
                  </div>
                  <div>
                    <div className="text-[#71717a]">Capacity</div>
                    <div className="font-medium">{store.capacityPercent}%</div>
                  </div>
                  <div>
                    <div className="text-[#71717a]">Active Orders</div>
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

          <TabsContent value="riders" className="space-y-3">
            <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-sm text-[#71717a]">Total Riders</div>
                  <div className="text-2xl font-bold">{zone.activeRiders}</div>
                </div>
                <div>
                  <div className="text-sm text-[#71717a]">Utilization</div>
                  <div className="text-2xl font-bold">{zone.capacityPercent}%</div>
                </div>
                <div>
                  <div className="text-sm text-[#71717a]">Status</div>
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

          <TabsContent value="performance" className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
                <div className="text-sm text-[#71717a]">Delivery SLA</div>
                <div className={`text-2xl font-bold ${
                  zone.slaStatus === 'breach' ? 'text-rose-600' : 
                  zone.slaStatus === 'warning' ? 'text-amber-600' : 
                  'text-emerald-600'
                }`}>
                  {zone.avgDeliveryTime}
                </div>
                <div className="text-xs text-[#71717a] mt-1">
                  Target: 15m 00s
                </div>
              </div>

              <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
                <div className="text-sm text-[#71717a]">Order Fulfillment</div>
                <div className="text-2xl font-bold text-emerald-600">97.2%</div>
                <div className="text-xs text-[#71717a] mt-1">Last 24 hours</div>
              </div>

              <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
                <div className="text-sm text-[#71717a]">Rider Utilization</div>
                <div className="text-2xl font-bold">{zone.capacityPercent}%</div>
                <Progress value={zone.capacityPercent} className="mt-2" />
              </div>

              <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
                <div className="text-sm text-[#71717a]">Surge Factor</div>
                <div className="text-2xl font-bold">
                  {zone.surgeMultiplier ? `${zone.surgeMultiplier}x` : 'None'}
                </div>
                <div className="text-xs text-[#71717a] mt-1">Current multiplier</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="incidents" className="space-y-3">
            {zone.stores.some(s => s.status === 'offline') ? (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-rose-900 font-bold mb-2">
                  <AlertTriangle size={16} />
                  Active Incidents
                </div>
                {zone.stores
                  .filter(s => s.status === 'offline')
                  .map(store => (
                    <div key={store.storeId} className="bg-white p-3 rounded border border-rose-200 mb-2 last:mb-0">
                      <div className="font-bold">{store.storeName} - Offline</div>
                      <div className="text-sm text-[#71717a] mt-1">Store ID: {store.storeId}</div>
                      <Button variant="outline" size="sm" className="mt-2">
                        View Details
                      </Button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#71717a]">
                <Activity size={48} className="mx-auto mb-2 opacity-20" />
                <div>No active incidents in this zone</div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}