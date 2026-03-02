import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowUpRight, Users, ShoppingCart, IndianRupee } from 'lucide-react';

interface CampaignAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName?: string;
}

const data = [
  { day: 'Mon', sales: 4000, redemptions: 240 },
  { day: 'Tue', sales: 3000, redemptions: 139 },
  { day: 'Wed', sales: 2000, redemptions: 98 },
  { day: 'Thu', sales: 2780, redemptions: 390 },
  { day: 'Fri', sales: 1890, redemptions: 480 },
  { day: 'Sat', sales: 2390, redemptions: 380 },
  { day: 'Sun', sales: 3490, redemptions: 430 },
];

export function CampaignAnalyticsModal({ isOpen, onClose, campaignName = "Summer Essentials" }: CampaignAnalyticsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <div className="flex justify-between items-start">
             <div>
                <DialogTitle className="text-xl font-bold">{campaignName} Analytics</DialogTitle>
                <DialogDescription>Performance metrics and redemption analysis.</DialogDescription>
             </div>
             <div className="flex gap-2">
                <Select defaultValue="last-7">
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="last-7">Last 7 Days</SelectItem>
                        <SelectItem value="total">Total Duration</SelectItem>
                    </SelectContent>
                </Select>
             </div>
          </div>
        </DialogHeader>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 my-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1 text-xs uppercase font-bold">
                    <IndianRupee size={14} /> Revenue
                </div>
                <div className="text-2xl font-bold text-gray-900">₹124.5k</div>
                <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <ArrowUpRight size={12} /> +12% vs target
                </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1 text-xs uppercase font-bold">
                    <ArrowUpRight size={14} /> Uplift
                </div>
                <div className="text-2xl font-bold text-gray-900">+18.5%</div>
                <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <ArrowUpRight size={12} /> 4.2% vs baseline
                </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1 text-xs uppercase font-bold">
                    <Users size={14} /> Redemptions
                </div>
                <div className="text-2xl font-bold text-gray-900">842</div>
                <div className="text-xs text-gray-500 mt-1">
                    24% conversion rate
                </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1 text-xs uppercase font-bold">
                    <ShoppingCart size={14} /> Basket Size
                </div>
                <div className="text-2xl font-bold text-gray-900">₹48.20</div>
                <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <ArrowUpRight size={12} /> +₹5.50 vs avg
                </div>
            </div>
        </div>

        {/* Chart */}
        <div className="h-[300px] border rounded-xl p-4 bg-white">
            <h4 className="text-sm font-bold text-gray-700 mb-4">Daily Sales & Redemptions</h4>
            <ResponsiveContainer width="100%" height="90%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                    <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="sales" name="Sales Volume ($)" fill="#7C3AED" radius={[4, 4, 0, 0]} barSize={32} />
                    <Bar yAxisId="right" dataKey="redemptions" name="Redemptions" fill="#10B981" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
