import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { FleetUtilizationPoint } from './analyticsApi';
import { format } from 'date-fns';

interface Props {
  data: FleetUtilizationPoint[];
  loading?: boolean;
}

export function FleetUtilizationCharts({ data, loading }: Props) {
  if (loading) return <div className="h-[400px] w-full bg-gray-50 animate-pulse rounded-lg"></div>;
  if (!data || data.length === 0) return <div className="text-center p-10 text-gray-500">No data available</div>;

  const avgUtilization = (data.reduce((acc, curr) => acc + (curr.activeVehicles / (curr.activeVehicles + curr.idleVehicles + curr.maintenanceVehicles)), 0) / data.length * 100).toFixed(1);
  const avgEvShare = (data.reduce((acc, curr) => acc + curr.evUtilizationPercent, 0) / data.length).toFixed(1);

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">Avg Utilization Rate</p>
          <p className="text-2xl font-bold text-gray-900">{avgUtilization}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">EV Fleet Usage</p>
          <p className="text-2xl font-bold text-green-600">{avgEvShare}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
           <p className="text-sm text-gray-500">Maintenance Ratio</p>
           <p className="text-2xl font-bold text-gray-900">5.2%</p>
        </div>
      </div>

      {/* Main Chart: Fleet Status Stacked Area */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h3 className="text-lg font-semibold mb-6">Fleet Status Overview</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(val) => format(new Date(val), 'MMM dd')} 
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip labelFormatter={(val) => format(new Date(val), 'MMM dd, yyyy')} />
              <Legend />
              <Area type="monotone" dataKey="activeVehicles" name="Active" stackId="1" stroke="#16A34A" fill="#86EFAC" />
              <Area type="monotone" dataKey="idleVehicles" name="Idle" stackId="1" stroke="#93C5FD" fill="#BFDBFE" />
              <Area type="monotone" dataKey="maintenanceVehicles" name="In Maintenance" stackId="1" stroke="#EF4444" fill="#FECACA" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary: Km per Vehicle */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h3 className="text-lg font-semibold mb-6">Avg Km / Vehicle</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(val) => format(new Date(val), 'dd/MM')} 
                tick={{ fontSize: 10 }}
              />
              <YAxis tick={{ fontSize: 10 }} unit="km" />
              <Tooltip labelFormatter={(val) => format(new Date(val), 'MMM dd')} />
              <Bar dataKey="avgKmPerVehicle" name="Km Traveled" fill="#4B5563" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
