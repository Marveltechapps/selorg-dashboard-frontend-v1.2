import React from 'react';
import { 
    ResponsiveContainer, 
    ComposedChart, 
    Line, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    Area
} from 'recharts';
import { RevenueGrowthPoint } from './financeAnalyticsApi';
import { Skeleton } from "../../ui/skeleton";
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Props {
  data: RevenueGrowthPoint[];
  isLoading: boolean;
}

export function RevenueGrowthCharts({ data, isLoading }: Props) {
  if (isLoading) return <Skeleton className="w-full h-[400px] rounded-xl" />;
  if (data.length === 0) return <div className="p-10 text-center text-gray-500">No data available</div>;

  const currentMonth = data[data.length - 1];
  const previousMonth = data[data.length - 2];
  
  const growth = ((currentMonth.totalRevenue - previousMonth.totalRevenue) / previousMonth.totalRevenue) * 100;
  const recurringShare = (currentMonth.recurringRevenue / currentMonth.totalRevenue) * 100;

  return (
    <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-sm text-gray-500">Current Monthly Revenue</p>
                <h3 className="text-2xl font-bold text-[#212121]">
                    ₹{currentMonth.totalRevenue.toLocaleString()}
                </h3>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-sm text-gray-500">MoM Growth</p>
                <h3 className={`text-2xl font-bold flex items-center gap-2 ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(growth).toFixed(1)}%
                    {growth >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                </h3>
            </div>
             <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-sm text-gray-500">Recurring Revenue Share</p>
                <h3 className="text-2xl font-bold text-blue-600">
                    {recurringShare.toFixed(1)}%
                </h3>
            </div>
        </div>

        {/* Main Chart */}
        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm h-[500px]">
            <h4 className="font-bold text-gray-800 mb-6">Revenue Composition & Churn</h4>
            <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#757575', fontSize: 12 }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#757575', fontSize: 12 }} tickFormatter={(val) => `₹${val/1000}k`} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#EF4444', fontSize: 12 }} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: any, name: string) => [`₹${value.toLocaleString()}`, name]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    
                    <Bar yAxisId="left" dataKey="recurringRevenue" name="Recurring Revenue" stackId="a" fill="#3B82F6" radius={[0, 0, 4, 4]} />
                    <Bar yAxisId="left" dataKey="newRevenue" name="New Revenue" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
                    
                    <Line yAxisId="right" type="monotone" dataKey="churnAmount" name="Churn" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
}
