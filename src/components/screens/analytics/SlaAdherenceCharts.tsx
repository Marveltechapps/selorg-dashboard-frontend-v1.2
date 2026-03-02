import React from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { SlaAdherencePoint } from './analyticsApi';
import { format } from 'date-fns';

interface Props {
  data: SlaAdherencePoint[];
  loading?: boolean;
}

export function SlaAdherenceCharts({ data, loading }: Props) {
  if (loading) return <div className="h-[400px] w-full bg-gray-50 animate-pulse rounded-lg"></div>;
  if (!data || data.length === 0) return <div className="text-center p-10 text-gray-500">No data available</div>;

  const avgOnTime = (data.reduce((acc, curr) => acc + curr.onTimePercent, 0) / data.length).toFixed(1);
  const totalBreaches = data.reduce((acc, curr) => acc + curr.slaBreaches, 0);
  
  // Prepare data for stacked bar of breach reasons (aggregated for simplicity or per day)
  // Let's do a per-day stacked bar for breach reasons
  const breachData = data.map(d => ({
    timestamp: d.timestamp,
    ...d.breachReasonBreakdown
  }));

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">Avg On-Time %</p>
          <p className={`text-2xl font-bold ${parseFloat(avgOnTime) >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
            {avgOnTime}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">Total Breaches</p>
          <p className="text-2xl font-bold text-red-600">{totalBreaches}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
           <p className="text-sm text-gray-500">Avg Delay</p>
           <p className="text-2xl font-bold text-gray-900">4.2 min</p>
        </div>
      </div>

      {/* Main Chart: On-Time % Trend */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h3 className="text-lg font-semibold mb-6">SLA Adherence Trend (Target: 95%)</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(val) => format(new Date(val), 'MMM dd')} 
                tick={{ fontSize: 12 }}
              />
              <YAxis domain={[80, 100]} tick={{ fontSize: 12 }} />
              <ReferenceLine y={95} stroke="red" strokeDasharray="3 3" label={{ value: 'Target', position: 'right', fill: 'red', fontSize: 10 }} />
              <Tooltip 
                labelFormatter={(val) => format(new Date(val), 'MMM dd, yyyy')}
                formatter={(val: number) => [`${val.toFixed(1)}%`, "On-Time"]}
              />
              <Line type="monotone" dataKey="onTimePercent" stroke="#2563EB" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary: Breach Reasons */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h3 className="text-lg font-semibold mb-6">Breach Reasons Breakdown</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breachData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(val) => format(new Date(val), 'dd/MM')} 
                tick={{ fontSize: 10 }}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={(val) => format(new Date(val), 'MMM dd')} />
              <Legend />
              <Bar dataKey="traffic" name="Traffic" stackId="a" fill="#FCA5A5" />
              <Bar dataKey="no_show" name="Rider No-Show" stackId="a" fill="#FDBA74" />
              <Bar dataKey="address_issue" name="Address Issue" stackId="a" fill="#E5E7EB" />
              <Bar dataKey="other" name="Other" stackId="a" fill="#9CA3AF" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
