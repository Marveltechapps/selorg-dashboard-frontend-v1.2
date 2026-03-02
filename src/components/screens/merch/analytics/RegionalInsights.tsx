import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, TrendingUp, Users, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { analyticsApi } from './analyticsApi';

export function RegionalInsights({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [dateRange, setDateRange] = useState('30days');
  const [storeType, setStoreType] = useState('all');
  const [regionalData, setRegionalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await analyticsApi.getSummary({ type: 'regional', range: dateRange });
        if (!mounted) return;
        if (resp.success && Array.isArray(resp.data)) {
          setRegionalData(resp.data.map((item: any) => ({
            id: item.entityId,
            name: item.entityName,
            revenue: item.revenue || 0,
            orders: item.orders || 0,
            aov: item.aov || 0,
            redemptionRate: item.redemptionRate || 0,
            uplift: 0,
            newCustomers: 0,
            returningCustomers: 0,
            storeType: 'Dark Store'
          })));
        } else {
          setRegionalData([]);
        }
      } catch (err) {
        console.error('Failed to load regional analytics', err);
        if (mounted) {
          setError('Failed to load regional data');
          setRegionalData([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [dateRange]);

  const filteredData = useMemo(() => {
    let data = [...regionalData];
    if (storeType !== 'all') {
      const targetType = storeType === 'darkstore' ? 'Dark Store' : 'Flagship';
      data = data.filter(r => r.storeType === targetType);
    }
    return data;
  }, [storeType, regionalData]);

  const chartData = useMemo(() => {
    return filteredData.map(r => ({
      name: r.name,
      revenue: r.revenue ?? 0,
      uplift: r.uplift ?? (r.revenue ? Math.round(r.revenue * 0.12) : 0)
    }));
  }, [filteredData]);

  const topRegion = filteredData.length > 0
    ? filteredData.reduce((a, b) => (a.revenue ?? 0) >= (b.revenue ?? 0) ? a : b)
    : null;
  const highestUplift = filteredData.length > 0
    ? filteredData.reduce((a, b) => ((a.uplift ?? 0) >= (b.uplift ?? 0) ? a : b))
    : null;

  const handleViewHeatmap = () => {
    toast.info("Opening Heatmap", {
        description: "Navigating to Geofence & Targeting for regional promotion heatmap view."
    });
    if (onNavigate) onNavigate('geofence');
  };

  if (loading && regionalData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-gray-500 mt-2">Loading regional analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <p className="text-sm text-gray-500 mt-1">Please try again later.</p>
      </div>
    );
  }

  const avgAov = filteredData.length > 0
    ? filteredData.reduce((s, r) => s + (r.aov ?? 0), 0) / filteredData.length
    : 0;
  const totalOrders = filteredData.reduce((s, r) => s + (r.orders ?? 0), 0);

  return (
    <div className="space-y-6 flex flex-col min-h-0">
       {/* Filters */}
       <div className="flex flex-wrap items-center gap-4 pb-4 border-b">
        <Select 
          value={dateRange} 
          onValueChange={(value) => {
            setDateRange(value);
          }}
        >
            <SelectTrigger className="w-[150px] bg-white text-xs">
                <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
            </SelectContent>
        </Select>
         <Select 
          value={storeType} 
          onValueChange={(value) => {
            setStoreType(value);
          }}
        >
            <SelectTrigger className="w-[150px] bg-white text-xs">
                <SelectValue placeholder="Store Type" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="flagship">Flagship</SelectItem>
                <SelectItem value="darkstore">Dark Store</SelectItem>
            </SelectContent>
        </Select>
        <div className="flex items-center space-x-2 ml-auto">
             <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 text-xs" onClick={handleViewHeatmap}>
                 View Promo Heatmap
             </Button>
        </div>
      </div>

       {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-sm font-medium text-gray-500">Top Region</p>
                 <MapPin className="h-4 w-4 text-primary" />
             </div>
             <p className="text-xl font-bold truncate">{topRegion?.name ?? '-'}</p>
             <div className="text-[10px] text-green-600 mt-1 font-bold uppercase">
               ${topRegion ? ((topRegion.revenue ?? 0) / 1000).toFixed(0) + 'k Revenue' : '-'}
             </div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-sm font-medium text-gray-500">Highest Uplift</p>
                 <TrendingUp className="h-4 w-4 text-green-600" />
             </div>
             <p className="text-xl font-bold">{highestUplift?.name ?? '-'}</p>
             <div className="text-[10px] text-green-600 mt-1 font-bold uppercase">
               +{(highestUplift?.uplift ?? 0)}% Uplift
             </div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-sm font-medium text-gray-500">Avg AOV</p>
                 <span className="text-sm font-bold text-gray-400">₹</span>
             </div>
             <p className="text-2xl font-bold">₹{avgAov.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-sm font-medium text-gray-500">Total Orders</p>
                 <Users className="h-4 w-4 text-purple-600" />
             </div>
             <p className="text-2xl font-bold">{totalOrders.toLocaleString()}</p>
             <div className="text-[10px] text-gray-500 mt-1">Across all zones</div>
          </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white p-4 rounded-lg border shadow-sm h-[350px]">
          <h3 className="text-sm font-semibold mb-4">Revenue & Uplift by Region</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.length > 0 ? chartData : [{ name: '-', revenue: 0, uplift: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue ($)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="uplift" fill="#10b981" name="Promo Uplift ($)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
      </div>

       {/* Data Table */}
       <div className="bg-white rounded-lg border shadow-sm overflow-hidden shrink-0">
          <Table>
              <TableHeader className="bg-gray-50">
                  <TableRow>
                      <TableHead className="text-xs font-bold">Region/Zone</TableHead>
                      <TableHead className="text-right text-xs font-bold">Revenue</TableHead>
                      <TableHead className="text-right text-xs font-bold">Orders</TableHead>
                      <TableHead className="text-right text-xs font-bold">AOV</TableHead>
                      <TableHead className="text-right text-xs font-bold">Redemption Rate</TableHead>
                      <TableHead className="text-right text-xs font-bold">New vs Returning</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {filteredData.length === 0 ? (
                      <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-gray-400">No regions found for this filter</TableCell>
                      </TableRow>
                  ) : filteredData.map((region) => (
                      <TableRow key={region.id} className="cursor-pointer hover:bg-gray-50 h-12">
                          <TableCell className="font-medium text-blue-600 text-xs">{region.name}</TableCell>
                          <TableCell className="text-right text-xs font-bold">₹{region.revenue.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs font-bold">{region.orders.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs font-bold">₹{region.aov.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-xs font-bold">{region.redemptionRate}%</TableCell>
                          <TableCell className="text-right text-[10px]">
                              <span className="text-green-600 font-bold uppercase">{region.newCustomers} New</span> / <span className="text-gray-500 font-bold uppercase">{region.returningCustomers} Ret</span>
                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
      </div>
    </div>
  );
}
