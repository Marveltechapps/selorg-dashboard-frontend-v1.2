import React, { useState, useEffect, useCallback } from 'react';
import * as picklistsApi from '../../api/darkstore/picklists.api';
import { getAvailablePickers } from '../../api/darkstore/pickers.api';
import { toast } from 'sonner';
import {
  Layers, User, Map, Clock, AlertTriangle, CheckCircle2,
  Search, Plus, Play, Settings, ArrowRight, Box, FileText,
  ShoppingCart, Route, Zap, Info, Bell, Filter, ChevronDown,
  Grid3x3, List, Pause, XCircle, UserPlus, TrendingUp, Package, Loader2
} from 'lucide-react';
import { cn } from "../../lib/utils";
import { PageHeader } from '../ui/page-header';

type PickListStatus = 'pending' | 'inprogress' | 'completed' | 'paused';
type Zone = 'Ambient A' | 'Ambient B' | 'Chiller' | 'Frozen';
type Priority = 'normal' | 'high' | 'urgent';

type PickList = {
  id: string;
  zone: Zone;
  slaTime: string;
  slaStatus: 'safe' | 'atrisk' | 'urgent';
  items: number;
  orders: number;
  status: PickListStatus;
  progress?: number;
  picker?: { name: string; avatar: string };
  suggestedPicker?: string;
  priority: Priority;
};

type PickerOption = { id: string; name: string; avatar?: string };

export function PickTasks() {
  const [activeTab, setActiveTab] = useState<'auto' | 'manual' | 'batch' | 'multi' | 'route' | 'assign'>('auto');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [statusFilter, setStatusFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('sla');

  const [allPicklists, setAllPicklists] = useState<PickList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningFor, setAssigningFor] = useState<string | null>(null);
  const [availablePickers, setAvailablePickers] = useState<PickerOption[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPicklists = useCallback(async () => {
    try {
      setError(null);
      const resp = await picklistsApi.getPicklists({ status: statusFilter !== 'all' ? statusFilter : undefined });
      const data = (resp as { data?: PickList[] }).data;
      setAllPicklists(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setAllPicklists([]);
      setError(err instanceof Error ? err.message : 'Failed to load picklists');
      toast.error('Failed to load picklists');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPicklists();
  }, [fetchPicklists]);

  const handleCreatePickList = async () => {
    try {
      setActionLoading('create');
      const zones: Zone[] = ['Ambient A', 'Ambient B', 'Chiller', 'Frozen'];
      const resp = await picklistsApi.createPicklist({
        zone: zones[allPicklists.length % zones.length],
        priority: 'normal',
      } as { zone: string; priority: string });
      const data = (resp as { data?: PickList }).data;
      if (data) {
        setAllPicklists((prev) => [data, ...prev]);
        toast.success(`Pick list ${data.id} created`);
      } else {
        await fetchPicklists();
        toast.success('Pick list created');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create pick list');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (
    picklistId: string,
    action: 'start' | 'pause' | 'continue' | 'complete' | 'assign' | 'moveToPacking',
    payload?: { pickerId?: string; progress?: number }
  ) => {
    try {
      setActionLoading(picklistId);
      if (action === 'start') {
        await picklistsApi.startPicking(picklistId);
        toast.success(`Started picking ${picklistId}`);
      } else if (action === 'pause') {
        await picklistsApi.pausePicking(picklistId);
        toast.success(`${picklistId} paused`);
      } else if (action === 'continue') {
        const next = Math.min((payload?.progress ?? 0) + 25, 100);
        await picklistsApi.updateProgress(picklistId, next);
        if (next >= 100) toast.success(`${picklistId} completed`);
      } else if (action === 'complete') {
        await picklistsApi.completePicking(picklistId);
        toast.success(`${picklistId} completed`);
      } else if (action === 'assign' && payload?.pickerId) {
        await picklistsApi.assignPicker(picklistId, payload.pickerId);
        toast.success(`Picker assigned to ${picklistId}`);
        setAssigningFor(null);
      } else if (action === 'moveToPacking') {
        await picklistsApi.moveToPacking(picklistId);
        toast.success(`${picklistId} moved to packing`);
      }
      await fetchPicklists();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openAssignPicker = async (picklistId: string) => {
    setAssigningFor(picklistId);
    try {
      const resp = await getAvailablePickers();
      const data = (resp as { data?: PickerOption[] }).data;
      setAvailablePickers(Array.isArray(data) ? data : []);
    } catch {
      setAvailablePickers([]);
    }
  };

  const filteredByFilters = allPicklists.filter((p) => {
    const statusOk = statusFilter === 'all' || p.status === statusFilter;
    const zoneOk = zoneFilter === 'all' || (zoneFilter === 'ambient' && (p.zone === 'Ambient A' || p.zone === 'Ambient B')) || (zoneFilter === 'chiller' && p.zone === 'Chiller') || (zoneFilter === 'frozen' && p.zone === 'Frozen');
    const priorityOk = priorityFilter === 'all' || p.priority === priorityFilter;
    const assignOk = assignmentFilter === 'all' || (assignmentFilter === 'assigned' && p.picker) || (assignmentFilter === 'unassigned' && !p.picker) || (assignmentFilter === 'myteam' && p.picker);
    return statusOk && zoneOk && priorityOk && assignOk;
  });

  const tabSubset: Record<string, PickList[]> = {
    auto: filteredByFilters,
    manual: filteredByFilters.filter((p) => p.status === 'pending'),
    batch: filteredByFilters.filter((p) => p.status === 'inprogress'),
    multi: filteredByFilters.filter((p) => p.orders >= 2),
    route: [...filteredByFilters].sort((a, b) => (a.zone > b.zone ? 1 : -1)),
    assign: filteredByFilters.filter((p) => !p.picker),
  };
  const picklistsToUse = tabSubset[activeTab] ?? filteredByFilters;
  const sortedPicklists = [...picklistsToUse].sort((a, b) => {
    if (sortBy === 'sla') return (a.slaTime || '').localeCompare(b.slaTime || '');
    if (sortBy === 'items') return (b.items || 0) - (a.items || 0);
    if (sortBy === 'orders') return (b.orders || 0) - (a.orders || 0);
    return 0;
  });

  const totalToday = allPicklists.length;
  const pending = allPicklists.filter((p) => p.status === 'pending').length;
  const inProgress = allPicklists.filter((p) => p.status === 'inprogress').length;
  const completed = allPicklists.filter((p) => p.status === 'completed').length;
  const slaCompliance = totalToday > 0 ? Math.round((completed / totalToday) * 100) : 0;
  const avgProgress = totalToday > 0
    ? Math.round(allPicklists.reduce((acc, p) => acc + (p.progress ?? (p.status === 'completed' ? 100 : 0)), 0) / totalToday)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pick Tasks"
        subtitle="Manage picking assignments and workflows"
        actions={
          <button
            onClick={handleCreatePickList}
            disabled={!!actionLoading}
            className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] disabled:opacity-50 flex items-center gap-2"
          >
            {actionLoading === 'create' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Create Pick List
          </button>
        }
      />

      <div className="flex items-center gap-1 border-b border-[#E0E0E0] overflow-x-auto">
        <TabButton id="auto" label="Auto Picklist" active={activeTab} onClick={setActiveTab} />
        <TabButton id="manual" label="Manual Picklist" active={activeTab} onClick={setActiveTab} />
        <TabButton id="batch" label="Batch Picking" active={activeTab} onClick={setActiveTab} />
        <TabButton id="multi" label="Multi-Order" active={activeTab} onClick={setActiveTab} />
        <TabButton id="route" label="Route Optimization" active={activeTab} onClick={setActiveTab} />
        <TabButton id="assign" label="Picker Assignment" active={activeTab} onClick={setActiveTab} />
      </div>

      <div className="grid grid-cols-6 gap-4">
        <StatsCard label="Total Picklists Today" value={totalToday} color="bg-[#F5F5F5]" textColor="text-[#212121]" />
        <StatsCard label="Pending" value={pending} color="bg-[#FFF7E6]" textColor="text-[#D46B08]" />
        <StatsCard label="In Progress" value={inProgress} color="bg-[#E6F7FF]" textColor="text-[#1677FF]" />
        <StatsCard label="Completed" value={completed} color="bg-[#F0FDF4]" textColor="text-[#16A34A]" />
        <StatsCard label="SLA Compliance %" value={`${slaCompliance}%`} color="bg-[#F3E8FF]" textColor="text-[#9333EA]" />
        <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
          <p className="text-xs font-bold text-[#757575] uppercase tracking-wider mb-2">Overall Progress</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#F5F5F5] h-2 rounded-full overflow-hidden">
              <div className="bg-[#1677FF] h-full rounded-full" style={{ width: `${avgProgress}%` }} />
            </div>
            <span className="text-sm font-bold text-[#212121]">{avgProgress}%</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#E0E0E0]">
        <div className="flex items-center gap-2 text-sm font-bold text-[#616161]">
          <Filter size={16} />
          <span>Filters:</span>
        </div>
        <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter} options={[
          { value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'inprogress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }
        ]} />
        <FilterDropdown label="Zone" value={zoneFilter} onChange={setZoneFilter} options={[
          { value: 'all', label: 'All Zones' }, { value: 'ambient', label: 'Ambient' }, { value: 'chiller', label: 'Chiller' }, { value: 'frozen', label: 'Frozen' }
        ]} />
        <FilterDropdown label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={[
          { value: 'all', label: 'All Priority' }, { value: 'urgent', label: 'Urgent' }, { value: 'high', label: 'High' }, { value: 'normal', label: 'Normal' }
        ]} />
        <FilterDropdown label="Assignment" value={assignmentFilter} onChange={setAssignmentFilter} options={[
          { value: 'all', label: 'All' }, { value: 'assigned', label: 'Assigned' }, { value: 'unassigned', label: 'Unassigned' }, { value: 'myteam', label: 'My Team' }
        ]} />
        <div className="h-6 w-px bg-[#E0E0E0]" />
        <FilterDropdown label="Sort" value={sortBy} onChange={setSortBy} options={[
          { value: 'sla', label: 'By SLA' }, { value: 'items', label: 'By Items' }, { value: 'orders', label: 'By Orders' }, { value: 'newest', label: 'Newest' }
        ]} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[#1677FF]" />
        </div>
      ) : error ? (
        <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-xl p-6 text-center">
          <p className="text-[#B91C1C] font-medium">{error}</p>
        </div>
      ) : sortedPicklists.length === 0 ? (
        <div className="bg-white border border-[#E0E0E0] rounded-xl p-12 text-center">
          <p className="text-[#757575]">No picklists yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPicklists.map((picklist) => (
            <PicklistCard
              key={picklist.id}
              picklist={picklist}
              onAction={handleAction}
              onAssignClick={openAssignPicker}
              assigningFor={assigningFor}
              availablePickers={availablePickers}
              onAssignSelect={(pickerId) => handleAction(picklist.id, 'assign', { pickerId })}
              onAssignClose={() => setAssigningFor(null)}
              isLoading={actionLoading === picklist.id}
            />
          ))}
        </div>
      )}

      {assigningFor && (
        <AssignPickerModal
          picklistId={assigningFor}
          pickers={availablePickers}
          onSelect={(pickerId) => handleAction(assigningFor, 'assign', { pickerId })}
          onClose={() => setAssigningFor(null)}
        />
      )}

      <div className="flex items-center justify-between pt-4 border-t border-[#E0E0E0]">
        <div className="text-sm text-[#757575]">
          Showing <span className="font-bold text-[#212121]">{sortedPicklists.length}</span> of <span className="font-bold text-[#212121]">{allPicklists.length}</span> picklists
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#E0E0E0] rounded-lg p-1">
          <button onClick={() => setViewMode('card')} className={cn("p-1.5 rounded transition-colors", viewMode === 'card' ? "bg-[#1677FF] text-white" : "text-[#616161] hover:bg-[#F5F5F5]")} title="Card View">
            <Grid3x3 size={16} />
          </button>
          <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded transition-colors", viewMode === 'list' ? "bg-[#1677FF] text-white" : "text-[#616161] hover:bg-[#F5F5F5]")} title="List View">
            <List size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignPickerModal({ picklistId, pickers, onSelect, onClose }: {
  picklistId: string; pickers: PickerOption[]; onSelect: (id: string) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-4">Assign picker to {picklistId}</h3>
        {pickers.length === 0 ? (
          <p className="text-[#757575]">No available pickers.</p>
        ) : (
          <div className="space-y-2">
            {pickers.map((p) => (
              <button key={p.id} onClick={() => onSelect(p.id)} className="w-full p-3 text-left rounded-lg border border-[#E0E0E0] hover:bg-[#F5F5F5] flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E0E7FF] flex items-center justify-center text-sm font-bold text-[#4F46E5">
                  {(p.avatar || p.name?.slice(0, 2) || '?').toUpperCase()}
                </div>
                {p.name}
              </button>
            ))}
          </div>
        )}
        <button onClick={onClose} className="mt-4 w-full py-2 border border-[#E0E0E0] rounded-lg text-[#616161] hover:bg-[#F5F5F5]">
          Cancel
        </button>
      </div>
    </div>
  );
}

function TabButton({ id, label, active, onClick }: { id: string; label: string; active: string; onClick: (id: string) => void }) {
  const isActive = active === id;
  return (
    <button onClick={() => onClick(id)} className={cn("px-4 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap", isActive ? "border-[#1677FF] text-[#1677FF] bg-[#F0F7FF]" : "border-transparent text-[#616161] hover:text-[#212121] hover:bg-[#F5F5F5]")}>
      {label}
    </button>
  );
}

function StatsCard({ label, value, color, textColor }: { label: string; value: number | string; color: string; textColor: string }) {
  return (
    <div className={cn("p-4 rounded-xl border border-[#E0E0E0] shadow-sm", color)}>
      <p className="text-xs font-bold text-[#757575] uppercase tracking-wider mb-2">{label}</p>
      <p className={cn("text-2xl font-bold", textColor)}>{value}</p>
    </div>
  );
}

function FilterDropdown({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none pl-3 pr-8 py-1.5 text-sm font-medium text-[#212121] bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg focus:outline-none focus:border-[#1677FF] cursor-pointer hover:bg-[#ECECEC] transition-colors">
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#616161] pointer-events-none" />
    </div>
  );
}

function PicklistCard({
  picklist,
  onAction,
  onAssignClick,
  assigningFor,
  availablePickers,
  onAssignSelect,
  onAssignClose,
  isLoading,
}: {
  picklist: PickList;
  onAction: (id: string, action: string, payload?: { pickerId?: string; progress?: number }) => void;
  onAssignClick: (id: string) => void;
  assigningFor: string | null;
  availablePickers: PickerOption[];
  onAssignSelect: (pickerId: string) => void;
  onAssignClose: () => void;
  isLoading: boolean;
}) {
  const handleStart = () => onAction(picklist.id, 'start');
  const handlePause = () => onAction(picklist.id, 'pause');
  const handleContinue = () => onAction(picklist.id, 'continue', { progress: picklist.progress ?? 0 });
  const handleComplete = () => onAction(picklist.id, 'complete');
  const handleMoveToPacking = () => onAction(picklist.id, 'moveToPacking');
  const handleDetails = () => toast.info(`${picklist.id}: ${picklist.zone}, ${picklist.items} items, ${picklist.orders} orders`);

  const getZoneColor = (zone: Zone) => {
    switch (zone) {
      case 'Ambient A':
      case 'Ambient B': return { bg: 'bg-[#FFF7E6]', text: 'text-[#D46B08]', border: 'border-[#FFD591]' };
      case 'Chiller': return { bg: 'bg-[#E6F7FF]', text: 'text-[#1677FF]', border: 'border-[#91CAFF]' };
      case 'Frozen': return { bg: 'bg-[#F0F9FF]', text: 'text-[#0EA5E9]', border: 'border-[#7DD3FC]' };
      default: return { bg: 'bg-[#F5F5F5]', text: 'text-[#616161]', border: 'border-[#E0E0E0]' };
    }
  };
  const getSLAColor = (status: 'safe' | 'atrisk' | 'urgent') => {
    switch (status) {
      case 'urgent': return { bg: 'bg-[#FEE2E2]', text: 'text-[#EF4444]', border: 'border-[#FECACA]' };
      case 'atrisk': return { bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]', border: 'border-[#FCD34D]' };
      case 'safe': return { bg: 'bg-[#DCFCE7]', text: 'text-[#16A34A]', border: 'border-[#86EFAC]' };
    }
  };
  const getStatusBadge = (status: PickListStatus) => {
    switch (status) {
      case 'pending': return { bg: 'bg-[#FFF7E6]', text: 'text-[#D46B08]', label: 'Pending' };
      case 'inprogress': return { bg: 'bg-[#E6F7FF]', text: 'text-[#1677FF]', label: 'In Progress' };
      case 'completed': return { bg: 'bg-[#F0FDF4]', text: 'text-[#16A34A]', label: 'Completed' };
      case 'paused': return { bg: 'bg-[#F5F5F5]', text: 'text-[#616161]', label: 'Paused' };
    }
  };

  const zoneColors = getZoneColor(picklist.zone);
  const slaColors = getSLAColor(picklist.slaStatus);
  const statusBadge = getStatusBadge(picklist.status);

  return (
    <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
      {picklist.slaStatus === 'urgent' && <div className="absolute top-0 left-0 w-1 h-full bg-[#EF4444]" />}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-[#212121]">{picklist.id}</span>
          <span className={cn("px-2 py-0.5 rounded text-xs font-bold border", zoneColors.bg, zoneColors.text, zoneColors.border)}>{picklist.zone}</span>
        </div>
        <div className={cn("px-2 py-1 rounded text-xs font-bold flex items-center gap-1 border", slaColors.bg, slaColors.text, slaColors.border)}>
          <Clock size={12} /> {picklist.slaTime}
        </div>
      </div>
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-4 text-sm text-[#616161]">
          <div className="flex items-center gap-1.5"><Package size={14} className="text-[#9E9E9E]" /><span className="font-medium">{picklist.items} items</span></div>
          <div className="flex items-center gap-1.5"><ShoppingCart size={14} className="text-[#9E9E9E]" /><span className="font-medium">{picklist.orders} orders</span></div>
        </div>
        <div className={cn("inline-flex px-2 py-1 rounded-full text-xs font-bold", statusBadge.bg, statusBadge.text)}>{statusBadge.label}</div>
        {picklist.status === 'inprogress' && picklist.progress !== undefined && (
          <div>
            <div className="flex justify-between text-xs mb-1"><span className="text-[#757575]">Picking progress</span><span className="font-bold text-[#1677FF]">{picklist.progress}%</span></div>
            <div className="w-full bg-[#F5F5F5] h-2 rounded-full overflow-hidden">
              <div className="bg-[#1677FF] h-full rounded-full transition-all" style={{ width: `${picklist.progress}%` }} />
            </div>
          </div>
        )}
      </div>
      <div className="pt-4 border-t border-[#F5F5F5] space-y-3">
        {picklist.picker ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#E0E7FF] flex items-center justify-center text-[10px] font-bold text-[#4F46E5]">{picklist.picker.avatar}</div>
            <span className="text-sm font-medium text-[#616161]">{picklist.picker.name}</span>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-[#F5F5F5] flex items-center justify-center"><User size={12} className="text-[#9E9E9E]" /></div>
              <span className="text-sm font-medium text-[#9E9E9E] italic">Unassigned</span>
            </div>
            {picklist.suggestedPicker && <p className="text-xs text-[#757575] ml-8">Suggested: <span className="font-medium text-[#1677FF]">{picklist.suggestedPicker}</span></p>}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {picklist.status === 'pending' && (
            <>
              <button onClick={handleStart} disabled={isLoading} className="flex-1 px-3 py-2 bg-[#212121] text-white rounded-lg text-xs font-bold hover:bg-black disabled:opacity-50 flex items-center justify-center gap-1">
                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Start Picking
              </button>
              <button onClick={() => onAssignClick(picklist.id)} className="px-3 py-2 border border-[#E0E0E0] text-[#616161] rounded-lg text-xs font-bold hover:bg-[#F5F5F5]" title="Assign Picker"><UserPlus size={12} /></button>
            </>
          )}
          {picklist.status === 'inprogress' && (
            <>
              <button onClick={handleContinue} disabled={isLoading} className="flex-1 px-3 py-2 bg-[#1677FF] text-white rounded-lg text-xs font-bold hover:bg-[#1668E3] disabled:opacity-50 flex items-center justify-center gap-1">
                {isLoading ? <Loader2 size={12} className="animate-spin" /> : 'Continue'}
              </button>
              <button onClick={handlePause} disabled={isLoading} className="px-3 py-2 border border-[#E0E0E0] text-[#616161] rounded-lg text-xs font-bold hover:bg-[#F5F5F5]"><Pause size={12} /></button>
              <button onClick={handleComplete} disabled={isLoading} className="px-3 py-2 bg-[#16A34A] text-white rounded-lg text-xs font-bold hover:bg-[#15803D] disabled:opacity-50"><CheckCircle2 size={12} /></button>
            </>
          )}
          {picklist.status === 'paused' && (
            <>
              <button onClick={handleContinue} disabled={isLoading} className="flex-1 px-3 py-2 bg-[#1677FF] text-white rounded-lg text-xs font-bold disabled:opacity-50">Continue</button>
              <button onClick={handleComplete} disabled={isLoading} className="px-3 py-2 bg-[#16A34A] text-white rounded-lg text-xs font-bold disabled:opacity-50">Complete</button>
            </>
          )}
          {picklist.status === 'completed' && (
            <button onClick={handleMoveToPacking} disabled={isLoading} className="flex-1 px-3 py-2 bg-[#9333EA] text-white rounded-lg text-xs font-bold hover:bg-[#7E22CE] disabled:opacity-50 flex items-center justify-center gap-1">
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />} Move to Packing
            </button>
          )}
        </div>
        <button onClick={handleDetails} className="text-xs text-[#1677FF] hover:underline font-medium flex items-center gap-1"><Info size={12} /> Details</button>
      </div>
    </div>
  );
}
