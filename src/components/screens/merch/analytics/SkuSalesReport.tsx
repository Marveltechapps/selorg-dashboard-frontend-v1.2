import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Package, TrendingDown, AlertCircle, Loader2 } from 'lucide-react';
import { analyticsApi } from './analyticsApi';

export function SkuSalesReport() {
  const [dateRange, setDateRange] = useState('30days');
  const [category, setCategory] = useState('all');
  const [promoOnly, setPromoOnly] = useState(false);
  const [skuData, setSkuData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await analyticsApi.getSummary({ type: 'sku', range: dateRange });
        if (!mounted) return;
        if (resp.success && Array.isArray(resp.data)) {
          setSkuData(resp.data.map((item: any) => ({
            id: item.entityId,
            name: item.entityName,
            code: item.entityId,
            category: 'General',
            unitsSold: item.unitsSold || 0,
            revenue: item.revenue || 0,
            margin: 30,
            stock: 100,
            daysCover: 5,
            promoImpact: 10
          })));
        } else {
          setSkuData([]);
        }
      } catch (err) {
        console.error('Failed to load SKU analytics', err);
        if (mounted) {
          setError('Failed to load SKU data');
          setSkuData([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [dateRange]);

  const filteredData = useMemo(() => {
    let data = [...skuData];
    if (category !== 'all') {
      data = data.filter(sku => sku.category?.toLowerCase?.() === category.toLowerCase());
    }
    if (promoOnly) {
      data = data.filter(sku => (sku.promoImpact ?? 0) > 0);
    }
    return data;
  }, [category, promoOnly, skuData]);

  if (loading && skuData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-gray-500 mt-2">Loading SKU analytics...</p>
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

  return (
    <div className="space-y-6 h-full flex flex-col">
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
          value={category} 
          onValueChange={(value) => {
            setCategory(value);
          }}
        >
            <SelectTrigger className="w-[150px] bg-white text-xs">
                <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="produce">Produce</SelectItem>
                <SelectItem value="dairy">Dairy</SelectItem>
                <SelectItem value="beverages">Beverages</SelectItem>
            </SelectContent>
        </Select>
        <div className="flex items-center space-x-2 ml-auto">
            <Switch 
              id="promo-only" 
              checked={promoOnly} 
              onCheckedChange={(checked) => {
                setPromoOnly(checked);
                toast.success("Filter updated", {
                  description: checked ? "Showing only promo-linked SKUs" : "Showing all SKUs"
                });
              }} 
            />
            <Label htmlFor="promo-only" className="text-xs">Show only promo-linked SKUs</Label>
        </div>
      </div>

       {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-sm font-medium text-gray-500">Total Units Sold</p>
                 <Package className="h-4 w-4 text-blue-600" />
             </div>
             <p className="text-2xl font-bold">{filteredData.reduce((acc, s) => acc + s.unitsSold, 0).toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-sm font-medium text-gray-500">Total GMV</p>
                 <span className="text-sm font-bold text-gray-400">₹</span>
             </div>
             <p className="text-2xl font-bold">₹{filteredData.reduce((acc, s) => acc + s.revenue, 0).toLocaleString()}</p>
          </div>
           <div className="bg-white p-4 rounded-lg border shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-sm font-medium text-gray-500">Active SKUs</p>
                 <span className="text-[10px] px-1.5 py-0 h-4 rounded bg-green-100 text-green-700 font-bold uppercase tracking-wider">Healthy</span>
             </div>
             <p className="text-2xl font-bold">{filteredData.length}</p>
          </div>
           <div className="bg-white p-4 rounded-lg border shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-sm font-medium text-gray-500">Top 20% Conc.</p>
                 <AlertCircle className="h-4 w-4 text-yellow-500" />
             </div>
             <p className="text-2xl font-bold">68%</p>
             <div className="text-[10px] text-gray-500 mt-1">of sales from top SKUs</div>
          </div>
      </div>

      {/* Main Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 h-[400px]">
          <div className="md:col-span-2 bg-white p-4 rounded-lg border shadow-sm flex flex-col">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold">Top 10 SKUs by Units Sold</h3>
               </div>
               <div className="flex-1 min-h-0">
                   {filteredData.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={filteredData
                              .slice()
                              .sort((a, b) => b.unitsSold - a.unitsSold)
                              .slice(0, 10)
                              .map(sku => ({ name: sku.name, unitsSold: sku.unitsSold }))} 
                            layout="vertical" 
                            margin={{ left: 40, right: 20, top: 10, bottom: 10 }}
                          >
                              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                              <XAxis type="number" />
                              <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 9}} interval={0} />
                              <Tooltip cursor={{fill: '#f3f4f6'}} />
                              <Bar dataKey="unitsSold" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} name="Units Sold" />
                          </BarChart>
                     </ResponsiveContainer>
                   ) : (
                     <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                       No data available
                     </div>
                   )}
               </div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm overflow-y-auto">
              <h3 className="text-sm font-semibold mb-4 text-red-600 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" /> Slow Movers
              </h3>
              <div className="space-y-4">
                  {filteredData.filter(s => (s.daysCover ?? 0) > 20).length > 0 ? (
                      filteredData
                        .filter(s => (s.daysCover ?? 0) > 20)
                        .sort((a, b) => (b.daysCover ?? 0) - (a.daysCover ?? 0))
                        .slice(0, 6)
                        .map((item) => (
                          <div key={item.id} className="flex justify-between items-center p-2 rounded bg-red-50">
                              <span className="text-xs font-medium text-gray-700">{item.name}</span>
                              <span className="text-[10px] font-bold text-red-600 uppercase tracking-tighter">{item.daysCover ?? 0} days cover</span>
                          </div>
                        ))
                  ) : (
                      <p className="text-xs text-gray-500 py-4">No slow movers in current data.</p>
                  )}
              </div>
          </div>
      </div>

       {/* Data Table */}
       <div className="bg-white rounded-lg border shadow-sm overflow-hidden shrink-0">
          <Table>
              <TableHeader className="bg-gray-50">
                  <TableRow>
                      <TableHead className="text-xs font-bold">SKU Name</TableHead>
                      <TableHead className="text-xs font-bold">Category</TableHead>
                      <TableHead className="text-right text-xs font-bold">Units Sold</TableHead>
                      <TableHead className="text-right text-xs font-bold">Revenue</TableHead>
                      <TableHead className="text-right text-xs font-bold">Margin</TableHead>
                      <TableHead className="text-right text-xs font-bold">Stock</TableHead>
                      <TableHead className="text-right text-xs font-bold">Days Cover</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {filteredData.length === 0 ? (
                      <TableRow>
                          <TableCell colSpan={7} className="text-center py-10 text-gray-400">No SKUs found for this filter</TableCell>
                      </TableRow>
                  ) : filteredData.map((sku) => (
                      <TableRow key={sku.id} className="cursor-pointer hover:bg-gray-50 h-12">
                          <TableCell>
                              <div className="font-medium text-blue-600 text-xs">{sku.name}</div>
                              <div className="text-[10px] text-gray-400">{sku.code}</div>
                          </TableCell>
                          <TableCell className="text-xs">{sku.category}</TableCell>
                          <TableCell className="text-right text-xs font-bold">{sku.unitsSold}</TableCell>
                          <TableCell className="text-right text-xs font-bold">₹{sku.revenue.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs font-bold">{sku.margin}%</TableCell>
                          <TableCell className="text-right text-xs font-bold">{sku.stock}</TableCell>
                          <TableCell className="text-right">
                              <Badge variant={sku.daysCover > 30 ? 'destructive' : sku.daysCover < 3 ? 'secondary' : 'outline'} className="text-[10px] px-1.5 h-5">
                                  {sku.daysCover} days
                              </Badge>
                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
      </div>
    </div>
  );
}
