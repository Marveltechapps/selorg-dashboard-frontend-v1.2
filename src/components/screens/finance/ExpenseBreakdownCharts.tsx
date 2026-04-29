import React, { useMemo } from 'react';
import { 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { ExpenseBreakdownPoint } from './financeAnalyticsApi';
import { Skeleton } from "../../ui/skeleton";

interface Props {
  data: ExpenseBreakdownPoint[];
  isLoading: boolean;
}

export function ExpenseBreakdownCharts({ data, isLoading }: Props) {
  if (isLoading) return <Skeleton className="w-full h-[400px] rounded-xl" />;
  if (data.length === 0) return <div className="p-10 text-center text-gray-500">No data available</div>;

  // 1. Prepare data for Stacked Bar (History)
  // Need to flatten categories into keys
  const historyData = useMemo(() => {
      return data.map(point => {
          const flat: any = { date: point.date };
          point.categories.forEach(cat => {
              flat[cat.name] = cat.amount;
              flat[`${cat.name}_color`] = cat.color;
          });
          return flat;
      });
  }, [data]);

  // 2. Prepare data for Pie Chart (Aggregation)
  const pieData = useMemo(() => {
      const agg: Record<string, { amount: number, color: string }> = {};
      data.forEach(point => {
          point.categories.forEach(cat => {
              if (!agg[cat.name]) {
                  agg[cat.name] = { amount: 0, color: cat.color || '#000' };
              }
              agg[cat.name].amount += cat.amount;
          });
      });
      return Object.entries(agg).map(([name, val]) => ({ name, value: val.amount, color: val.color }));
  }, [data]);

  const totalExpense = pieData.reduce((sum, item) => sum + item.value, 0);
  const topCategory = [...pieData].sort((a,b) => b.value - a.value)[0];
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

  // Get unique category keys for bars
  const categoryKeys = data[0]?.categories.map(c => ({ name: c.name, color: c.color })) || [];

  return (
    <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-sm text-gray-500">Total Expenses (Selected Period)</p>
                <h3 className="text-lg md:text-2xl font-bold text-[#212121] break-words">
                    {formatCurrency(totalExpense)}
                </h3>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-sm text-gray-500">Top Spending Category</p>
                <h3 className="text-2xl font-bold text-gray-800 truncate" title={topCategory?.name}>
                    {topCategory?.name || '-'}
                </h3>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-sm text-gray-500">% of Total ({topCategory?.name})</p>
                <h3 className="text-lg md:text-2xl font-bold text-purple-600 break-words">
                    {totalExpense ? ((topCategory?.value / totalExpense) * 100).toFixed(1) : 0}%
                </h3>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pie Chart */}
            <div className="bg-white p-4 md:p-6 rounded-xl border border-[#E0E0E0] shadow-sm min-h-[360px]">
                <h4 className="font-bold text-gray-800 mb-6">Expense Distribution</h4>
                <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => formatCurrency(val)} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pieData.map((entry) => (
                    <span key={entry.name} className="inline-flex items-center gap-2 text-xs text-gray-600 max-w-full">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="truncate max-w-[180px]" title={entry.name}>{entry.name}</span>
                    </span>
                  ))}
                </div>
            </div>

            {/* Stacked Bar Chart */}
            <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-xl border border-[#E0E0E0] shadow-sm min-h-[360px]">
                <h4 className="font-bold text-gray-800 mb-6">Expense Trends</h4>
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={historyData} margin={{ top: 20, right: 8, bottom: 20, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#757575', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#757575', fontSize: 12 }} tickFormatter={(val) => `₹${val/1000}k`} />
                        <Tooltip 
                            cursor={{ fill: '#F3F4F6' }}
                            formatter={(value: any, name: string) => [formatCurrency(Number(value || 0)), name]}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        {categoryKeys.map((cat) => (
                            <Bar 
                                key={cat.name} 
                                dataKey={cat.name} 
                                stackId="a" 
                                fill={cat.color} 
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
}
