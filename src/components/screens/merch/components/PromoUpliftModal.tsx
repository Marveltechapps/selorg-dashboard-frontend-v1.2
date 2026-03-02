import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { ScrollArea } from "../../../ui/scroll-area";
import { Download, Calendar, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getPromoUplift } from '../../../../api/merch/merchApi';

interface PromoUpliftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPricingChanges?: () => void;
}

export function PromoUpliftModal({ isOpen, onClose, onOpenPricingChanges }: PromoUpliftModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState('campaign');
  const [upliftData, setUpliftData] = useState<{ name: string; baseline: number; uplift: number }[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState<{ totalUplift: number; avgDiscount: number; roi: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchUplift = async () => {
        try {
          setLoading(true);
          const res = await getPromoUplift();
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            const raw = res.data;
            const mapped = raw.map((row: { month?: string; uplift?: number; revenue?: number; topCategory?: string }) => {
              const upliftPct = Number(row.uplift) || 0;
              const revenue = Number(row.revenue) || 0;
              const baseline = upliftPct > 0 ? revenue / (1 + upliftPct / 100) : revenue * 0.85;
              return {
                name: row.month || '—',
                baseline: Math.round(baseline),
                uplift: revenue,
              };
            });
            setUpliftData(mapped);
            const totalRev = mapped.reduce((s, r) => s + r.uplift, 0);
            const totalBase = mapped.reduce((s, r) => s + r.baseline, 0);
            const totalUpliftPct = totalBase > 0 ? ((totalRev - totalBase) / totalBase) * 100 : 0;
            setSummaryMetrics({
              totalUplift: Math.round(totalUpliftPct),
              avgDiscount: 15,
              roi: totalBase > 0 ? Math.round((totalRev / totalBase) * 10) / 10 : 0,
            });
          } else {
            setUpliftData([]);
            setSummaryMetrics(null);
          }
        } catch {
          toast.error('Failed to load promo uplift data');
          setUpliftData([]);
          setSummaryMetrics(null);
        } finally {
          setLoading(false);
        }
      };
      fetchUplift();

      const style = document.createElement('style');
      style.textContent = `
        [data-slot="scroll-area-viewport"] {
          overflow-y: auto !important;
          max-height: calc(90vh - 180px) !important;
        }
        [data-slot="scroll-area-scrollbar"] {
          opacity: 1 !important;
        }
      `;
      document.head.appendChild(style);
      return () => { document.head.removeChild(style); };
    }
  }, [isOpen]);

  const handleBreakdownChange = (value: string) => {
    setBreakdown(value);
  };

  const handleExport = () => {
    setIsExporting(true);
    toast.info("Preparing data for export...");
    
    // Generate CSV content
    const csvRows = ['Period,Baseline Sales,Promo Sales,Uplift'];
    upliftData.forEach(item => {
      const uplift = ((item.uplift - item.baseline) / item.baseline * 100).toFixed(2);
      csvRows.push(`${item.name},${item.baseline},${item.uplift},${uplift}%`);
    });
    
    const csvContent = csvRows.join('\n');
    
    setTimeout(() => {
      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Promo_Uplift_Analytics_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setIsExporting(false);
      toast.success("Export Complete", {
          description: "Promo_Uplift_Analytics.csv has been downloaded."
      });
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="sm:max-w-[800px] flex flex-col p-0" 
        style={{ 
          maxHeight: '90vh', 
          height: 'auto',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <DialogHeader className="flex-shrink-0 pb-4 border-b px-6 pt-6">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl font-bold">Promo Uplift Analytics</DialogTitle>
              <DialogDescription>
                Comparative analysis of promotional sales vs baseline performance.
              </DialogDescription>
            </div>
            <Button 
                variant="outline" 
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
            >
              {isExporting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
              Export Data
            </Button>
          </div>
        </DialogHeader>

        <div 
          className="flex-1 min-h-0 px-6" 
          style={{ 
            height: 'calc(90vh - 180px)', 
            maxHeight: 'calc(90vh - 180px)', 
            minHeight: '400px',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <ScrollArea 
            className="h-full w-full" 
            style={{ 
              height: '100%',
              width: '100%'
            }}
          >
            <div className="space-y-4 pr-4 py-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>Last 30 Days</span>
                </Button>
                <Select value={breakdown} onValueChange={handleBreakdownChange}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Breakdown by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="campaign">By Campaign</SelectItem>
                    <SelectItem value="category">By Category</SelectItem>
                    <SelectItem value="region">By Region</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="h-[350px] w-full border rounded-lg p-4 bg-white">
                {loading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#7C3AED]" />
                  </div>
                ) : upliftData.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center text-gray-400">
                    No performance data available.
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                      data={upliftData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Line type="monotone" dataKey="baseline" name="Baseline Sales" stroke="#9CA3AF" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="uplift" name="Promo Sales" stroke="#10B981" strokeWidth={2} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="text-xs text-green-700 font-medium uppercase">Total Uplift</div>
                  <div className="text-2xl font-bold text-green-700">
                    {summaryMetrics ? `+${summaryMetrics.totalUplift}%` : '—'}
                  </div>
                  <div className="text-xs text-green-600">vs. last period</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-xs text-gray-500 font-medium uppercase">Avg. Discount</div>
                  <div className="text-2xl font-bold text-gray-700">
                    {summaryMetrics ? `${summaryMetrics.avgDiscount}%` : '—'}
                  </div>
                  <div className="text-xs text-gray-500">Stable</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="text-xs text-purple-700 font-medium uppercase">ROI</div>
                  <div className="text-2xl font-bold text-purple-700">
                    {summaryMetrics ? `${summaryMetrics.roi}x` : '—'}
                  </div>
                  <div className="text-xs text-purple-600">High Performance</div>
                </div>
              </div>

              {onOpenPricingChanges && (
                <div className="pt-4 border-t border-gray-200 pb-4">
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => {
                      onClose();
                      onOpenPricingChanges();
                    }}
                  >
                    <Tag size={16} />
                    View Pricing Changes
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
