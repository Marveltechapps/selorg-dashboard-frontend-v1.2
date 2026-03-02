import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, TrendingUp, PieChart, Download, Calendar, RefreshCw 
} from 'lucide-react';
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
  const [activeMetric, setActiveMetric] = useState<MetricType | null>(null);
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

    if (activeMetric && autoRefreshEnabled) {
      refreshIntervalRef.current = setInterval(() => {
        if (isMountedRef.current && activeMetric) {
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
    if (activeMetric) {
      loadData(activeMetric, false);
    }
  }, [activeMetric, granularity, dateRange]);

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
    if (activeMetric) {
      loadData(activeMetric, false);
    }
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
           {activeMetric && (
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
           )}
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

      {/* Chart Panel */}
      <div className="min-h-[500px] transition-all">
        {!activeMetric ? (
           <div className="bg-white border border-[#E0E0E0] rounded-xl border-dashed p-12 flex flex-col items-center justify-center text-[#9E9E9E] min-h-[400px]">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                 <BarChart3 size={32} className="opacity-20 text-gray-900" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Select a metric above</h3>
              <p>Click on a card to view detailed analytics and charts.</p>
           </div>
        ) : (
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
        )}
      </div>

      <ExportReportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}
