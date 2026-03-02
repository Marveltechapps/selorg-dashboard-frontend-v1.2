import React from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart 
} from 'recharts';
import { RiderPerformancePoint } from './analyticsApi';
import { format } from 'date-fns';

interface Props {
  data: RiderPerformancePoint[];
  loading?: boolean;
}

export function RiderPerformanceCharts({ data, loading }: Props) {
  if (loading) return <div className="h-[400px] w-full bg-gray-50 animate-pulse rounded-lg"></div>;
  if (!data || data.length === 0) return <div className="text-center p-10 text-gray-500">No data available</div>;

  const totalDeliveries = data.reduce((acc, curr) => acc + curr.deliveriesCompleted, 0);
  const avgRating = (data.reduce((acc, curr) => acc + curr.averageRating, 0) / data.length).toFixed(1);
  const avgAttendance = Math.round(data.reduce((acc, curr) => acc + curr.attendancePercent, 0) / data.length);

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">Total Deliveries</p>
          <p className="text-2xl font-bold text-gray-900">{totalDeliveries.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">Avg Rider Rating</p>
          <p className="text-2xl font-bold text-gray-900">{avgRating} / 5.0</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">Avg Attendance</p>
          <p className="text-2xl font-bold text-gray-900">{avgAttendance}%</p>
        </div>
      </div>

      {/* Main Chart: Deliveries vs Active Riders */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h3 className="text-lg font-semibold mb-6">Deliveries vs Active Riders</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(val) => format(new Date(val), 'MMM dd')} 
                tick={{ fontSize: 12 }}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip 
                labelFormatter={(val) => format(new Date(val), 'MMM dd, yyyy')}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="deliveriesCompleted" name="Deliveries" fill="#F97316" radius={[4, 4, 0, 0]} barSize={20} />
              <Line yAxisId="right" type="monotone" dataKey="activeRiders" name="Active Riders" stroke="#212121" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Rating Trend</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="timestamp" tickFormatter={(val) => format(new Date(val), 'dd/MM')} tick={{ fontSize: 10 }} />
                <YAxis domain={[4, 5]} tick={{ fontSize: 10 }} />
                <Tooltip labelFormatter={(val) => format(new Date(val), 'MMM dd')} />
                <Line type="step" dataKey="averageRating" stroke="#F59E0B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Attendance %</h3>
          <div className="h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="timestamp" tickFormatter={(val) => format(new Date(val), 'dd/MM')} tick={{ fontSize: 10 }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 10 }} />
                <Tooltip labelFormatter={(val) => format(new Date(val), 'MMM dd')} />
                <Area type="monotone" dataKey="attendancePercent" stroke="#10B981" fill="#D1FAE5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
