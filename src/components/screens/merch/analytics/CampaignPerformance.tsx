import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, IndianRupee, ShoppingBag, Percent, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CampaignAnalyticsModal } from '../components/CampaignAnalyticsModal';
import { analyticsApi } from './analyticsApi';

export function CampaignPerformance() {
  const [dateRange, setDateRange] = useState('30days');
  const [campaignType, setCampaignType] = useState('all');
  const [campaignData, setCampaignData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await analyticsApi.getSummary({ type: 'campaign', range: dateRange });
        if (!mounted) return;
        if (resp.success && Array.isArray(resp.data)) {
          setCampaignData(resp.data.map((item: any) => ({
            id: item.entityId,
            name: item.entityName,
            type: 'Discount',
            status: 'Active',
            revenue: item.revenue || 0,
            uplift: item.uplift || 0,
            redemptionRate: 0,
            roi: item.roi || 0
          })));
        } else {
          setCampaignData([]);
        }
      } catch (err) {
        console.error('Failed to load campaign analytics', err);
        if (mounted) {
          setError('Failed to load campaign data');
          setCampaignData([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [dateRange]);

  const filteredData = useMemo(() => {
    let data = [...campaignData];
    if (campaignType !== 'all') {
      const typeMap: Record<string, string> = {
        'discount': 'Discount',
        'bundle': 'Bundle',
        'flash sale': 'Flash Sale',
        'flashsale': 'Flash Sale'
      };
      const normalizedType = campaignType.toLowerCase().replace(/\s+/g, '');
      const targetType = typeMap[normalizedType] || campaignType;
      data = data.filter(c => {
        const cTypeNorm = c.type?.toLowerCase?.()?.replace(/\s+/g, '') ?? '';
        const targetNorm = targetType.toLowerCase().replace(/\s+/g, '');
        return cTypeNorm === targetNorm;
      });
    }
    return data;
  }, [campaignType, campaignData]);

  const chartData = useMemo(() => {
    return filteredData.map(c => ({ name: c.name, revenue: c.revenue ?? 0, uplift: c.uplift ?? 0 }));
  }, [filteredData]);

  const handleSavePreset = () => {
    toast.success("Preset Saved", {
        description: `Your filters for ${campaignType} campaigns over ${dateRange} have been saved.`
    });
  };

  if (loading && campaignData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-gray-500 mt-2">Loading campaign analytics...</p>
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
    <div className="space-y-6 flex flex-col min-h-0">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 pb-4 border-b">
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
                <SelectItem value="90days">Last Quarter</SelectItem>
            </SelectContent>
        </Select>
         <Select 
          value={campaignType} 
          onValueChange={(value) => {
            setCampaignType(value);
          }}
        >
            <SelectTrigger className="w-[180px] bg-white text-xs">
                <SelectValue placeholder="Campaign Type" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="discount">Discount</SelectItem>
                <SelectItem value="bundle">Bundle</SelectItem>
                <SelectItem value="flash sale">Flash Sale</SelectItem>
            </SelectContent>
        </Select>
        <Button 
          variant="outline" 
          className="ml-auto text-xs h-8" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSavePreset();
          }}
          type="button"
        >
          Save Preset
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-sm font-medium text-gray-500">Total Promo Revenue</p>
                 <IndianRupee className="h-4 w-4 text-green-600" />
             </div>
             <p className="text-2xl font-bold">₹{filteredData.reduce((acc, c) => acc + c.revenue, 0).toLocaleString()}</p>
             <div className="flex items-center text-xs text-green-600 mt-1">
                 <TrendingUp className="h-3 w-3 mr-1" /> +12.5% vs baseline
             </div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-sm font-medium text-gray-500">Avg Uplift</p>
                 <TrendingUp className="h-4 w-4 text-blue-600" />
             </div>
             <p className="text-2xl font-bold">{(filteredData.reduce((acc, c) => acc + c.uplift, 0) / (filteredData.length || 1)).toFixed(1)}%</p>
             <div className="flex items-center text-xs text-green-600 mt-1">
                 <TrendingUp className="h-3 w-3 mr-1" /> +2.1%
             </div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-sm font-medium text-gray-500">Avg Discount Depth</p>
                 <Percent className="h-4 w-4 text-orange-600" />
             </div>
             <p className="text-2xl font-bold">14.5%</p>
             <div className="text-xs text-gray-500 mt-1">Target: &lt;15%</div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-sm font-medium text-gray-500">Total Redemptions</p>
                 <ShoppingBag className="h-4 w-4 text-purple-600" />
             </div>
             <p className="text-2xl font-bold">4,520</p>
             <div className="text-xs text-gray-500 mt-1">Across {filteredData.length} campaigns</div>
          </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white p-4 rounded-lg border shadow-sm h-[350px]">
          <h3 className="text-sm font-semibold mb-4">Revenue & Uplift Trend</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData.length > 0 ? chartData : [{ name: '-', revenue: 0, uplift: 0 }]}>
                <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                     <linearGradient id="colorUplift" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" name="Revenue ($)" />
                <Area type="monotone" dataKey="uplift" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUplift)" name="Uplift (%)" />
            </AreaChart>
          </ResponsiveContainer>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden shrink-0">
          <Table>
              <TableHeader className="bg-gray-50">
                  <TableRow>
                      <TableHead className="text-xs font-bold">Campaign Name</TableHead>
                      <TableHead className="text-xs font-bold">Type</TableHead>
                      <TableHead className="text-xs font-bold">Status</TableHead>
                      <TableHead className="text-right text-xs font-bold">Revenue</TableHead>
                      <TableHead className="text-right text-xs font-bold">Uplift</TableHead>
                      <TableHead className="text-right text-xs font-bold">ROI</TableHead>
                      <TableHead className="text-right text-xs font-bold">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {filteredData.length === 0 ? (
                      <TableRow>
                          <TableCell colSpan={7} className="text-center py-10 text-gray-400">No campaigns found for this filter</TableCell>
                      </TableRow>
                  ) : filteredData.map((campaign) => (
                      <TableRow key={campaign.id} className="cursor-pointer hover:bg-gray-50 h-12">
                          <TableCell className="font-medium text-blue-600 text-xs">{campaign.name}</TableCell>
                          <TableCell className="text-xs">{campaign.type}</TableCell>
                          <TableCell>
                              <Badge variant={campaign.status === 'Active' ? 'default' : 'secondary'} className={cn("text-[10px] px-1.5 py-0 h-5", campaign.status === 'Ended' ? 'bg-gray-200 text-gray-700' : '')}>
                                  {campaign.status}
                              </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold">₹{campaign.revenue.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-green-600 text-xs font-bold">+{campaign.uplift}%</TableCell>
                          <TableCell className="text-right text-xs font-bold">{campaign.roi}x</TableCell>
                          <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedCampaign(campaign.name);
                                  setIsDetailsOpen(true);
                                }}
                                type="button"
                              >
                                Details
                              </Button>
                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
      </div>

      {/* Campaign Details Modal */}
      <CampaignAnalyticsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedCampaign(null);
        }}
        campaignName={selectedCampaign || "Campaign"}
      />
    </div>
  );
}
