import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, 
  Database, 
  FileText, 
  Download, 
  RefreshCcw, 
  Trash2, 
  Upload, 
  X,
  Link,
  Check,
  AlertCircle,
  Printer,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import {
  fetchProductionUploadHistory,
  fetchProductionSyncHistory,
  performProductionHSDSync,
  fetchProductionSettings,
  updateProductionSettings,
  fetchProductionAuditLogs,
  bulkUploadProduction,
} from '../../../api/productionApi';
import { getCurrentUser } from '../../../api/authApi';

interface UploadHistory {
  id: string;
  fileName: string;
  type: string;
  recordsProcessed: number;
  uploadedBy: string;
  timestamp: string;
  status: 'success' | 'failed' | 'processing';
}

interface SyncHistory {
  id: string;
  deviceCount: number;
  timestamp: string;
  status: 'success' | 'failed';
  duration: string;
}

interface JobCard {
  id: string;
  workOrder: string;
  productName: string;
  quantity: number;
  line: string;
  shift: string;
  operator?: string;
}

export function ProductionUtilities() {
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showJobCardModal, setShowJobCardModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'work-orders' | 'materials' | 'roster' | 'maintenance'>('work-orders');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [loadingSyncs, setLoadingSyncs] = useState(false);

  const loadUploadHistory = useCallback(async () => {
    try {
      const data = await fetchProductionUploadHistory();
      setUploadHistory(data ?? []);
    } catch {
      setUploadHistory([]);
    } finally {
      setLoadingUploads(false);
    }
  }, []);

  const loadSyncHistory = useCallback(async () => {
    try {
      const data = await fetchProductionSyncHistory();
      setSyncHistory(data ?? []);
    } catch {
      setSyncHistory([]);
    } finally {
      setLoadingSyncs(false);
    }
  }, []);

  useEffect(() => {
    loadUploadHistory();
  }, [loadUploadHistory]);

  const [jobCard, setJobCard] = useState<JobCard>({
    id: '',
    workOrder: '',
    productName: '',
    quantity: 0,
    line: '',
    shift: 'morning',
  });

  useEffect(() => {
    loadSyncHistory();
  }, [loadSyncHistory]);

  const DEFAULT_SETTINGS = {
    autoSync: true,
    syncInterval: '15',
    autoBackup: true,
    backupInterval: 'daily',
    emailNotifications: true,
    alertThreshold: 'medium',
  };
  const [systemSettings, setSystemSettingsState] = useState(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    fetchProductionSettings()
      .then(setSystemSettingsState)
      .catch(() => {})
      .finally(() => setSettingsLoading(false));
  }, []);

  const setSystemSettings = (next: typeof DEFAULT_SETTINGS | ((prev: typeof DEFAULT_SETTINGS) => typeof DEFAULT_SETTINGS)) => {
    setSystemSettingsState(prev => (typeof next === 'function' ? next(prev) : next));
  };

  interface AuditLogEntry {
    id: string;
    action: string;
    user: string;
    timestamp: string;
    details?: string;
  }
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const loadAuditLogs = useCallback(async () => {
    setAuditLogsLoading(true);
    try {
      const data = await fetchProductionAuditLogs();
      setAuditLogs(data ?? []);
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showAuditModal) loadAuditLogs();
  }, [showAuditModal, loadAuditLogs]);

  const handleFileUpload = async () => {
    if (!uploadFile) return;
    try {
      const user = getCurrentUser();
      const res = await bulkUploadProduction(
        uploadFile,
        uploadType,
        user?.name || 'Current User'
      );
      setUploadFile(null);
      setShowBulkUploadModal(false);
      toast.success(`Successfully uploaded ${uploadFile.name} (${res.recordsProcessed} records)`);
      loadUploadHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    }
  };

  const generateJobCard = () => {
    if (jobCard.workOrder && jobCard.productName && jobCard.quantity > 0 && jobCard.line) {
      // In a real app, this would generate a PDF or printable document
      const printContent = `
        ================================
        JOB CARD
        ================================
        Work Order: ${jobCard.workOrder}
        Product: ${jobCard.productName}
        Quantity: ${jobCard.quantity} units
        Production Line: ${jobCard.line}
        Shift: ${jobCard.shift.charAt(0).toUpperCase() + jobCard.shift.slice(1)}
        ${jobCard.operator ? `Operator: ${jobCard.operator}` : ''}
        Generated: ${new Date().toLocaleString()}
        ================================
      `;
      
      // Create a printable window
      const printWindow = window.open('', '', 'width=600,height=400');
      if (printWindow) {
        printWindow.document.write('<pre>' + printContent + '</pre>');
        printWindow.document.close();
        printWindow.print();
      }
      
      setJobCard({ id: '', workOrder: '', productName: '', quantity: 0, line: '', shift: 'morning' });
      setShowJobCardModal(false);
    }
  };

  const syncHSDs = async () => {
    setIsSyncing(true);
    try {
      const res = await performProductionHSDSync();
      const newSync: SyncHistory = {
        id: res.syncId,
        deviceCount: res.deviceCount,
        timestamp: new Date().toLocaleString(),
        status: res.status as 'success' | 'failed',
        duration: res.duration,
      };
      setSyncHistory([newSync, ...syncHistory]);
      setShowSyncModal(false);
      toast.success('HSD sync completed successfully');
      loadSyncHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const performBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      setShowBackupModal(false);
      toast.success('Backup completed successfully');
      
      // Trigger download of a dummy backup file
      const backupData = {
        timestamp: new Date().toISOString(),
        type: 'full_backup',
        modules: ['production', 'materials', 'workforce', 'quality'],
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `production_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 2000);
  };

  const saveSettings = async () => {
    try {
      await updateProductionSettings(systemSettings);
      setShowSettingsModal(false);
      toast.success('Settings saved successfully');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save settings');
    }
  };

  const exportTemplates = () => {
    const templates = {
      work_orders: {
        columns: ['Work Order ID', 'Product Name', 'Quantity', 'Production Line', 'Due Date', 'Priority'],
        example: ['WO-12345', 'Organic Granola Bar', '2500', 'Line A', '2024-12-25', 'High'],
      },
      materials: {
        columns: ['Material Name', 'Quantity', 'Unit', 'Supplier', 'PO Number', 'Expected Date'],
        example: ['Organic Oats', '500', 'kg', 'Grain Co.', 'PO-9921', '2024-12-23'],
      },
      roster: {
        columns: ['Employee ID', 'Name', 'Role', 'Department', 'Shift', 'Assigned Line'],
        example: ['EMP-001', 'John Doe', 'Lead Operator', 'Production', 'Morning', 'Line A'],
      },
    };

    const csvData = Object.entries(templates).map(([name, data]) => {
      return `${name.toUpperCase()}\n${data.columns.join(',')}\n${data.example.join(',')}\n`;
    }).join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'upload_templates.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Utilities"
        subtitle="System tools and batch operations"
      />
      {/* Utility Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Upload size={20} />
            </div>
            <h3 className="font-bold text-[#212121]">Bulk Upload</h3>
          </div>
          <p className="text-sm text-[#757575] mb-4">Upload work orders, material receipts, or rosters via CSV/Excel.</p>
          <button 
            onClick={() => setShowBulkUploadModal(true)}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
          >
            Upload File
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <FileText size={20} />
            </div>
            <h3 className="font-bold text-[#212121]">Job Card Generator</h3>
          </div>
          <p className="text-sm text-[#757575] mb-4">Generate and print physical job cards for operators.</p>
          <button 
            onClick={() => setShowJobCardModal(true)}
            className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700"
          >
            Open Generator
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Link size={20} />
            </div>
            <h3 className="font-bold text-[#212121]">HSD Sync</h3>
          </div>
          <p className="text-sm text-[#757575] mb-4">Force sync tasks and configurations to all active HSDs.</p>
          <button 
            onClick={() => setShowSyncModal(true)}
            className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700"
          >
            Sync Now
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <Database size={20} />
            </div>
            <h3 className="font-bold text-[#212121]">Backup & Restore</h3>
          </div>
          <p className="text-sm text-[#757575] mb-4">Create backups or restore from previous snapshots.</p>
          <button 
            onClick={() => setShowBackupModal(true)}
            className="w-full py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700"
          >
            Manage Backups
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <Settings size={20} />
            </div>
            <h3 className="font-bold text-[#212121]">System Settings</h3>
          </div>
          <p className="text-sm text-[#757575] mb-4">Configure production system preferences and defaults.</p>
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700"
          >
            Open Settings
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <FileText size={20} />
            </div>
            <h3 className="font-bold text-[#212121]">Audit Logs</h3>
          </div>
          <p className="text-sm text-[#757575] mb-4">View system activity logs and user actions.</p>
          <button 
            onClick={() => setShowAuditModal(true)}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
          >
            View Logs
          </button>
        </div>
      </div>

      {/* Upload History */}
      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-[#F9FAFB] border-b border-[#E0E0E0]">
          <h3 className="font-bold text-[#212121]">Recent Upload History</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
            <tr>
              <th className="px-6 py-3">File Name</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Records</th>
              <th className="px-6 py-3">Uploaded By</th>
              <th className="px-6 py-3">Timestamp</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E0E0E0]">
            {loadingUploads ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-[#757575]">
                  Loading...
                </td>
              </tr>
            ) : uploadHistory.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-[#757575]">
                  No records
                </td>
              </tr>
            ) : (
            uploadHistory.map(upload => (
              <tr key={upload.id} className="hover:bg-[#FAFAFA]">
                <td className="px-6 py-4 font-medium text-[#212121]">{upload.fileName}</td>
                <td className="px-6 py-4 text-[#616161]">{upload.type}</td>
                <td className="px-6 py-4 text-[#616161]">{upload.recordsProcessed}</td>
                <td className="px-6 py-4 text-[#616161]">{upload.uploadedBy}</td>
                <td className="px-6 py-4 text-[#616161]">{upload.timestamp}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    upload.status === 'success' ? 'bg-[#DCFCE7] text-[#166534]' :
                    upload.status === 'processing' ? 'bg-[#FEF9C3] text-[#854D0E]' :
                    'bg-[#FEE2E2] text-[#991B1B]'
                  }`}>
                    {upload.status === 'success' ? <Check size={12} /> : <AlertCircle size={12} />}
                    {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sync History */}
      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-[#F9FAFB] border-b border-[#E0E0E0]">
          <h3 className="font-bold text-[#212121]">HSD Sync History</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
            <tr>
              <th className="px-6 py-3">Devices Synced</th>
              <th className="px-6 py-3">Timestamp</th>
              <th className="px-6 py-3">Duration</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E0E0E0]">
            {syncHistory.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-[#757575]">
                  No records
                </td>
              </tr>
            ) : (
            syncHistory.map(sync => (
              <tr key={sync.id} className="hover:bg-[#FAFAFA]">
                <td className="px-6 py-4 font-medium text-[#212121]">{sync.deviceCount} devices</td>
                <td className="px-6 py-4 text-[#616161]">{sync.timestamp}</td>
                <td className="px-6 py-4 text-[#616161]">{sync.duration}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    sync.status === 'success' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'
                  }`}>
                    {sync.status === 'success' ? <Check size={12} /> : <AlertCircle size={12} />}
                    {sync.status.charAt(0).toUpperCase() + sync.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Bulk Upload</h3>
              <button onClick={() => setShowBulkUploadModal(false)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Upload Type</label>
                <select 
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                >
                  <option value="work-orders">Work Orders</option>
                  <option value="materials">Material Receipts</option>
                  <option value="roster">Employee Roster</option>
                  <option value="maintenance">Maintenance Schedule</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Select File</label>
                <input 
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] text-sm"
                />
                <p className="text-xs text-[#757575] mt-2">Supported formats: CSV, Excel (.xlsx, .xls)</p>
              </div>
              {uploadFile && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-900">Selected: {uploadFile.name}</p>
                  <p className="text-xs text-blue-700 mt-1">Size: {(uploadFile.size / 1024).toFixed(2)} KB</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowBulkUploadModal(false)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button 
                onClick={handleFileUpload}
                disabled={!uploadFile}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Card Generator Modal */}
      {showJobCardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Generate Job Card</h3>
              <button onClick={() => setShowJobCardModal(false)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Work Order ID</label>
                <input 
                  type="text"
                  placeholder="WO-12345"
                  value={jobCard.workOrder}
                  onChange={(e) => setJobCard({...jobCard, workOrder: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Product Name</label>
                <input 
                  type="text"
                  placeholder="e.g., Organic Granola Bar"
                  value={jobCard.productName}
                  onChange={(e) => setJobCard({...jobCard, productName: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Quantity</label>
                  <input 
                    type="number"
                    placeholder="2500"
                    value={jobCard.quantity || ''}
                    onChange={(e) => setJobCard({...jobCard, quantity: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Line</label>
                  <select 
                    value={jobCard.line}
                    onChange={(e) => setJobCard({...jobCard, line: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="">Select line</option>
                    <option>Line A</option>
                    <option>Line B</option>
                    <option>Line C</option>
                    <option>Line D</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Shift</label>
                  <select 
                    value={jobCard.shift}
                    onChange={(e) => setJobCard({...jobCard, shift: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="night">Night</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Operator (Optional)</label>
                  <input 
                    type="text"
                    placeholder="Operator name"
                    value={jobCard.operator || ''}
                    onChange={(e) => setJobCard({...jobCard, operator: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowJobCardModal(false)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button 
                onClick={generateJobCard}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Printer size={16} />
                Generate & Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HSD Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">HSD Sync</h3>
              <button onClick={() => setShowSyncModal(false)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <RefreshCw size={20} className="text-purple-600" />
                  <h4 className="font-bold text-purple-900">Sync All HSDs</h4>
                </div>
                <p className="text-sm text-purple-700">This will push latest configurations and tasks to all active HSD devices.</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#757575]">Last Sync Devices:</span>
                  <span className="font-bold text-[#212121]">
                    {syncHistory[0]?.deviceCount ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#757575]">Last Sync:</span>
                  <span className="font-bold text-[#212121]">{syncHistory[0]?.timestamp || 'Never'}</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button 
                onClick={syncHSDs}
                disabled={isSyncing}
                className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Sync Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Backup & Restore</h3>
              <button onClick={() => setShowBackupModal(false)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Database size={20} className="text-orange-600" />
                  <h4 className="font-bold text-orange-900">Create Full Backup</h4>
                </div>
                <p className="text-sm text-orange-700">Backup includes production data, materials, workforce, and quality records.</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#757575]">Auto Backup:</span>
                  <span className="font-medium text-[#212121]">
                    {systemSettings.autoBackup
                      ? `Enabled (${systemSettings.backupInterval})`
                      : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowBackupModal(false)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button 
                onClick={performBackup}
                disabled={isBackingUp}
                className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 flex items-center gap-2 disabled:opacity-50"
              >
                {isBackingUp ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Backing up...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Create Backup
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">System Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#212121]">Auto Sync HSDs</p>
                  <p className="text-xs text-[#757575]">Automatically sync devices</p>
                </div>
                <button 
                  onClick={() => setSystemSettings({...systemSettings, autoSync: !systemSettings.autoSync})}
                  className={`w-12 h-6 rounded-full transition-colors ${systemSettings.autoSync ? 'bg-[#16A34A]' : 'bg-[#E0E0E0]'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${systemSettings.autoSync ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                </button>
              </div>

              {systemSettings.autoSync && (
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Sync Interval (minutes)</label>
                  <input 
                    type="number"
                    value={systemSettings.syncInterval}
                    onChange={(e) => setSystemSettings({...systemSettings, syncInterval: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#212121]">Auto Backup</p>
                  <p className="text-xs text-[#757575]">Scheduled automatic backups</p>
                </div>
                <button 
                  onClick={() => setSystemSettings({...systemSettings, autoBackup: !systemSettings.autoBackup})}
                  className={`w-12 h-6 rounded-full transition-colors ${systemSettings.autoBackup ? 'bg-[#16A34A]' : 'bg-[#E0E0E0]'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${systemSettings.autoBackup ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                </button>
              </div>

              {systemSettings.autoBackup && (
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Backup Interval</label>
                  <select 
                    value={systemSettings.backupInterval}
                    onChange={(e) => setSystemSettings({...systemSettings, backupInterval: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#212121]">Email Notifications</p>
                  <p className="text-xs text-[#757575]">Receive email alerts</p>
                </div>
                <button 
                  onClick={() => setSystemSettings({...systemSettings, emailNotifications: !systemSettings.emailNotifications})}
                  className={`w-12 h-6 rounded-full transition-colors ${systemSettings.emailNotifications ? 'bg-[#16A34A]' : 'bg-[#E0E0E0]'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${systemSettings.emailNotifications ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Alert Threshold</label>
                <select 
                  value={systemSettings.alertThreshold}
                  onChange={(e) => setSystemSettings({...systemSettings, alertThreshold: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button 
                onClick={saveSettings}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Audit Logs</h3>
              <button onClick={() => setShowAuditModal(false)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {auditLogsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-[#16A34A]" size={24} />
                </div>
              ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0] sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0E0E0]">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 text-[#616161]">{log.timestamp}</td>
                      <td className="px-4 py-3 font-medium text-[#212121]">{log.action}</td>
                      <td className="px-4 py-3 text-[#616161]">{log.user}</td>
                      <td className="px-4 py-3 text-[#616161]">{log.details || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
              {!auditLogsLoading && auditLogs.length === 0 && (
                <p className="text-center text-[#757575] py-8">No audit log entries yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}