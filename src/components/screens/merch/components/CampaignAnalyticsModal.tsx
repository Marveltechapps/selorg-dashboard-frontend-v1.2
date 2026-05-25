import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowUpRight, Users, ShoppingCart, IndianRupee, Loader2 } from 'lucide-react';
import { analyticsApi, type CampaignAnalyticsDetail } from '../analytics/analyticsApi';

interface CampaignAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName?: string;
  campaignId?: string;
  dateRange?: string;
}

export function CampaignAnalyticsModal({
  isOpen,
  onClose,
  campaignName = 'Campaign',
  campaignId,
  dateRange = '30days',
}: CampaignAnalyticsModalProps) {
  const [range, setRange] = useState(dateRange);
  const [detail, setDetail] = useState<CampaignAnalyticsDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const entityKey = campaignId || campaignName;
    if (!entityKey) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await analyticsApi.getCampaignDetail(entityKey, range);
        if (mounted) setDetail(data);
      } catch {
        if (mounted) setDetail(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isOpen, campaignId, campaignName, range]);

  const chartData = detail?.series ?? [];
  const kpis = detail?.kpis;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl font-bold">
                {detail?.campaignName ?? campaignName} Analytics
              </DialogTitle>
              <DialogDescription>Performance metrics and redemption analysis.</DialogDescription>
            </div>
            <div className="flex gap-2">
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="total">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-gray-500 mt-2">Loading campaign details…</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 my-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1 text-xs uppercase font-bold">
                  <IndianRupee size={14} /> Revenue
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  ₹{((kpis?.revenue ?? 0) / 1000).toFixed(1)}k
                </div>
                <div className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUpRight size={12} className="mr-1" /> +{kpis?.uplift ?? 0}% uplift
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1 text-xs uppercase font-bold">
                  <ShoppingCart size={14} /> Orders
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {(kpis?.orders ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1 text-xs uppercase font-bold">
                  <Users size={14} /> Redemption Rate
                </div>
                <div className="text-2xl font-bold text-gray-900">{kpis?.redemptionRate ?? 0}%</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-gray-500 mb-1 text-xs uppercase font-bold">ROI</div>
                <div className="text-2xl font-bold text-gray-900">{kpis?.roi ?? 0}x</div>
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.length > 0 ? chartData : [{ day: '-', sales: 0, redemptions: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sales" fill="#3b82f6" name="Sales (₹)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="redemptions" fill="#10b981" name="Redemptions" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
