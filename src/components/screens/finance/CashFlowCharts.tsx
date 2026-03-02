import React from 'react';
import { 
    ResponsiveContainer, 
    AreaChart,
    Area,
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend,
    ComposedChart
} from 'recharts';
import { CashFlowPoint } from './financeAnalyticsApi';
import { Skeleton } from "../../ui/skeleton";
import { ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  data: CashFlowPoint[];
  isLoading: boolean;
}

export function CashFlowCharts({ data, isLoading }: Props) {
  if (isLoading) return <Skeleton className="w-full h-[400px] rounded-xl" />;
  if (data.length === 0) return <div className="p-10 text-center text-gray-500">No data available</div>;

  const current = data[data.length - 1];
  const burnRate = data.reduce((acc, curr) => acc + curr.outflow, 0) / data.length;

  return (
    <div className="space-y-6">
         {/* KPIs */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-sm text-gray-500">Current Cash Runway</p>
                <h3 className="text-2xl font-bold text-gray-800">
                    N/A
                </h3>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-sm text-gray-500">Avg Monthly Burn</p>
                <h3 className="text-2xl font-bold text-red-600">
                    ₹{Math.round(burnRate).toLocaleString()}
                </h3>
            </div>
             <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-sm text-gray-500">Net Flow (Last Month)</p>
                <h3 className={`text-2xl font-bold flex items-center gap-2 ${current.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{Math.abs(current.net).toLocaleString()}
                    {current.net >= 0 ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                </h3>
            </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm h-[500px]">
            <h4 className="font-bold text-gray-800 mb-6">Cash Inflow vs Outflow</h4>
            <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <defs>
                        <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#757575', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#757575', fontSize: 12 }} tickFormatter={(val) => `₹${val/1000}k`} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: any, name: string) => [`₹${value.toLocaleString()}`, name]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    
                    <Area type="monotone" dataKey="inflow" name="Inflow" stroke="#10B981" fillOpacity={1} fill="url(#colorInflow)" strokeWidth={2} />
                    <Area type="monotone" dataKey="outflow" name="Outflow" stroke="#EF4444" fillOpacity={1} fill="url(#colorOutflow)" strokeWidth={2} />
                    
                    <Line type="monotone" dataKey="net" name="Net Cash Flow" stroke="#212121" strokeWidth={2} dot={{ r: 4, fill: '#212121' }} />
                    <Line type="monotone" dataKey="projected" name="Projected Net" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
}
