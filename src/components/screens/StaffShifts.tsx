import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Clock, Zap, Calendar, UserCheck, AlertCircle, 
  Search, Filter, ChevronRight, BarChart2, Briefcase, 
  TrendingUp, AlertTriangle, Star, Shield, MapPin, RefreshCw, History
} from 'lucide-react';
import { cn } from "../../lib/utils";
import { PageHeader } from '../ui/page-header';
import { EmptyState, LoadingState, FilterChip, InlineNotification } from '../ui/ux-components';
import { ActionHistoryViewer } from '../ui/action-history-viewer';
import { toast } from 'sonner';
import * as staffApi from '../../api/staff-shifts/staff.api';
import { useAuth } from '../../contexts/AuthContext';

function getCurrentWeekNumber() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function StaffShifts() {
  const [activeTab, setActiveTab] = useState<'roster' | 'planner' | 'performance'>('roster');
  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { activeStoreId } = useAuth();
  const STORE_ID = activeStoreId || '';
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<any>(null);

  useEffect(() => {
    isMountedRef.current = true;
    loadSummary(false);
    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadSummary(true);
      }
    }, 20000);
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [STORE_ID]);

  const loadSummary = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoadingSummary(true);
      }
      const response = await staffApi.getStaffSummary({ storeId: STORE_ID });
      if (isMountedRef.current) {
        if (response.success) {
          setSummary(response.summary);
        }
        setLastRefresh(new Date());
        if (!silent) {
          toast.success("Summary refreshed", { duration: 2000 });
        }
      }
    } catch (error: any) {
      console.error('Failed to load staff summary:', error);
      if (isMountedRef.current && !silent) {
        toast.error("Failed to load summary", {
          description: error.message || "Please check your connection",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingSummary(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        title="Staff & Shift Management"
        subtitle="Manage roster, plan shifts, and track team performance metrics."
        actions={
          <div className="flex gap-4 items-center">
            <div className="bg-white px-4 py-2 rounded-lg border border-[#E0E0E0] shadow-sm flex items-center gap-3">
              <div className="p-2 bg-[#E6F7FF] text-[#1677FF] rounded-lg">
                <UserCheck size={20} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[#757575]">Active Staff</div>
                <div className="font-bold text-[#212121]">
                  {loadingSummary ? '...' : summary ? `${summary.active_staff} Online` : '24 Online'}
                </div>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-[#E0E0E0] shadow-sm flex items-center gap-3">
              <div className="p-2 bg-[#FFF7E6] text-[#D46B08] rounded-lg">
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[#757575]">Absences</div>
                <div className="font-bold text-[#212121]">
                  {loadingSummary ? '...' : summary ? `${summary.absences_today} Today` : '2 Today'}
                </div>
              </div>
            </div>
            <button
              onClick={() => loadSummary(false)}
              disabled={loadingSummary}
              className="p-2 hover:bg-gray-100 rounded-lg border border-[#E0E0E0] disabled:opacity-50"
              title="Refresh summary"
            >
              <RefreshCw size={16} className={cn(loadingSummary && "animate-spin")} />
            </button>
            {lastRefresh && (
              <span className="text-xs text-[#757575] hidden sm:inline">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        }
      />

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-[#E0E0E0] mb-6 overflow-x-auto">
        <TabButton id="roster" label="Staff Roster" icon={Users} active={activeTab} onClick={setActiveTab} />
        <TabButton id="planner" label="Shift Planner" icon={Calendar} active={activeTab} onClick={setActiveTab} />
        <TabButton id="performance" label="Performance & KPIs" icon={TrendingUp} active={activeTab} onClick={setActiveTab} />
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {activeTab === 'roster' && <RosterTab />}
        {activeTab === 'planner' && <ShiftPlannerTab onActionSuccess={() => loadSummary(true)} />}
        {activeTab === 'performance' && <PerformanceTab />}
      </div>
    </div>
  );
}

function TabButton({ id, label, icon: Icon, active, onClick }: any) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        "flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
        active === id 
          ? "border-[#1677FF] text-[#1677FF] bg-[#F0F7FF]" 
          : "border-transparent text-[#616161] hover:text-[#212121] hover:bg-[#F5F5F5]"
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

// --- Roster Tab ---

function RosterTab() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { activeStoreId } = useAuth();
  const STORE_ID = activeStoreId || '';
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<any>(null);

  useEffect(() => {
    isMountedRef.current = true;
    loadRoster(false);
    
    // Auto-refresh roster every 15 seconds
    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadRoster(true); // Silent refresh
      }
    }, 15000);
    
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [roleFilter, statusFilter, STORE_ID]);

  const loadRoster = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const params: any = { storeId: STORE_ID };
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      
      const response = await staffApi.getStaffRoster(params);
      if (isMountedRef.current) {
        if (response.success) {
          setStaffList(response.staff || []);
        }
      }
    } catch (error: any) {
      console.error('Failed to load staff roster:', error);
      if (isMountedRef.current && !silent) {
        toast.error("Failed to load roster", {
          description: error.message || "Please check your connection",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const filteredStaff = staffList.filter(staff => {
    const query = (searchQuery || '').toLowerCase();
    const matchSearch = !query || (staff.name?.toLowerCase().includes(query) || staff.staff_id?.toLowerCase().includes(query));
    const matchRole = roleFilter === 'all' || (staff.role || '').toLowerCase() === roleFilter.toLowerCase();
    const matchStatus = statusFilter === 'all' || (staff.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="space-y-6">
       <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
             <input 
               type="text" 
               placeholder="Search Staff Name or ID..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && loadRoster()}
               className="w-full pl-9 pr-4 py-2 text-sm border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1677FF]" 
             />
          </div>
          <div className="flex gap-2">
             <select 
               value={roleFilter}
               onChange={(e) => setRoleFilter(e.target.value)}
               className="px-3 py-2 text-sm border border-[#E0E0E0] rounded-lg bg-[#F9FAFB] font-medium text-[#616161]"
             >
                <option value="all">All Roles</option>
                <option value="Picker">Pickers</option>
                <option value="Packer">Packers</option>
                <option value="Loader">Loaders</option>
                <option value="Supervisor">Supervisors</option>
             </select>
             <select 
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
               className="px-3 py-2 text-sm border border-[#E0E0E0] rounded-lg bg-[#F9FAFB] font-medium text-[#616161]"
             >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Break">Break</option>
                <option value="Offline">Offline</option>
             </select>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
             <div className="col-span-full flex items-center justify-center h-64">
                <LoadingState message="Loading staff roster..." />
             </div>
          ) : filteredStaff.length === 0 ? (
             <div className="col-span-full flex items-center justify-center h-64">
                <EmptyState message="No staff found" />
             </div>
          ) : (
             filteredStaff.map((person: any, i: number) => (
             <div key={i} className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className={cn(
                   "absolute top-0 left-0 w-1 h-full",
                   person.status === 'Active' ? "bg-[#22C55E]" : 
                   person.status === 'Break' ? "bg-[#F59E0B]" : 
                   person.status === 'Meeting' ? "bg-[#9333EA]" : "bg-[#9E9E9E]"
                )} />
                
                <div className="pl-3">
                   <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-[#F5F5F5] rounded-full flex items-center justify-center text-[#616161] font-bold">
                            {person.name.charAt(0)}
                         </div>
                         <div>
                            <div className="font-bold text-[#212121]">{person.name}</div>
                            <div className="text-xs text-[#757575]">{person.role} • {person.staff_id}</div>
                         </div>
                      </div>
                      <span className={cn(
                         "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                         person.status === 'Active' ? "bg-[#DCFCE7] text-[#16A34A]" : 
                         person.status === 'Break' ? "bg-[#FEF3C7] text-[#D97706]" : 
                         person.status === 'Meeting' ? "bg-[#F3E8FF] text-[#9333EA]" : "bg-[#F5F5F5] text-[#757575]"
                      )}>
                         {person.status}
                      </span>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                      <div className="bg-[#FAFAFA] p-2 rounded border border-[#E0E0E0]">
                         <div className="text-[#9E9E9E] font-bold uppercase text-[10px]">Current Shift</div>
                         <div className="text-[#212121] font-medium">{person.current_shift || 'N/A'}</div>
                      </div>
                      <div className="bg-[#FAFAFA] p-2 rounded border border-[#E0E0E0]">
                         <div className="text-[#9E9E9E] font-bold uppercase text-[10px]">Zone / Station</div>
                         <div className="text-[#212121] font-medium">{person.zone || 'N/A'}</div>
                      </div>
                   </div>

                   {person.status === 'Active' && person.current_task && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-[#1677FF] font-medium bg-[#E6F7FF] p-2 rounded">
                         <Briefcase size={12} />
                         Working on: {person.current_task}
                      </div>
                   )}
                </div>
             </div>
             ))
          )}
       </div>
    </div>
  );
}

// --- Shift Planner Tab ---

function ShiftPlannerTab({ onActionSuccess }: { onActionSuccess?: () => void }) {
  const [coverage, setCoverage] = useState<any>(null);
  const [absences, setAbsences] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCoverageHistory, setShowCoverageHistory] = useState(false);
  const [showAbsenceHistory, setShowAbsenceHistory] = useState(false);
  const [showRosterHistory, setShowRosterHistory] = useState(false);
  const [week, setWeek] = useState(getCurrentWeekNumber());
  const { activeStoreId } = useAuth();
  const STORE_ID = activeStoreId || '';
  const [year, setYear] = useState(new Date().getFullYear());
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<any>(null);

  useEffect(() => {
    isMountedRef.current = true;
    loadData(false);
    
    // Auto-refresh shift planner data every 20 seconds
    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadData(true); // Silent refresh
      }
    }, 20000);
    
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [week, year, STORE_ID]);

  const loadData = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const [coverageRes, absencesRes, rosterRes] = await Promise.all([
        staffApi.getShiftCoverage({ storeId: STORE_ID }),
        staffApi.getAbsences({ storeId: STORE_ID }),
        staffApi.getWeeklyRoster({ storeId: STORE_ID, week, year })
      ]);
      
      if (isMountedRef.current) {
        if (coverageRes.success) {
          setCoverage(coverageRes);
        }
        if (absencesRes.success) {
          setAbsences(absencesRes.absences || []);
        }
        if (rosterRes.success) {
          setRoster(rosterRes.roster || []);
        }
      }
    } catch (error: any) {
      console.error('Failed to load shift planner data:', error);
      if (isMountedRef.current && !silent) {
        toast.error("Failed to load shift planner data", {
          description: error.message || "Please check your connection",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleAutoAssignOT = async () => {
    setActionLoading(true);
    
    try {
      const response = await staffApi.autoAssignOT({
        time_range: '18:00 - 20:00',
        required_staff: 4,
        roles: ['Picker'],
        storeId: STORE_ID
      });
      
      if (isMountedRef.current) {
        if (response.success) {
          toast.success(`${response.assigned_shifts} overtime shifts assigned successfully`);
          loadData(true);
          onActionSuccess?.();
        }
      }
    } catch (error: any) {
      console.error('Failed to assign OT shifts:', error);
      if (isMountedRef.current) {
        toast.error(error.message || 'Failed to assign OT shifts');
      }
    } finally {
      if (isMountedRef.current) {
        setActionLoading(false);
      }
    }
  };

  const handlePublishRoster = async () => {
    setActionLoading(true);
    
    try {
      const response = await staffApi.publishRoster({
        week,
        year,
        notes: 'Published via UI',
        storeId: STORE_ID
      });
      
      if (isMountedRef.current) {
        if (response.success) {
          toast.success('Roster published successfully');
          loadData(true);
          onActionSuccess?.();
        }
      }
    } catch (error: any) {
      console.error('Failed to publish roster:', error);
      if (isMountedRef.current) {
        toast.error(error.message || 'Failed to publish roster');
      }
    } finally {
      if (isMountedRef.current) {
        setActionLoading(false);
      }
    }
  };

  const handleLogAbsence = async () => {
    // Pick the first available staff from the roster who isn't already logged as absent today
    const currentAbsenceIds = absences.map(a => a.staff_id);
    const availableStaff = roster.find(r => !currentAbsenceIds.includes(r.staff_id));
    
    if (!availableStaff) {
      toast.error('No more staff members available to log absence for today.');
      return;
    }

    const staffId = availableStaff.staff_id;
    const reason = "Sick Leave"; // Default silent reason
    
    setActionLoading(true);
    try {
      const response = await staffApi.logAbsence({
        staff_id: staffId,
        reason: reason,
        type: 'Unplanned',
        date: new Date().toISOString(),
        storeId: STORE_ID
      });
      
      if (isMountedRef.current) {
        if (response.success) {
          toast.success(`Absence logged for ${availableStaff.name} silently`);
          loadData(true);
          onActionSuccess?.();
        }
      }
    } catch (error: any) {
      console.error('Failed to log absence:', error);
      if (isMountedRef.current) {
        toast.error(error.message || 'Failed to log absence');
      }
    } finally {
      if (isMountedRef.current) {
        setActionLoading(false);
      }
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[600px]">
       {/* Left: Planning Tools */}
       <div className="col-span-12 md:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#212121]">Daily Reinforcements</h3>
                <button 
                  onClick={() => setShowCoverageHistory(!showCoverageHistory)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    showCoverageHistory ? "bg-[#1677FF] text-white" : "text-[#757575] hover:bg-[#F5F5F5]"
                  )}
                  title="View History"
                >
                  <History size={16} />
                </button>
             </div>
             
             {showCoverageHistory ? (
                <div className="min-h-[200px]">
                   <ActionHistoryViewer module="staff" action="AUTO_ASSIGN_OT" limit={5} />
                </div>
             ) : (
                <>
                   {/* Peak Hour Alert */}
                   {coverage?.peak_hour_alert?.enabled && (
                      <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3 mb-4">
                         <div className="flex items-center gap-2 text-[#B91C1C] font-bold text-sm mb-1">
                            <TrendingUp size={16} /> Peak Hour Alert
                         </div>
                         <p className="text-xs text-[#7F1D1D] mb-2">{coverage.peak_hour_alert.message}</p>
                         <button 
                            onClick={handleAutoAssignOT}
                            disabled={actionLoading}
                            className="w-full py-1.5 bg-white border border-[#FECACA] text-[#B91C1C] text-xs font-bold rounded hover:bg-[#FFF7ED] disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                            {actionLoading ? 'Assigning...' : 'Auto-Assign OT Shifts'}
                         </button>
                      </div>
                   )}

                   <div className="space-y-3">
                      <div className="text-xs font-bold text-[#616161] uppercase">Shift Coverage (Today)</div>
                      {loading ? (
                         <LoadingState message="Loading coverage..." />
                      ) : coverage?.coverage ? (
                         coverage.coverage.map((s: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded bg-[#FAFAFA] border border-[#E0E0E0]">
                               <span className="text-sm text-[#212121] font-medium">{s.shift_label}</span>
                               <div className="flex items-center gap-2">
                                  <span className={cn(
                                     "text-xs font-bold",
                                     s.status === 'low' ? "text-[#EF4444]" : "text-[#22C55E]"
                                  )}>
                                     {s.current_staff}/{s.target_staff} Staff
                                  </span>
                                  {s.status === 'low' && <AlertCircle size={14} className="text-[#EF4444]" />}
                               </div>
                            </div>
                         ))
                      ) : (
                         <EmptyState message="No coverage data" />
                      )}
                   </div>
                </>
             )}
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm flex-1">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#212121]">Absence Tracker</h3>
                <button 
                  onClick={() => setShowAbsenceHistory(!showAbsenceHistory)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    showAbsenceHistory ? "bg-[#1677FF] text-white" : "text-[#757575] hover:bg-[#F5F5F5]"
                  )}
                  title="View History"
                >
                  <History size={16} />
                </button>
             </div>

             {showAbsenceHistory ? (
                <div className="min-h-[200px]">
                   <ActionHistoryViewer module="staff" action="LOG_ABSENCE" limit={5} />
                </div>
             ) : (
                <>
                   <div className="space-y-3">
                      {loading ? (
                         <LoadingState message="Loading absences..." />
                      ) : absences.length === 0 ? (
                         <EmptyState message="No absences" />
                      ) : (
                         absences.map((ab: any, i: number) => (
                            <div key={i} className="flex justify-between items-start p-3 bg-[#F9FAFB] rounded-lg border border-[#E0E0E0]">
                               <div>
                                  <div className="font-bold text-[#212121] text-sm">{ab.name}</div>
                                  <div className="text-xs text-[#757575]">{ab.role} • {ab.reason}</div>
                               </div>
                               <span className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                                  ab.type === 'Unplanned' ? "bg-[#FEE2E2] text-[#EF4444]" : "bg-[#E0F2FE] text-[#0284C7]"
                               )}>
                                  {ab.type}
                               </span>
                            </div>
                         ))
                      )}
                   </div>
                   <button 
                      onClick={handleLogAbsence}
                      disabled={actionLoading}
                      className="w-full mt-4 py-2 border border-[#E0E0E0] rounded-lg text-sm font-bold text-[#616161] hover:bg-[#F5F5F5] disabled:opacity-50"
                   >
                      {actionLoading ? 'Logging...' : '+ Log Absence'}
                   </button>
                </>
             )}
          </div>
       </div>

       {/* Right: Weekly Roster View */}
       <div className="col-span-12 md:col-span-8 bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
             <h3 className="font-bold text-[#212121]">Weekly Roster (Week {week})</h3>
             <div className="flex gap-2">
                <button 
                  onClick={() => setShowRosterHistory(!showRosterHistory)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    showRosterHistory ? "bg-[#1677FF] text-white" : "text-[#757575] hover:bg-[#F5F5F5]"
                  )}
                  title="View History"
                >
                  <History size={16} />
                </button>
                <button 
                   onClick={handlePublishRoster}
                   disabled={actionLoading}
                   className="px-3 py-1.5 bg-[#212121] text-white rounded text-xs font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   {actionLoading ? 'Publishing...' : 'Publish Roster'}
                </button>
             </div>
          </div>
          <div className="flex-1 overflow-auto">
             {showRosterHistory ? (
                <div className="p-4">
                   <ActionHistoryViewer module="staff" action="PUBLISH_ROSTER" limit={10} />
                </div>
             ) : loading ? (
                <div className="flex items-center justify-center h-full">
                   <LoadingState message="Loading roster..." />
                </div>
             ) : roster.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                   <EmptyState message="No roster data" />
                </div>
             ) : (
                <table className="w-full text-left text-sm border-collapse">
                   <thead className="bg-[#FAFAFA] text-[#757575]">
                      <tr>
                         <th className="p-3 font-medium border-b border-r border-[#E0E0E0] bg-[#F5F5F5] w-48 sticky left-0 z-10">Employee</th>
                         {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <th key={day} className="p-3 font-medium border-b border-[#E0E0E0] min-w-[100px] text-center">{day}</th>
                         ))}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-[#E0E0E0]">
                      {roster.map((row: any, i: number) => {
                         const shifts = [
                            row.shifts?.monday || 'O',
                            row.shifts?.tuesday || 'O',
                            row.shifts?.wednesday || 'O',
                            row.shifts?.thursday || 'O',
                            row.shifts?.friday || 'O',
                            row.shifts?.saturday || 'O',
                            row.shifts?.sunday || 'O'
                         ];
                         return (
                            <tr key={i}>
                               <td className="p-3 border-b border-r border-[#E0E0E0] bg-white sticky left-0 z-10">
                                  <div className="font-bold text-[#212121]">{row.name}</div>
                                  <div className="text-xs text-[#757575]">{row.role}</div>
                               </td>
                               {shifts.map((shift, j) => (
                                  <td key={j} className="p-3 border-b border-[#E0E0E0] text-center">
                                     <span className={cn(
                                        "px-2 py-1 rounded text-xs font-bold",
                                        shift === 'M' ? "bg-[#E0F2FE] text-[#0284C7]" :
                                        shift === 'A' ? "bg-[#FEF3C7] text-[#D97706]" :
                                        shift === 'N' ? "bg-[#F3E8FF] text-[#9333EA]" :
                                        "bg-[#F5F5F5] text-[#9E9E9E]"
                                     )}>
                                        {shift === 'M' ? 'M' : shift === 'A' ? 'A' : shift === 'N' ? 'N' : 'OFF'}
                                     </span>
                                  </td>
                               ))}
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             )}
          </div>
       </div>
    </div>
  );
}

// --- Performance Tab ---

function PerformanceTab() {
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMetricsHistory, setShowMetricsHistory] = useState(false);
  const [sortBy, setSortBy] = useState('productivity');
  const { activeStoreId } = useAuth();
  const STORE_ID = activeStoreId || '';
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    loadPerformance(false);
    
    // Auto-refresh performance data every 30 seconds
    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadPerformance(true); // Silent refresh
      }
    }, 30000);
    
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [sortBy, STORE_ID]);

  const loadPerformance = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await staffApi.getPerformance({ 
        storeId: STORE_ID, 
        period: 'week',
        sort_by: sortBy
      });
      if (isMountedRef.current) {
        if (response && (response.success || response.staff_performance)) {
          const data = response.staff_performance ? response : { ...response, staff_performance: response.metrics || [] };
          const sorted = data.staff_performance && Array.isArray(data.staff_performance)
            ? [...data.staff_performance].sort((a, b) => {
                if (sortBy === 'productivity') return (b.productivity || 0) - (a.productivity || 0);
                if (sortBy === 'accuracy') return (b.accuracy || 0) - (a.accuracy || 0);
                if (sortBy === 'attendance') return (b.attendance || 0) - (a.attendance || 0);
                if (sortBy === 'error_rate') return parseFloat(String(a.error_rate || '0').replace('%', '')) - parseFloat(String(b.error_rate || '0').replace('%', ''));
                if (sortBy === 'sla_impact') return parseFloat(String(a.sla_impact || '0').replace('%', '')) - parseFloat(String(b.sla_impact || '0').replace('%', ''));
                return 0;
              })
            : data.staff_performance;
          setPerformance({ ...data, staff_performance: sorted });
        }
      }
    } catch (error: any) {
      console.error('Failed to load performance data:', error);
      if (isMountedRef.current && !silent) {
        toast.error("Failed to load performance data", {
          description: error.message || "Please check your connection",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
       {loading ? (
          <div className="flex items-center justify-center h-32">
             <LoadingState message="Loading performance data..." />
          </div>
       ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
                <div className="text-xs font-bold text-[#757575] uppercase tracking-wider mb-1">Avg Productivity</div>
                <div className="text-2xl font-bold text-[#212121]">
                   {performance?.summary?.avg_productivity || '...'} 
                   <span className="text-sm font-medium text-[#757575]"> orders/hr</span>
                </div>
             </div>
             <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
                <div className="text-xs font-bold text-[#757575] uppercase tracking-wider mb-1">Team Error Rate</div>
                <div className="text-2xl font-bold text-[#22C55E]">
                   {performance?.summary?.team_error_rate ? `${performance.summary.team_error_rate}%` : '...'}
                </div>
             </div>
             <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
                <div className="text-xs font-bold text-[#757575] uppercase tracking-wider mb-1">SLA Breach Impact</div>
                <div className="text-2xl font-bold text-[#F59E0B]">
                   {performance?.summary?.sla_breach_impact || '...'}
                </div>
             </div>
             <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
                <div className="text-xs font-bold text-[#757575] uppercase tracking-wider mb-1">Incentives Paid</div>
                <div className="text-2xl font-bold text-[#1677FF]">
                   {performance?.summary?.incentives_paid ? `₹${performance.summary.incentives_paid.toLocaleString()}` : '...'}
                </div>
             </div>
          </div>
       )}

       <div className="grid grid-cols-12 gap-6 h-[500px]">
          {/* Leaderboard */}
          <div className="col-span-12 md:col-span-8 bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden">
             <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
                <h3 className="font-bold text-[#212121]">Staff Performance Metrics</h3>
                <div className="flex gap-4 items-center">
                   <button 
                     onClick={() => setShowMetricsHistory(!showMetricsHistory)}
                     className={cn(
                       "p-1.5 rounded-lg transition-colors",
                       showMetricsHistory ? "bg-[#1677FF] text-white" : "text-[#757575] hover:bg-[#F5F5F5]"
                     )}
                     title="View History"
                   >
                     <History size={16} />
                   </button>
                   <div className="flex gap-2 text-sm text-[#757575]">
                      <span>Sort by:</span>
                      <select 
                         value={sortBy}
                         onChange={(e) => setSortBy(e.target.value)}
                         className="font-bold text-[#212121] cursor-pointer border-none bg-transparent"
                      >
                         <option value="productivity">Productivity</option>
                         <option value="error_rate">Error Rate</option>
                         <option value="sla_impact">SLA Impact</option>
                      </select>
                   </div>
                </div>
             </div>
             <div className="flex-1 overflow-auto">
                {showMetricsHistory ? (
                   <div className="p-4">
                      <ActionHistoryViewer module="staff" limit={10} />
                   </div>
                ) : loading ? (
                   <div className="flex items-center justify-center h-full">
                      <LoadingState message="Loading performance metrics..." />
                   </div>
                ) : !performance?.staff_performance || performance.staff_performance.length === 0 ? (
                   <div className="flex items-center justify-center h-full">
                      <EmptyState message="No performance data" />
                   </div>
                ) : (
                   <table className="w-full text-left text-sm">
                      <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0]">
                         <tr>
                            <th className="px-4 py-3 font-medium">Rank</th>
                            <th className="px-4 py-3 font-medium">Employee</th>
                            <th className="px-4 py-3 font-medium">Role</th>
                            <th className="px-4 py-3 font-medium">Productivity</th>
                            <th className="px-4 py-3 font-medium">Error Rate</th>
                            <th className="px-4 py-3 font-medium">SLA Impact</th>
                            <th className="px-4 py-3 font-medium">Incentive</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F0F0]">
                         {performance.staff_performance.map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-[#F9FAFB]">
                               <td className="px-4 py-3 font-bold text-[#212121] w-12">#{row.rank || i + 1}</td>
                               <td className="px-4 py-3 font-medium text-[#212121]">{row.name}</td>
                               <td className="px-4 py-3 text-[#616161]">{row.role}</td>
                               <td className="px-4 py-3 font-bold">{row.productivity}</td>
                               <td className={cn("px-4 py-3 font-bold", parseFloat(row.error_rate?.replace('%', '') || '0') > 1 ? "text-[#EF4444]" : "text-[#22C55E]")}>
                                  {row.error_rate}
                               </td>
                               <td className="px-4 py-3 text-[#616161]">{row.sla_impact}</td>
                               <td className="px-4 py-3">
                                  <span className={cn(
                                     "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                     row.incentive_status === 'Eligible' ? "bg-[#DCFCE7] text-[#16A34A]" : 
                                     row.incentive_status === 'At Risk' ? "bg-[#FEF3C7] text-[#D97706]" : 
                                     "bg-[#F5F5F5] text-[#9E9E9E]"
                                  )}>
                                     {row.incentive_status || 'N/A'}
                                  </span>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                )}
             </div>
          </div>

          {/* Top Performer Card */}
          <div className="col-span-12 md:col-span-4 flex flex-col gap-6">
             {loading ? (
                <div className="bg-gradient-to-br from-[#212121] to-[#424242] p-6 rounded-xl shadow-lg text-white">
                   <LoadingState message="Loading employee of the week..." />
                </div>
             ) : performance?.employee_of_week ? (
                <div className="bg-gradient-to-br from-[#212121] to-[#424242] p-6 rounded-xl shadow-lg text-white">
                   <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-[#F59E0B] rounded-lg text-white">
                         <Star size={20} fill="currentColor" />
                      </div>
                      <div>
                         <h3 className="font-bold text-lg">Employee of the Week</h3>
                         <p className="text-white/60 text-xs uppercase font-bold tracking-wider">
                            Week {performance.employee_of_week.week || 42}
                         </p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-2xl font-bold">
                         {performance.employee_of_week.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'EOW'}
                      </div>
                      <div>
                         <div className="text-xl font-bold">{performance.employee_of_week.name}</div>
                         <div className="text-white/60 text-sm">{performance.employee_of_week.role}</div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/10 p-3 rounded-lg">
                         <div className="text-white/60 text-xs font-bold uppercase">Productivity</div>
                         <div className="text-2xl font-bold text-[#4ADE80]">{performance.employee_of_week.productivity}</div>
                      </div>
                      <div className="bg-white/10 p-3 rounded-lg">
                         <div className="text-white/60 text-xs font-bold uppercase">Accuracy</div>
                         <div className="text-2xl font-bold text-[#4ADE80]">{performance.employee_of_week.accuracy}</div>
                      </div>
                   </div>
                </div>
             ) : (
                <div className="bg-gradient-to-br from-[#212121] to-[#424242] p-6 rounded-xl shadow-lg text-white">
                   <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-[#F59E0B] rounded-lg text-white">
                         <Star size={20} fill="currentColor" />
                      </div>
                      <h3 className="font-bold text-lg">Employee of the Week</h3>
                   </div>
                   <EmptyState message="No data for this week" />
                </div>
             )}

             <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm flex-1">
                <h3 className="font-bold text-[#212121] mb-4">Incentive Criteria</h3>
                {loading ? (
                   <LoadingState message="Loading criteria..." />
                ) : !performance?.incentive_criteria || performance.incentive_criteria.length === 0 ? (
                   <EmptyState message="No incentive criteria" />
                ) : (
                   <ul className="space-y-3 text-sm">
                      {performance.incentive_criteria.map((item: any, i: number) => (
                         <li key={i} className="flex items-center justify-between py-2 px-3 hover:bg-[#F5F5F5] rounded">
                            <span className="text-[#616161]">{item.criterion}</span>
                            <span className="font-bold text-[#22C55E]">{item.reward}</span>
                         </li>
                      ))}
                   </ul>
                )}
             </div>
          </div>
       </div>
    </div>
  );
}