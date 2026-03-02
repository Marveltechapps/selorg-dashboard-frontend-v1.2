import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, AlertOctagon, ShieldAlert, FileText, 
  Search, Filter, Plus, Clock, ChevronRight, X, AlertTriangle, RefreshCw, History,
  ShieldCheck, BadgeAlert, Eye, Scale, Leaf, Thermometer, Droplets, HardHat
} from 'lucide-react';
import { cn } from "../../lib/utils";
import { PageHeader } from '../ui/page-header';
import { EmptyState, LoadingState } from '../ui/ux-components';
import { toast } from "sonner";
import { 
  getQCSummary, 
  getWatchlist, 
  getRecentFailures, 
  logQCCheck, 
  resolveQCFailure, 
  addWatchlistItem, 
  getComplianceLogs, 
  getAuditStatus, 
  addComplianceLog 
} from '../../api/qc-compliance/qc.api';
import { ActionHistoryViewer } from '../ui/action-history-viewer';
import { Button } from '../ui/button';

export function QualityControl() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'compliance'>('dashboard');
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await getQCSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to load QC summary:', error);
      toast.error('Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality & Compliance"
        subtitle="Monitor product quality, track hygiene audits, and manage high-risk watchlist."
        actions={
          <div className="flex gap-4 items-center">
            <div className="bg-white px-4 py-2 rounded-lg border border-[#E0E0E0] shadow-sm flex items-center gap-3">
              <div className="p-2 bg-[#F0FDF4] text-[#16A34A] rounded-lg">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[#757575]">Pass Rate</div>
                <div className="font-bold text-[#212121]">
                  {loading ? '...' : `${summary?.summary.qc_pass_rate || 0}%`}
                </div>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-[#E0E0E0] shadow-sm flex items-center gap-3">
              <div className="p-2 bg-[#FEE2E2] text-[#EF4444] rounded-lg">
                <BadgeAlert size={20} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[#757575]">Failures</div>
                <div className="font-bold text-[#212121]">
                  {loading ? '...' : summary?.summary.critical_failures_today || 0} Critical
                </div>
              </div>
            </div>
          </div>
        }
      />

      <div className="flex items-center gap-1 border-b border-[#E0E0E0] mb-6 overflow-x-auto">
        <TabButton id="dashboard" label="QC Dashboard" icon={ShieldAlert} active={activeTab} onClick={setActiveTab} />
        <TabButton id="compliance" label="Compliance Logs" icon={FileText} active={activeTab} onClick={setActiveTab} />
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'dashboard' && <QCDashboard summary={summary} loadSummary={loadSummary} />}
        {activeTab === 'compliance' && <ComplianceLogs />}
      </div>
    </div>
  );
}

function TabButton({ id, label, icon: Icon, active, onClick }: any) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        "flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
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

function QCDashboard({ summary, loadSummary }: { summary: any, loadSummary: () => void }) {
  const [watchItems, setWatchItems] = useState<any[]>([]);
  const [failures, setFailures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showFailureHistory, setShowFailureHistory] = useState(false);
  const [showWatchHistory, setShowWatchHistory] = useState(false);
  const [formData, setFormData] = useState({ productName: '', sku: '', reason: '', reqCheck: 'Every 4h' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [watchlist, failureList] = await Promise.all([
        getWatchlist(),
        getRecentFailures(),
      ]);
      setWatchItems(watchlist.watchlist || []);
      const list = failureList.failures || [];
      setFailures(list);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogCheck = async (sku: string) => {
    try {
      await logQCCheck(sku, {
        check_result: 'passed',
        checked_by: 'John D.',
        check_notes: 'Visual check passed'
      });
      toast.success('QC check logged');
      // Remove item from UI immediately
      setWatchItems(prev => prev.filter(item => item.sku !== sku));
    } catch (error) {
      toast.error('Failed to log check');
    }
  };

  const handleResolve = async (failureId: string) => {
    try {
      await resolveQCFailure(failureId, { resolution_notes: 'Product replaced', action_taken: 'Replaced' });
      toast.success('Failure resolved');
      setFailures(prev => prev.filter(f => (f.failure_id || f.order_id) !== failureId));
      loadSummary();
    } catch (error) {
      toast.error('Failed to resolve');
    }
  };

  const handleAddWatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addWatchlistItem({
        product_name: formData.productName,
        sku: formData.sku,
        reason: formData.reason,
        required_check: formData.reqCheck
      });
      toast.success('Added to watchlist');
      setIsDialogOpen(false);
      setFormData({ productName: '', sku: '', reason: '', reqCheck: 'Every 4h' });
      loadData();
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard title="Auto QC Failures" value={summary?.summary.auto_qc_failures || 0} icon={AlertTriangle} color="red" />
          <MetricCard title="Manual Checks" value={summary?.summary.manual_checks || 0} icon={Eye} color="blue" />
          <MetricCard title="Weight Variance" value={`${summary?.summary.weight_variance || 0}%`} icon={Scale} color="orange" />
          <MetricCard title="Freshness Score" value={`${summary?.summary.freshness_score || 0}/10`} icon={Leaf} color="green" />
       </div>

       <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-8 space-y-6">
             <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
                   <h3 className="font-bold text-[#212121]">Recent QC Failures</h3>
                   <button 
                     onClick={() => setShowFailureHistory(!showFailureHistory)}
                     className={cn(
                       "p-1.5 rounded-lg transition-colors",
                       showFailureHistory ? "bg-[#1677FF] text-white" : "text-[#757575] hover:bg-[#F5F5F5]"
                     )}
                   >
                     <History size={16} />
                   </button>
                </div>
                <div className="overflow-x-auto min-h-[300px]">
                   {showFailureHistory ? (
                      <div className="p-4">
                         <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-xs uppercase text-[#757575]">Resolution History</h4>
                            <button onClick={() => setShowFailureHistory(false)} className="text-[10px] text-[#1677FF] font-bold">Back to Failures</button>
                         </div>
                         <ActionHistoryViewer module="qc" action="RESOLVE_FAILURE" />
                      </div>
                   ) : (
                      <table className="w-full text-left text-sm">
                         <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0]">
                            <tr>
                               <th className="px-6 py-3 font-medium">Order ID</th>
                               <th className="px-6 py-3 font-medium">Product</th>
                               <th className="px-6 py-3 font-medium">Issue</th>
                               <th className="px-6 py-3 font-medium">Severity</th>
                               <th className="px-6 py-3 font-medium">Action</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-[#F0F0F0]">
                            {loading ? (
                               <tr><td colSpan={5} className="text-center p-8"><LoadingState text="Loading failures..." /></td></tr>
                            ) : failures.length === 0 ? (
                               <tr><td colSpan={5} className="text-center p-8"><EmptyState title="No active failures" icon={CheckCircle2} /></td></tr>
                            ) : (
                               failures.map((f, i) => (
                                  <tr key={i} className="hover:bg-[#F9FAFB]">
                                     <td className="px-6 py-3 font-bold">{f.order_id}</td>
                                     <td className="px-6 py-3">
                                        <div className="font-medium text-[#212121]">{f.product_name}</div>
                                        <div className="text-[10px] text-[#757575]">{f.sku}</div>
                                     </td>
                                     <td className="px-6 py-3 text-[#616161]">{f.issue}</td>
                                     <td className="px-6 py-3">
                                        <span className={cn(
                                           "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                           f.severity === 'high' ? "bg-red-100 text-red-700" :
                                           f.severity === 'medium' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                                        )}>{f.severity}</span>
                                     </td>
                                     <td className="px-6 py-3">
                                        <Button 
                                         variant="ghost" 
                                         className="text-[#1677FF] hover:underline p-0 h-auto font-bold text-xs"
                                         onClick={() => handleResolve(f.failure_id || f.order_id)}
                                        >
                                           Resolve
                                        </Button>
                                     </td>
                                  </tr>
                               ))
                            )}
                         </tbody>
                      </table>
                   )}
                </div>
             </div>
          </div>

          <div className="col-span-12 md:col-span-4 flex flex-col gap-6">
             <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-[#212121] flex items-center gap-2">
                     <AlertOctagon size={18} className="text-[#EF4444]" /> High-Risk Watchlist
                  </h3>
                  <div className="flex items-center gap-1">
                     <button 
                       onClick={() => setShowWatchHistory(!showWatchHistory)}
                       className={cn(
                         "p-1.5 rounded-lg transition-colors",
                         showWatchHistory ? "bg-[#1677FF] text-white" : "text-[#757575] hover:bg-[#F5F5F5]"
                       )}
                     >
                       <History size={16} />
                     </button>
                     <button 
                       onClick={() => setIsDialogOpen(true)}
                       className="p-1 text-[#1677FF] hover:bg-[#F0F7FF] rounded-lg"
                     >
                        <Plus size={18} />
                     </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px]">
                   {loading ? (
                      <LoadingState text="Loading watchlist..." />
                   ) : showWatchHistory ? (
                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                            <h4 className="font-bold text-xs uppercase text-[#757575]">Watchlist History</h4>
                            <button onClick={() => setShowWatchHistory(false)} className="text-[10px] text-[#1677FF] font-bold">Back to List</button>
                         </div>
                         <ActionHistoryViewer module="qc" action="LOG_CHECK" />
                      </div>
                   ) : watchItems.length === 0 ? (
                      <EmptyState title="Empty Watchlist" description="No high-risk items currently tracked." />
                   ) : (
                      watchItems.map((item, i) => (
                         <div key={i} className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
                            <div className="flex justify-between items-start mb-1">
                               <span className="font-bold text-[#B91C1C] text-sm">{item.product_name}</span>
                               <span className="text-[10px] bg-white/50 px-1.5 py-0.5 rounded text-[#B91C1C] font-bold border border-[#FECACA]">{item.sku}</span>
                            </div>
                            <div className="text-xs text-[#7F1D1D] mb-2">Risk: {item.reason}</div>
                            <div className="flex justify-between items-center text-xs text-[#7F1D1D]/80 border-t border-[#FECACA] pt-2">
                               <span>Req Check: {item.required_check}</span>
                               <button 
                                 onClick={() => handleLogCheck(item.sku)}
                                 className="underline font-bold hover:text-[#B91C1C]"
                               >
                                  Log Check
                               </button>
                            </div>
                         </div>
                      ))
                   )}
                </div>
             </div>
          </div>
       </div>

       {isDialogOpen && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-[#212121] text-lg">Add Watch Item</h3>
                 <button onClick={() => setIsDialogOpen(false)}><X size={20}/></button>
               </div>
               <form onSubmit={handleAddWatch} className="space-y-4">
                 <div>
                   <label className="block text-sm font-bold text-[#212121] mb-2">Product Name *</label>
                   <input type="text" value={formData.productName} onChange={(e) => setFormData({ ...formData, productName: e.target.value })} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm" required />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-[#212121] mb-2">SKU *</label>
                   <input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm" required />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-[#212121] mb-2">Risk Reason</label>
                   <input type="text" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm" placeholder="e.g. Temp Sensitive" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-[#212121] mb-2">Required Check *</label>
                   <input type="text" value={formData.reqCheck} onChange={(e) => setFormData({ ...formData, reqCheck: e.target.value })} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm" required />
                 </div>
                 <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1 bg-[#1677FF] text-white hover:bg-[#409EFF]">Add Item</Button>
                 </div>
               </form>
            </div>
         </div>
       )}
    </div>
  );
}

function ComplianceLogs() {
  const [activeCategory, setActiveCategory] = useState('temperature');
  const [logs, setLogs] = useState<any[]>([]);
  const [auditStatus, setAuditStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isReadingDialogOpen, setIsReadingDialogOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [formData, setFormData] = useState({ zone: '', reading: '', threshold: '', notes: '' });

  useEffect(() => {
    loadComplianceData();
  }, [activeCategory]);

  const loadComplianceData = async () => {
    setLoading(true);
    try {
      const [logList, status] = await Promise.all([
getComplianceLogs({ category: activeCategory }),
getAuditStatus()
      ]);
      setLogs(logList.logs || []);
      setAuditStatus(status.audit_status);
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReading = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addComplianceLog({
        category: activeCategory,
        zone: formData.zone,
        reading: formData.reading,
        threshold: formData.threshold,
        logged_by: 'Current User', // In real app, get from auth
        notes: formData.notes
      });
      toast.success('Reading added successfully');
      setIsReadingDialogOpen(false);
      setFormData({ zone: '', reading: '', threshold: '', notes: '' });
      loadComplianceData();
    } catch (error) {
      toast.error('Failed to add reading');
    }
  };

  const categories = [
    { id: 'temperature', label: 'Temp Logs', icon: Thermometer },
    { id: 'food_safety', label: 'Food Safety', icon: CheckCircle2 },
    { id: 'fssai_docs', label: 'FSSAI Docs', icon: FileText },
    { id: 'storage_conditions', label: 'Storage Cond.', icon: Droplets }
  ];

  return (
    <div className="grid grid-cols-12 gap-6">
       <div className="col-span-12 md:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden">
             <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA]">
                <h4 className="font-bold text-xs uppercase text-[#757575]">Categories</h4>
             </div>
             <div className="p-2 space-y-1">
                {categories.map(cat => (
                   <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-colors",
                      activeCategory === cat.id ? "bg-[#F0F7FF] text-[#1677FF]" : "text-[#616161] hover:bg-[#F5F5F5]"
                    )}
                   >
                      <cat.icon size={18} />
                      {cat.label}
                   </button>
                ))}
             </div>
          </div>
          
          {auditStatus && (
            <div className={cn(
              "p-4 rounded-xl border shadow-sm",
              auditStatus.status === 'compliant' ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]" : "bg-red-50 border-red-200 text-red-800"
            )}>
               <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={18} />
                  <span className="font-bold">Audit Status</span>
               </div>
               <div className="text-xl font-black mb-1 capitalize">{auditStatus.status}</div>
               <div className="text-[10px] font-bold opacity-80 uppercase">Last Passed: {new Date(auditStatus.last_passed).toLocaleDateString()}</div>
               <p className="text-xs mt-3 leading-relaxed">{auditStatus.message}</p>
            </div>
          )}
       </div>

       <div className="col-span-12 md:col-span-9 bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
             <div className="flex items-center gap-3">
                <h3 className="font-bold text-[#212121]">{categories.find(c => c.id === activeCategory)?.label}</h3>
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    showHistory ? "bg-[#1677FF] text-white" : "text-[#757575] hover:bg-[#F5F5F5]"
                  )}
                  title="View History"
                >
                  <History size={16} />
                </button>
             </div>
             <Button 
               size="sm" 
               className="bg-[#212121] text-white hover:bg-black text-xs font-bold"
               onClick={() => setIsReadingDialogOpen(true)}
             >
                <Plus size={14} className="mr-1" /> Add Reading
             </Button>
          </div>
          
          <div className="overflow-x-auto min-h-[400px]">
             {showHistory ? (
                <div className="p-6">
                   <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-sm text-[#212121]">Action History</h4>
                      <button onClick={() => setShowHistory(false)} className="text-xs text-[#1677FF] font-bold">Back to Logs</button>
                   </div>
                   <ActionHistoryViewer module="qc" action="ADD_COMPLIANCE_LOG" />
                </div>
             ) : (
                <table className="w-full text-left text-sm">
                   <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0]">
                      <tr>
                         <th className="px-6 py-3 font-medium">Time</th>
                         <th className="px-6 py-3 font-medium">Zone / Unit</th>
                         <th className="px-6 py-3 font-medium">Reading</th>
                         <th className="px-6 py-3 font-medium">Threshold</th>
                         <th className="px-6 py-3 font-medium">Status</th>
                         <th className="px-6 py-3 font-medium">Logged By</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-[#F0F0F0]">
                      {loading ? (
                         <tr><td colSpan={6} className="text-center p-8"><LoadingState text="Loading logs..." /></td></tr>
                      ) : logs.length === 0 ? (
                         <tr><td colSpan={6} className="text-center p-8"><EmptyState title="No logs found" description="No entries for this category today." icon={History} /></td></tr>
                      ) : (
                         logs.map((log, i) => (
                            <tr key={i} className="hover:bg-[#F9FAFB]">
                               <td className="px-6 py-3 text-[#616161]">{new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                               <td className="px-6 py-3 font-bold">{log.zone}</td>
                               <td className="px-6 py-3 font-medium text-[#212121]">{log.reading}</td>
                               <td className="px-6 py-3 text-[#757575]">{log.threshold}</td>
                               <td className="px-6 py-3">
                                  <span className={cn(
                                     "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                     log.status === 'ok' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                  )}>{log.status}</span>
                               </td>
                               <td className="px-6 py-3 text-[#616161]">{log.logged_by}</td>
                            </tr>
                         ))
                      )}
                   </tbody>
                </table>
             )}
          </div>
       </div>

       {isReadingDialogOpen && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-[#212121] text-lg">Add {categories.find(c => c.id === activeCategory)?.label}</h3>
                 <button onClick={() => setIsReadingDialogOpen(false)}><X size={20}/></button>
               </div>
               <form onSubmit={handleAddReading} className="space-y-4">
                 <div>
                   <label className="block text-sm font-bold text-[#212121] mb-2">Zone / Unit *</label>
                   <input 
                     type="text" 
                     value={formData.zone} 
                     onChange={(e) => setFormData({ ...formData, zone: e.target.value })} 
                     className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm" 
                     placeholder="e.g. Freezer-01"
                     required 
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-[#212121] mb-2">Reading *</label>
                      <input 
                        type="text" 
                        value={formData.reading} 
                        onChange={(e) => setFormData({ ...formData, reading: e.target.value })} 
                        className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm" 
                        placeholder="-18°C"
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#212121] mb-2">Threshold *</label>
                      <input 
                        type="text" 
                        value={formData.threshold} 
                        onChange={(e) => setFormData({ ...formData, threshold: e.target.value })} 
                        className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm" 
                        placeholder="-15°C"
                        required 
                      />
                    </div>
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-[#212121] mb-2">Notes</label>
                   <textarea 
                     value={formData.notes} 
                     onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                     className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm h-20 resize-none" 
                     placeholder="Any additional observations..."
                   />
                 </div>
                 <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setIsReadingDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1 bg-[#212121] text-white hover:bg-black">Save Reading</Button>
                 </div>
               </form>
            </div>
         </div>
       )}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    red: "bg-red-50 text-red-600 border-red-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    green: "bg-green-50 text-green-600 border-green-100"
  };

  return (
    <div className={cn("bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4", colors[color])}>
       <div className={cn("p-2 rounded-lg bg-white shadow-sm border", colors[color])}>
          <Icon size={20} />
       </div>
       <div>
          <div className="text-[10px] uppercase font-bold opacity-70">{title}</div>
          <div className="text-xl font-black text-[#212121]">{value}</div>
       </div>
    </div>
  );
}
