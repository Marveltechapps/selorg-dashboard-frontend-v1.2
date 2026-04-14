import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, TrendingUp, PieChart, Download, Calendar, RefreshCw, Users
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchPickerWorkforceAnalytics, type PickerAnalyticsResponse } from '@/api/admin/pickerWorkforceAnalyticsApi';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  fetchRiderPerformance, 
  fetchSlaAdherence, 
  fetchFleetUtilization,
  RiderPerformancePoint,
  SlaAdherencePoint,
  FleetUtilizationPoint,
  Granularity 
} from '@/api/analytics/analyticsApi';
import { RiderPerformanceCharts } from './RiderPerformanceCharts';
import { SlaAdherenceCharts } from './SlaAdherenceCharts';
import { FleetUtilizationCharts } from './FleetUtilizationCharts';
import { ExportReportModal } from './ExportReportModal';
import { cn } from '@/lib/utils';

type MetricType = 'rider' | 'sla' | 'fleet';

interface AnalyticsReportsPageProps {
  searchQuery?: string;
}

export function AnalyticsReportsPage({ searchQuery = '' }: AnalyticsReportsPageProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>('rider');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [dateRange, setDateRange] = useState('7d');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Data States
  const [riderData, setRiderData] = useState<RiderPerformancePoint[]>([]);
  const [slaData, setSlaData] = useState<SlaAdherencePoint[]>([]);
  const [fleetData, setFleetData] = useState<FleetUtilizationPoint[]>([]);
  const [pickerAnalytics, setPickerAnalytics] = useState<PickerAnalyticsResponse | null>(null);
  const [pickerAnalyticsLoading, setPickerAnalyticsLoading] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Auto-refresh logic: Refresh every 30 seconds when metric is active
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    if (autoRefreshEnabled) {
      refreshIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          loadData(activeMetric, true); // silent refresh
        }
      }, 30000); // 30 seconds
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [activeMetric, autoRefreshEnabled, granularity, dateRange]);

  // Load data when metric, granularity, or dateRange changes
  useEffect(() => {
    loadData(activeMetric, false);
  }, [activeMetric, granularity, dateRange]);

  const loadPickerAnalytics = async () => {
    setPickerAnalyticsLoading(true);
    try {
      const period = dateRange === '30d' || dateRange === '90d' ? 'month' : 'week';
      const data = await fetchPickerWorkforceAnalytics({ period });
      if (isMountedRef.current) setPickerAnalytics(data);
    } catch (e: any) {
      if (isMountedRef.current) {
        toast.error('Picker analytics unavailable', { description: e?.message });
      }
    } finally {
      if (isMountedRef.current) setPickerAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    loadPickerAnalytics();
  }, [dateRange]);

  const loadData = async (metric: MetricType, silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
    }
    
    try {
      const options = { dateRange: dateRange as '7d' | '30d' | '90d' };
      
      if (metric === 'rider') {
        const data = await fetchRiderPerformance(granularity, options);
        if (isMountedRef.current) {
          setRiderData(data);
        }
      } else if (metric === 'sla') {
        const data = await fetchSlaAdherence(granularity, options);
        if (isMountedRef.current) {
          setSlaData(data);
        }
      } else if (metric === 'fleet') {
        const data = await fetchFleetUtilization(granularity, options);
        if (isMountedRef.current) {
          setFleetData(data);
        }
      }
      
      if (isMountedRef.current) {
        setLastRefresh(new Date());
        if (!silent) {
          toast.success("Data refreshed successfully", { duration: 2000 });
        }
      }
    } catch (error: any) {
      console.error('Failed to load analytics data:', error);
      if (isMountedRef.current && !silent) {
        toast.error("Failed to load analytics data", {
          description: error.message || "Please check your connection and try again",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleManualRefresh = () => {
    loadData(activeMetric, false);
  };

  const MetricCard = ({ 
    type, 
    title, 
    subtitle, 
    icon: Icon, 
    colorClass,
    bgClass 
  }: { 
    type: MetricType, 
    title: string, 
    subtitle: string, 
    icon: any, 
    colorClass: string,
    bgClass: string 
  }) => (
    <div 
      onClick={() => setActiveMetric(type)}
      className={cn(
        "bg-white p-6 rounded-xl border shadow-sm transition-all cursor-pointer group relative overflow-hidden",
        activeMetric === type ? "ring-2 ring-black border-transparent shadow-md" : "border-[#E0E0E0] hover:shadow-md hover:border-gray-300"
      )}
    >
      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110", bgClass, colorClass)}>
        <Icon size={24} />
      </div>
      <h3 className="font-bold text-[#212121] mb-2">{title}</h3>
      <p className="text-sm text-[#757575] mb-4">{subtitle}</p>
      <span className={cn("text-xs font-bold flex items-center gap-1", colorClass)}>
        {activeMetric === type ? "Viewing Details" : "View Details →"}
      </span>
      {activeMetric === type && (
        <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-full -mr-10 -mt-10 opacity-10 pointer-events-none", bgClass.replace('bg-', 'bg-current text-'))} />
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Analytics & Reports</h1>
          <p className="text-[#757575] text-sm">Performance metrics, fleet efficiency, and SLA reports</p>
        </div>
        <div className="flex gap-2 items-center">
           <>
             <Button 
               variant="outline" 
               onClick={handleManualRefresh} 
               disabled={loading}
               title="Refresh data"
             >
               <RefreshCw size={16} className={cn(loading && "animate-spin")} />
             </Button>
             {lastRefresh && (
               <span className="text-xs text-[#757575] hidden sm:inline">
                 Updated {lastRefresh.toLocaleTimeString()}
               </span>
             )}
           </>
           <Button onClick={() => setIsExportOpen(true)} className="bg-[#212121] hover:bg-black text-white">
             <Download size={16} className="mr-2" />
             Export Report
           </Button>
        </div>
      </div>

      {/* Metric Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          type="rider"
          title="Rider Performance"
          subtitle="Deliveries per hour, average rating, and attendance."
          icon={TrendingUp}
          colorClass="text-[#F97316]"
          bgClass="bg-orange-50"
        />
        <MetricCard 
          type="sla"
          title="SLA Adherence"
          subtitle="On-time delivery %, delay causes, and breach analysis."
          icon={BarChart3}
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
        />
        <MetricCard 
          type="fleet"
          title="Fleet Utilization"
          subtitle="Active vs idle time, fuel efficiency, and maintenance costs."
          icon={PieChart}
          colorClass="text-green-600"
          bgClass="bg-green-50"
        />
      </div>

      {/* Chart Panel — defaults to Rider Performance */}
      <div className="min-h-[500px] transition-all">
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Toolbar */}
             <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
                <div className="flex items-center gap-2 mb-4 sm:mb-0">
                   <Calendar size={16} className="text-gray-500" />
                   <span className="text-sm font-semibold text-gray-700">Analysis Period:</span>
                </div>
                <div className="flex gap-4 items-center">
                   <Select 
                     value={granularity} 
                     onValueChange={(v: any) => {
                       setGranularity(v);
                       // Data will auto-reload via useEffect
                     }}
                     disabled={loading}
                   >
                      <SelectTrigger className="w-[120px]">
                         <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="hour">Hourly</SelectItem>
                         <SelectItem value="day">Daily</SelectItem>
                         <SelectItem value="week">Weekly</SelectItem>
                      </SelectContent>
                   </Select>

                   <Select 
                     value={dateRange} 
                     onValueChange={(v) => {
                       setDateRange(v);
                       // Data will auto-reload via useEffect
                     }}
                     disabled={loading}
                   >
                      <SelectTrigger className="w-[150px]">
                         <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="7d">Last 7 Days</SelectItem>
                         <SelectItem value="30d">Last 30 Days</SelectItem>
                         <SelectItem value="90d">Last 3 Months</SelectItem>
                      </SelectContent>
                   </Select>
                   
                   {loading && (
                     <div className="flex items-center gap-2 text-sm text-[#757575]">
                       <RefreshCw size={14} className="animate-spin" />
                       <span>Loading...</span>
                     </div>
                   )}
                </div>
             </div>

             {/* Dynamic Content */}
             <div className="bg-transparent">
               {activeMetric === 'rider' && <RiderPerformanceCharts data={riderData} loading={loading} />}
               {activeMetric === 'sla' && <SlaAdherenceCharts data={slaData} loading={loading} />}
               {activeMetric === 'fleet' && <FleetUtilizationCharts data={fleetData} loading={loading} />}
             </div>
          </div>
      </div>

      {/* Picker workforce performance */}
      <div className="space-y-4 border-t border-[#E0E0E0] pt-8">
        <div className="flex items-center gap-2">
          <Users className="text-[#F97316]" size={22} />
          <div>
            <h2 className="text-lg font-bold text-[#212121]">Picker performance</h2>
            <p className="text-xs text-[#757575]">Workforce metrics from picker attendance and issues</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={loadPickerAnalytics} disabled={pickerAnalyticsLoading}>
            <RefreshCw size={14} className={cn(pickerAnalyticsLoading && 'animate-spin')} />
          </Button>
        </div>
        {pickerAnalytics && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Active pickers', value: pickerAnalytics.summary.totalActivePickers },
                { label: 'Avg picks / hr', value: pickerAnalytics.summary.avgPicksPerHour },
                { label: 'Avg accuracy %', value: pickerAnalytics.summary.avgAccuracy },
                { label: 'Attendance rate %', value: pickerAnalytics.summary.avgAttendanceRate },
              ].map((c) => (
                <div key={c.label} className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
                  <p className="text-xs text-[#757575] font-medium">{c.label}</p>
                  <p className="text-2xl font-bold text-[#212121] mt-1">{c.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
              <h3 className="text-sm font-semibold text-[#212121] mb-4">Daily picks (range)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pickerAnalytics.dailyTrend.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="totalPicks" fill="#F97316" radius={[4, 4, 0, 0]} name="Picks" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E0E0E0] font-semibold text-sm">Top performers</div>
                <table className="w-full text-sm">
                  <thead className="bg-[#fafafa] text-[#757575] text-left">
                    <tr>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Picks/hr</th>
                      <th className="px-4 py-2">Accuracy</th>
                      <th className="px-4 py-2">Shifts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickerAnalytics.topPerformers.map((p) => (
                      <tr key={p.pickerId} className="border-t border-[#f0f0f0]">
                        <td className="px-4 py-2 font-medium">{p.name}</td>
                        <td className="px-4 py-2">{p.picksPerHour}</td>
                        <td className="px-4 py-2">{p.accuracy}%</td>
                        <td className="px-4 py-2">{p.shiftsThisMonth}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E0E0E0] font-semibold text-sm">By location</div>
                <table className="w-full text-sm">
                  <thead className="bg-[#fafafa] text-[#757575] text-left">
                    <tr>
                      <th className="px-4 py-2">Location</th>
                      <th className="px-4 py-2">Active</th>
                      <th className="px-4 py-2">Avg picks/hr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickerAnalytics.locationBreakdown.map((l) => (
                      <tr key={l.locationId || l.locationName} className="border-t border-[#f0f0f0]">
                        <td className="px-4 py-2">{l.locationName}</td>
                        <td className="px-4 py-2">{l.activePickers}</td>
                        <td className="px-4 py-2">{l.avgPicksPerHour}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        {pickerAnalyticsLoading && !pickerAnalytics && (
          <div className="flex justify-center py-12 text-[#757575] text-sm">Loading picker metrics…</div>
        )}
      </div>

      <ExportReportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}
