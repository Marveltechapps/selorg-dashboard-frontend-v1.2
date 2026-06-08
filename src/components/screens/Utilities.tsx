import React, { useState, useEffect, useRef } from 'react';
import { useScreenTab } from '../../hooks/useScreenUrlState';
import { 
  Printer, Upload, FileText, RefreshCw, Power, Settings, 
  Search, Download, AlertTriangle, CheckCircle2, History,
  Database, Server, Shield, Cloud, Loader2
} from 'lucide-react';
import { cn } from "../../lib/utils";
import { DarkstoreScreenShell } from '../darkstore/DarkstoreScreenShell';
import { DarkstoreTabBar } from '../darkstore/DarkstoreTabBar';
import { MetricCard } from '../darkstore/MetricCard';
import { StatusBadge } from '../darkstore/StatusBadge';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import * as utilitiesApi from '../../api/utilities/utilitiesApi';
import { useAuth } from '../../contexts/AuthContext';
import { SettingsModal } from './SettingsModal';

const UTILITIES_TABS = ['tools', 'system', 'logs'] as const;

export function Utilities() {
  const { activeTab, changeTab: setActiveTab } = useScreenTab(UTILITIES_TABS, 'tools');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <DarkstoreScreenShell
      title="Store Settings"
      subtitle="Operational tools, system health, and audit trails"
      actions={
        <Button type="button" variant="outline" size="sm" onClick={() => setShowSettings(true)}>
          <Settings size={16} className="mr-1.5" />
          Settings
        </Button>
      }
      toolbar={{ showDensityToggle: false, showConnection: true }}
    >
      <DarkstoreTabBar
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'tools', label: 'Operational Tools', icon: Printer },
          { id: 'system', label: 'System Status', icon: Server },
          { id: 'logs', label: 'Audit Logs', icon: History },
        ]}
      />

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {activeTab === 'tools' && <OperationalTools />}
        {activeTab === 'system' && <SystemStatus />}
        {activeTab === 'logs' && <AuditLogs />}
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} scope="darkstore" />
    </DarkstoreScreenShell>
  );
}

function StoreModeControl() {
   const [mode, setMode] = useState<'online' | 'pause' | 'maintenance'>('online');

   return (
      <div className="bg-white border border-slate-200 p-1.5 rounded-lg shadow-sm flex items-center gap-1">
         <button 
            onClick={() => setMode('online')}
            className={cn(
               "px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all",
               mode === 'online' ? "bg-emerald-50 text-emerald-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
            )}
         >
            <div className={cn("w-2 h-2 rounded-full", mode === 'online' ? "bg-emerald-600" : "bg-slate-200")} />
            Online
         </button>
         <button 
            onClick={() => setMode('pause')}
            className={cn(
               "px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all",
               mode === 'pause' ? "bg-amber-50 text-amber-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
            )}
         >
            <div className={cn("w-2 h-2 rounded-full", mode === 'pause' ? "bg-amber-600" : "bg-slate-200")} />
            Paused
         </button>
         <button 
            onClick={() => setMode('maintenance')}
            className={cn(
               "px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all",
               mode === 'maintenance' ? "bg-slate-100 text-slate-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
            )}
         >
            <div className={cn("w-2 h-2 rounded-full", mode === 'maintenance' ? "bg-slate-600" : "bg-slate-200")} />
            Maintenance
         </button>
      </div>
   )
}

// --- Operational Tools Tab ---

function OperationalTools() {
   const [searchTerm, setSearchTerm] = useState('');
   const [labelType, setLabelType] = useState<'item_barcode' | 'shelf_edge_label' | 'bin_location_tag' | 'pallet_id'>('item_barcode');
   const [quantity, setQuantity] = useState(1);
   const [generating, setGenerating] = useState(false);
   const [uploading, setUploading] = useState(false);
   const [lastUpload, setLastUpload] = useState<string | null>(null);
   const { activeStoreId } = useAuth();
   const storeId = activeStoreId || '';
   const fileInputRef = useRef<HTMLInputElement>(null);

   const handleGenerateLabel = async () => {
      if (!searchTerm.trim()) {
         toast.error('Please enter SKU or Bin location');
         return;
      }

      try {
         setGenerating(true);
         const response = await utilitiesApi.generateLabel({
            searchTerm: searchTerm.trim(),
            labelType,
            quantity,
         });

         if (response.success) {
            toast.success(`Label generated! Job ID: ${response.printJobId}`);
            setSearchTerm('');
            setQuantity(1);
         }
      } catch (error: any) {
         toast.error(error.message || 'Failed to generate label');
      } finally {
         setGenerating(false);
      }
   };

   const handleFileUpload = async (file: File) => {
      try {
         setUploading(true);
         const response = await utilitiesApi.bulkUpload(file, {
            storeId,
            validateOnly: false,
         });

         if (response.success) {
            toast.success(
               `Upload completed! ${response.processedRows}/${response.totalRows} rows processed. ${response.failedRows} errors.`
            );
            setLastUpload(new Date().toLocaleString());
            if (response.errors && response.errors.length > 0) {
               console.warn('Upload errors:', response.errors);
            }
         }
      } catch (error: any) {
         toast.error(error.message || 'Failed to upload file');
      } finally {
         setUploading(false);
      }
   };

   const handleDownloadTemplate = async () => {
      try {
         const blob = await utilitiesApi.downloadUploadTemplate('csv');
         const url = window.URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = 'bulk-upload-template.csv';
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         window.URL.revokeObjectURL(url);
         toast.success('Template downloaded successfully');
      } catch (error: any) {
         toast.error(error.message || 'Failed to download template');
      }
   };

   return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Label Printing Module */}
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
               <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                  <Printer size={24} />
               </div>
               <div>
                  <h3 className="text-lg font-bold text-slate-900">Label Manager</h3>
                  <p className="text-sm text-slate-500">Reprint SKU barcodes and shelf tags.</p>
               </div>
            </div>
            
            <div className="space-y-4">
               <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Search SKU / Bin</label>
                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                     <input 
                        type="text" 
                        placeholder="e.g. SKU-9921 or Bin A-12" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleGenerateLabel()}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-600 focus:outline-none"
                     />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Label Type</label>
                     <select 
                        value={labelType}
                        onChange={(e) => setLabelType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-600 focus:outline-none bg-white"
                     >
                        <option value="item_barcode">Item Barcode (Standard)</option>
                        <option value="shelf_edge_label">Shelf Edge Label</option>
                        <option value="bin_location_tag">Bin Location Tag</option>
                        <option value="pallet_id">Pallet ID</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Quantity</label>
                     <input 
                        type="number" 
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        min={1}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-600 focus:outline-none"
                     />
                  </div>
               </div>

               <button 
                  onClick={handleGenerateLabel}
                  disabled={generating}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
               >
                  {generating ? (
                     <>
                        <Loader2 size={16} className="animate-spin" />
                        Generating...
                     </>
                  ) : (
                     <>
                        <Printer size={16} /> Generate & Print
                     </>
                  )}
               </button>
            </div>
         </div>

         {/* Bulk SKU Upload */}
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
               <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Database size={24} />
               </div>
               <div>
                  <h3 className="text-lg font-bold text-slate-900">Bulk SKU Upload</h3>
                  <p className="text-sm text-slate-500">Update inventory via CSV/Excel.</p>
               </div>
            </div>

            <input
               ref={fileInputRef}
               type="file"
               accept=".csv,.xlsx,.xls"
               onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                     if (file.size > 10 * 1024 * 1024) {
                        toast.error('File size must be less than 10MB');
                        return;
                     }
                     handleFileUpload(file);
                  }
               }}
               className="hidden"
            />

            <div 
               onClick={() => fileInputRef.current?.click()}
               className={cn(
                  "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group",
                  uploading ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
               )}
            >
               {uploading ? (
                  <>
                     <Loader2 size={24} className="animate-spin text-blue-600 mb-3" />
                     <h4 className="font-bold text-slate-900 mb-1">Uploading...</h4>
                     <p className="text-xs text-slate-500">Please wait</p>
                  </>
               ) : (
                  <>
                     <div className="p-4 bg-slate-100 rounded-full text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mb-3">
                        <Upload size={24} />
                     </div>
                     <h4 className="font-bold text-slate-900 mb-1">Click to upload or drag & drop</h4>
                     <p className="text-xs text-slate-500 max-w-[200px]">
                        Supported formats: .CSV, .XLSX. Max file size: 10MB.
                     </p>
                  </>
               )}
            </div>

            <div className="mt-4 flex justify-between items-center">
               <button 
                  onClick={handleDownloadTemplate}
                  className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
               >
                  <Download size={12} /> Download Template
               </button>
               <span className="text-[10px] text-slate-400">
                  {lastUpload ? `Last upload: ${lastUpload}` : 'No uploads yet'}
               </span>
            </div>
         </div>
      </div>
   )
}

// --- System Status Tab ---

function SystemStatus() {
   const [systemStatus, setSystemStatus] = useState<any>(null);
   const [loading, setLoading] = useState(true);
   const [runningDiagnostic, setRunningDiagnostic] = useState(false);
   const [syncing, setSyncing] = useState(false);
   const { activeStoreId } = useAuth();
   const storeId = activeStoreId || '';
   const [lastDiagnostic, setLastDiagnostic] = useState<string | null>(null);
   const [lastSync, setLastSync] = useState<string | null>(null);

   useEffect(() => {
      loadSystemStatus();
      const interval = setInterval(loadSystemStatus, 10000);
      return () => clearInterval(interval);
   }, [storeId]);

   const loadSystemStatus = async () => {
      try {
         const response = await utilitiesApi.getSystemStatus({ storeId });
         if (response.success) {
            setSystemStatus(response);
         }
      } catch (error: any) {
         console.error('Failed to load system status:', error);
         if (loading) {
            toast.error(error?.message || 'Failed to load system status');
         }
      } finally {
         setLoading(false);
      }
   };

   const handleRunDiagnostics = async () => {
      try {
         setRunningDiagnostic(true);
         const response = await utilitiesApi.runSystemDiagnostics({
            diagnosticType: 'database_reindex',
            storeId,
         });

         if (response.success) {
            toast.success(response.message || 'Database diagnostics started successfully');
            setLastDiagnostic(new Date().toLocaleString());
         }
      } catch (error: any) {
         toast.error(error.message || 'Failed to run diagnostics');
      } finally {
         setRunningDiagnostic(false);
      }
   };

   const handleForceSync = async () => {
      try {
         setSyncing(true);
         const response = await utilitiesApi.forceGlobalSync({
            storeId,
            syncType: 'full',
         });

         if (response.success) {
            toast.success(response.message || `Global sync completed! ${response.recordsPushed} records pushed.`);
            setLastSync(new Date().toLocaleString());
            loadSystemStatus(); // Refresh status after sync
         }
      } catch (error: any) {
         toast.error(error.message || 'Failed to sync');
      } finally {
         setSyncing(false);
      }
   };

   const getStatusDisplay = (status: string) => {
      switch (status) {
         case 'operational': return 'Operational';
         case 'degraded': return 'Degraded';
         case 'down': return 'Down';
         default: return status;
      }
   };

   const getServiceAccent = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
      if (status === 'operational') return 'success';
      if (status === 'degraded') return 'warning';
      if (status === 'down') return 'danger';
      return 'default';
   };

   const getServiceIcon = (name: string) => {
      if (name.includes('Inventory')) return Cloud;
      if (name.includes('Order')) return Server;
      return Shield;
   };

   return (
      <div className="space-y-6">
         {loading && !systemStatus ? (
            <div className="flex items-center justify-center h-32">
               <Loader2 size={24} className="animate-spin text-blue-600" />
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {systemStatus?.services?.map((service: any, i: number) => (
                  <MetricCard
                     key={i}
                     label={service.name}
                     value={getStatusDisplay(service.status)}
                     icon={getServiceIcon(service.name)}
                     accent={getServiceAccent(service.status)}
                     footer={<p className="text-xs text-slate-400">{service.latency}ms latency</p>}
                  />
               ))}
            </div>
         )}

         <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-6">Synchronization Diagnostics</h3>
            
            <div className="space-y-6">
               <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-4">
                     <div className="p-2 bg-white border border-slate-200 rounded-lg">
                        <Database size={20} className="text-slate-600" />
                     </div>
                     <div>
                        <div className="text-sm font-bold text-slate-900">Main Database Re-index</div>
                        <div className="text-xs text-slate-500">
                           {lastDiagnostic ? `Last run: ${lastDiagnostic}` : 'Not run yet'}
                        </div>
                     </div>
                  </div>
                  <button 
                     onClick={handleRunDiagnostics}
                     disabled={runningDiagnostic}
                     className="px-3 py-1.5 border border-slate-200 bg-white text-slate-900 rounded text-xs font-bold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                     {runningDiagnostic ? (
                        <>
                           <Loader2 size={12} className="animate-spin" />
                           Running...
                        </>
                     ) : (
                        'Run Check'
                     )}
                  </button>
               </div>

               <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-4">
                     <div className="p-2 bg-white border border-slate-200 rounded-lg">
                        <RefreshCw size={20} className={cn("text-slate-600", syncing && "animate-spin")} />
                     </div>
                     <div>
                        <div className="text-sm font-bold text-slate-900">Force Global Sync</div>
                        <div className="text-xs text-slate-500">
                           {lastSync ? `Last sync: ${lastSync}` : 'Push all local changes to cloud'}
                        </div>
                     </div>
                  </div>
                  <button 
                     onClick={handleForceSync}
                     disabled={syncing}
                     className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                     {syncing ? (
                        <>
                           <Loader2 size={12} className="animate-spin" />
                           Syncing...
                        </>
                     ) : (
                        'Sync Now'
                     )}
                  </button>
               </div>
            </div>
         </div>
      </div>
   )
}

// --- Audit Logs Tab ---

function AuditLogs() {
   const [logs, setLogs] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [exporting, setExporting] = useState(false);
   const [pagination, setPagination] = useState<any>(null);

   useEffect(() => {
      loadAuditLogs();
      // Refresh logs every 30 seconds
      const interval = setInterval(loadAuditLogs, 30000);
      return () => clearInterval(interval);
   }, []);

   const loadAuditLogs = async () => {
      try {
         const response = await utilitiesApi.getAuditLogs({
            module: 'all',
            page: 1,
            limit: 50,
         });
         setLogs(response.logs);
         setPagination(response.pagination);
      } catch (error: any) {
         console.error('Failed to load audit logs:', error);
         if (loading) {
            toast.error('Failed to load audit logs');
         }
      } finally {
         setLoading(false);
      }
   };

   const handleExportCSV = async () => {
      try {
         setExporting(true);
         const now = new Date();
         const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
         
         const response = await utilitiesApi.exportAuditLogs({
            module: 'all',
            from: yesterday.toISOString(),
            to: now.toISOString(),
            format: 'csv',
         });

         // Check if response is a Blob (CSV) or JSON (Excel)
         if (response instanceof Blob) {
            // Create download link for CSV
            const url = window.URL.createObjectURL(response);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            toast.success('✅ Audit logs exported successfully');
         } else if (response && typeof response === 'object' && 'success' in response && response.success) {
            // Excel format - show URL (or download if URL is accessible)
            toast.success('Audit logs export initiated. Download link will be available shortly.');
         }
      } catch (error: any) {
         console.error('Export error:', error);
         toast.error(error.message || 'Failed to export audit logs');
      } finally {
         setExporting(false);
      }
   };

   const formatTime = (timestamp: string) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
         hour: '2-digit', 
         minute: '2-digit', 
         second: '2-digit',
         hour12: false 
      });
   };

   return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[600px]">
         <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">System Audit Trail</h3>
            <div className="flex gap-2">
               <button 
                  onClick={handleExportCSV}
                  disabled={exporting || logs.length === 0}
                  className="px-3 py-1.5 border border-slate-200 rounded text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
               >
                     {exporting ? (
                     <>
                        <Loader2 size={12} className="animate-spin" />
                        Exporting...
                     </>
                  ) : (
                     'Export CSV'
                  )}
               </button>
            </div>
         </div>
         <div className="flex-1 overflow-auto">
            {loading ? (
               <div className="flex items-center justify-center h-full">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
               </div>
            ) : logs.length === 0 ? (
               <div className="flex items-center justify-center h-full text-slate-500">
                  No audit logs found
               </div>
            ) : (
               <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                     <tr>
                        <th className="px-6 py-3 font-medium">Timestamp</th>
                        <th className="px-6 py-3 font-medium">User</th>
                        <th className="px-6 py-3 font-medium">Module</th>
                        <th className="px-6 py-3 font-medium">Action</th>
                        <th className="px-6 py-3 font-medium">Details</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {logs.map((log, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                           <td className="px-6 py-3 text-slate-600 font-mono text-xs">
                              {formatTime(log.timestamp)}
                           </td>
                           <td className="px-6 py-3 font-medium text-slate-900">{log.userName || log.userId}</td>
                           <td className="px-6 py-3 text-slate-600">
                              <StatusBadge variant="workflow" status={log.module} />
                           </td>
                           <td className="px-6 py-3 font-bold text-slate-900">{log.action}</td>
                           <td className="px-6 py-3 text-slate-600">{log.details}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            )}
         </div>
      </div>
   )
}