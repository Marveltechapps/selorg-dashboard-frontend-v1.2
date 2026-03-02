import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, Upload, FileText, RefreshCw, Power, Settings, 
  Search, Download, AlertTriangle, CheckCircle2, History,
  Database, Server, Shield, Cloud, Loader2
} from 'lucide-react';
import { cn } from "../../lib/utils";
import { PageHeader } from '../ui/page-header';
import { toast } from 'sonner';
import * as utilitiesApi from '../../api/utilities/utilitiesApi';
import { useAuth } from '../../contexts/AuthContext';
import { SettingsModal } from './SettingsModal';

export function Utilities() {
  const [activeTab, setActiveTab] = useState<'tools' | 'system' | 'logs'>('tools');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilities & Settings"
        subtitle="System tools, hardware configuration, and audit trails"
        actions={
          <button 
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
          >
            <Settings size={16} />
            Settings
          </button>
        }
      />

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-[#E0E0E0] mb-6 overflow-x-auto">
        <TabButton id="tools" label="Operational Tools" icon={Printer} active={activeTab} onClick={setActiveTab} />
        <TabButton id="system" label="System Status" icon={Server} active={activeTab} onClick={setActiveTab} />
        <TabButton id="logs" label="Audit Logs" icon={History} active={activeTab} onClick={setActiveTab} />
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {activeTab === 'tools' && <OperationalTools />}
        {activeTab === 'system' && <SystemStatus />}
        {activeTab === 'logs' && <AuditLogs />}
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
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

function StoreModeControl() {
   const [mode, setMode] = useState<'online' | 'pause' | 'maintenance'>('online');

   return (
      <div className="bg-white border border-[#E0E0E0] p-1.5 rounded-lg shadow-sm flex items-center gap-1">
         <button 
            onClick={() => setMode('online')}
            className={cn(
               "px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all",
               mode === 'online' ? "bg-[#DCFCE7] text-[#16A34A] shadow-sm" : "text-[#757575] hover:bg-[#F5F5F5]"
            )}
         >
            <div className={cn("w-2 h-2 rounded-full", mode === 'online' ? "bg-[#16A34A]" : "bg-[#E0E0E0]")} />
            Online
         </button>
         <button 
            onClick={() => setMode('pause')}
            className={cn(
               "px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all",
               mode === 'pause' ? "bg-[#FEF3C7] text-[#D97706] shadow-sm" : "text-[#757575] hover:bg-[#F5F5F5]"
            )}
         >
            <div className={cn("w-2 h-2 rounded-full", mode === 'pause' ? "bg-[#D97706]" : "bg-[#E0E0E0]")} />
            Paused
         </button>
         <button 
            onClick={() => setMode('maintenance')}
            className={cn(
               "px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all",
               mode === 'maintenance' ? "bg-[#F3F4F6] text-[#4B5563] shadow-sm" : "text-[#757575] hover:bg-[#F5F5F5]"
            )}
         >
            <div className={cn("w-2 h-2 rounded-full", mode === 'maintenance' ? "bg-[#4B5563]" : "bg-[#E0E0E0]")} />
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
         <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm">
            <div className="flex items-start gap-4 mb-6">
               <div className="p-3 bg-[#E6F7FF] text-[#1677FF] rounded-lg">
                  <Printer size={24} />
               </div>
               <div>
                  <h3 className="text-lg font-bold text-[#212121]">Label Manager</h3>
                  <p className="text-sm text-[#757575]">Reprint SKU barcodes and shelf tags.</p>
               </div>
            </div>
            
            <div className="space-y-4">
               <div>
                  <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">Search SKU / Bin</label>
                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
                     <input 
                        type="text" 
                        placeholder="e.g. SKU-9921 or Bin A-12" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleGenerateLabel()}
                        className="w-full pl-10 pr-4 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:border-[#1677FF] focus:outline-none"
                     />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">Label Type</label>
                     <select 
                        value={labelType}
                        onChange={(e) => setLabelType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:border-[#1677FF] focus:outline-none bg-white"
                     >
                        <option value="item_barcode">Item Barcode (Standard)</option>
                        <option value="shelf_edge_label">Shelf Edge Label</option>
                        <option value="bin_location_tag">Bin Location Tag</option>
                        <option value="pallet_id">Pallet ID</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">Quantity</label>
                     <input 
                        type="number" 
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        min={1}
                        className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:border-[#1677FF] focus:outline-none"
                     />
                  </div>
               </div>

               <button 
                  onClick={handleGenerateLabel}
                  disabled={generating}
                  className="w-full py-2.5 bg-[#212121] text-white rounded-lg font-bold text-sm hover:bg-[#424242] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
         <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm">
            <div className="flex items-start gap-4 mb-6">
               <div className="p-3 bg-[#F0FDF4] text-[#16A34A] rounded-lg">
                  <Database size={24} />
               </div>
               <div>
                  <h3 className="text-lg font-bold text-[#212121]">Bulk SKU Upload</h3>
                  <p className="text-sm text-[#757575]">Update inventory via CSV/Excel.</p>
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
                  uploading ? "border-[#1677FF] bg-[#F0F7FF]" : "border-[#E0E0E0] hover:bg-[#FAFAFA]"
               )}
            >
               {uploading ? (
                  <>
                     <Loader2 size={24} className="animate-spin text-[#1677FF] mb-3" />
                     <h4 className="font-bold text-[#212121] mb-1">Uploading...</h4>
                     <p className="text-xs text-[#757575]">Please wait</p>
                  </>
               ) : (
                  <>
                     <div className="p-4 bg-[#F5F5F5] rounded-full text-[#9E9E9E] group-hover:bg-[#E6F7FF] group-hover:text-[#1677FF] transition-colors mb-3">
                        <Upload size={24} />
                     </div>
                     <h4 className="font-bold text-[#212121] mb-1">Click to upload or drag & drop</h4>
                     <p className="text-xs text-[#757575] max-w-[200px]">
                        Supported formats: .CSV, .XLSX. Max file size: 10MB.
                     </p>
                  </>
               )}
            </div>

            <div className="mt-4 flex justify-between items-center">
               <button 
                  onClick={handleDownloadTemplate}
                  className="text-xs font-bold text-[#1677FF] flex items-center gap-1 hover:underline"
               >
                  <Download size={12} /> Download Template
               </button>
               <span className="text-[10px] text-[#9E9E9E]">
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
            toast.error('Failed to load system status');
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
            toast.success('Database re-index started. Estimated completion: 15 minutes');
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
            toast.success(`Global sync completed! ${response.recordsPushed} records pushed.`);
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

   return (
      <div className="space-y-6">
         {loading && !systemStatus ? (
            <div className="flex items-center justify-center h-32">
               <Loader2 size={24} className="animate-spin text-[#1677FF]" />
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {systemStatus?.services?.map((service: any, i: number) => (
                  <StatusCard 
                     key={i}
                     title={service.name} 
                     status={getStatusDisplay(service.status)} 
                     latency={`${service.latency}ms`}
                     icon={service.name.includes('Inventory') ? Cloud : service.name.includes('Order') ? Server : Shield}
                     color={service.status === 'operational' ? "text-[#16A34A]" : service.status === 'degraded' ? "text-[#F59E0B]" : "text-[#EF4444]"}
                     bg={service.status === 'operational' ? "bg-[#DCFCE7]" : service.status === 'degraded' ? "bg-[#FEF3C7]" : "bg-[#FEE2E2]"}
                  />
               ))}
            </div>
         )}

         <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm p-6">
            <h3 className="font-bold text-[#212121] mb-6">Synchronization Diagnostics</h3>
            
            <div className="space-y-6">
               <div className="flex items-center justify-between p-4 border border-[#F0F0F0] rounded-lg bg-[#FAFAFA]">
                  <div className="flex items-center gap-4">
                     <div className="p-2 bg-white border border-[#E0E0E0] rounded-lg">
                        <Database size={20} className="text-[#616161]" />
                     </div>
                     <div>
                        <div className="text-sm font-bold text-[#212121]">Main Database Re-index</div>
                        <div className="text-xs text-[#757575]">
                           {lastDiagnostic ? `Last run: ${lastDiagnostic}` : 'Not run yet'}
                        </div>
                     </div>
                  </div>
                  <button 
                     onClick={handleRunDiagnostics}
                     disabled={runningDiagnostic}
                     className="px-3 py-1.5 border border-[#E0E0E0] bg-white text-[#212121] rounded text-xs font-bold hover:bg-[#F5F5F5] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

               <div className="flex items-center justify-between p-4 border border-[#F0F0F0] rounded-lg bg-[#FAFAFA]">
                  <div className="flex items-center gap-4">
                     <div className="p-2 bg-white border border-[#E0E0E0] rounded-lg">
                        <RefreshCw size={20} className={cn("text-[#616161]", syncing && "animate-spin")} />
                     </div>
                     <div>
                        <div className="text-sm font-bold text-[#212121]">Force Global Sync</div>
                        <div className="text-xs text-[#757575]">
                           {lastSync ? `Last sync: ${lastSync}` : 'Push all local changes to cloud'}
                        </div>
                     </div>
                  </div>
                  <button 
                     onClick={handleForceSync}
                     disabled={syncing}
                     className="px-3 py-1.5 bg-[#1677FF] text-white rounded text-xs font-bold hover:bg-[#409EFF] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

function StatusCard({ title, status, latency, icon: Icon, color, bg }: any) {
   return (
      <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm flex items-center justify-between">
         <div>
            <h4 className="text-[#757575] text-xs font-bold uppercase tracking-wider">{title}</h4>
            <div className="flex items-center gap-2 mt-1">
               <div className={cn("w-2 h-2 rounded-full", status === 'Operational' ? "bg-[#16A34A]" : status === 'Degraded' ? "bg-[#F59E0B]" : "bg-[#EF4444]")} />
               <span className="font-bold text-[#212121]">{status}</span>
            </div>
            <p className="text-xs text-[#9E9E9E] mt-1">{latency} latency</p>
         </div>
         <div className={cn("p-3 rounded-full", bg, color)}>
            <Icon size={24} />
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
      <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden h-[600px]">
         <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-between">
            <h3 className="font-bold text-[#212121]">System Audit Trail</h3>
            <div className="flex gap-2">
               <button 
                  onClick={handleExportCSV}
                  disabled={exporting || logs.length === 0}
                  className="px-3 py-1.5 border border-[#E0E0E0] rounded text-xs font-bold bg-white text-[#212121] hover:bg-[#F5F5F5] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  <Loader2 size={24} className="animate-spin text-[#1677FF]" />
               </div>
            ) : logs.length === 0 ? (
               <div className="flex items-center justify-center h-full text-[#757575]">
                  No audit logs found
               </div>
            ) : (
               <table className="w-full text-left text-sm">
                  <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0] sticky top-0">
                     <tr>
                        <th className="px-6 py-3 font-medium">Timestamp</th>
                        <th className="px-6 py-3 font-medium">User</th>
                        <th className="px-6 py-3 font-medium">Module</th>
                        <th className="px-6 py-3 font-medium">Action</th>
                        <th className="px-6 py-3 font-medium">Details</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                     {logs.map((log, i) => (
                        <tr key={i} className="hover:bg-[#F9FAFB]">
                           <td className="px-6 py-3 text-[#616161] font-mono text-xs">
                              {formatTime(log.timestamp)}
                           </td>
                           <td className="px-6 py-3 font-medium text-[#212121]">{log.userName || log.userId}</td>
                           <td className="px-6 py-3 text-[#616161]">
                              <span className="px-2 py-0.5 bg-[#F5F5F5] rounded text-[10px] font-bold uppercase">
                                 {log.module}
                              </span>
                           </td>
                           <td className="px-6 py-3 font-bold text-[#212121]">{log.action}</td>
                           <td className="px-6 py-3 text-[#616161]">{log.details}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            )}
         </div>
      </div>
   )
}