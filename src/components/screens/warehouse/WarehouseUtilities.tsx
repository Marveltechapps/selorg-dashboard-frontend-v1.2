import React, { useState, useEffect } from 'react';
import { Upload, Tag, RefreshCw, Printer, Database, X, Download, CheckCircle2, FileUp } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { EmptyState } from '../../ui/ux-components';
import { toast } from 'sonner';
import { fetchAccessLogs, bulkUploadSKUs, generateRackLabels as apiGenerateLabels, processBinReassignment as apiReassignBins, fetchWarehouseZones, AccessLog } from './warehouseApi';

export function WarehouseUtilities() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const [labelConfig, setLabelConfig] = useState({
    startLocation: '',
    endLocation: '',
    format: 'standard',
  });

  const [reassignConfig, setReassignConfig] = useState({
    fromZone: '',
    toZone: '',
    skuFilter: '',
  });

  const [barcodeConfig, setBarcodeConfig] = useState({
    sku: '',
    quantity: '1',
  });

  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [zones, setZones] = useState<string[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);

  useEffect(() => {
    if (showLogsModal) {
      loadLogs();
      const interval = setInterval(loadLogs, 10000);
      return () => clearInterval(interval);
    }
  }, [showLogsModal]);

  useEffect(() => {
    if (showReassignModal) {
      loadZones();
    }
  }, [showReassignModal]);

  const loadZones = async () => {
    try {
      setZonesLoading(true);
      const data = await fetchWarehouseZones();
      setZones(data ?? []);
    } catch {
      setZones([]);
    } finally {
      setZonesLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const data = await fetchAccessLogs();
      setLogs(data ?? []);
    } catch (error) {
      toast.error('Failed to load access logs');
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const processUpload = async () => {
    if (!uploadFile) return;
    
    setUploadStatus('uploading');
    try {
      const result = await bulkUploadSKUs(uploadFile);
      setUploadStatus('success');
      const imported = result?.imported ?? 0;
      toast.success(`Bulk upload successful. Imported ${imported} SKU(s).`);
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadStatus('idle');
      }, 2000);
    } catch (error) {
      setUploadStatus('error');
      toast.error(error instanceof Error ? error.message : 'Bulk upload failed');
    }
  };

  const generateLabels = async () => {
    if (labelConfig.startLocation && labelConfig.endLocation) {
      try {
        await apiGenerateLabels(labelConfig);
        toast.success(`Generating labels for ${labelConfig.startLocation} to ${labelConfig.endLocation}...`);
        setShowLabelModal(false);
        setLabelConfig({ startLocation: '', endLocation: '', format: 'standard' });
      } catch (error) {
        toast.error('Failed to generate labels');
      }
    }
  };

  const processReassignment = async () => {
    if (reassignConfig.fromZone && reassignConfig.toZone) {
      try {
        await apiReassignBins(reassignConfig);
        toast.success(`Moving stock from ${reassignConfig.fromZone} to ${reassignConfig.toZone}...`);
        setShowReassignModal(false);
        setReassignConfig({ fromZone: '', toZone: '', skuFilter: '' });
      } catch (error) {
        toast.error('Failed to process reassignment');
      }
    }
  };

  const printBarcodes = () => {
    if (barcodeConfig.sku) {
      alert(`Printing ${barcodeConfig.quantity} barcodes for ${barcodeConfig.sku}...`);
      setShowBarcodeModal(false);
      setBarcodeConfig({ sku: '', quantity: '1' });
    }
  };

  const exportLogs = () => {
    const today = new Date().toISOString().split('T')[0];
    const csvData = [
      ['Access Logs Report', `Date: ${today}`],
      [''],
      ['User', 'Action', 'Details', 'Timestamp'],
      ...logs.map(l => [l.user, l.action, l.details, l.timestamp]),
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `access-logs-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilities & Manager Tools"
        subtitle="System tools for bulk operations, labeling, and data management"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => setShowUploadModal(true)}
          className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center text-center group"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-[#64748B] group-hover:bg-[#0891b2] group-hover:text-white transition-colors">
            <Upload size={32} />
          </div>
          <h3 className="font-bold text-[#1E293B] mb-1">Bulk SKU Upload</h3>
          <p className="text-sm text-[#64748B]">Import product data via CSV.</p>
        </div>

        <div 
          onClick={() => setShowLabelModal(true)}
          className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center text-center group"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-[#64748B] group-hover:bg-[#0891b2] group-hover:text-white transition-colors">
            <Tag size={32} />
          </div>
          <h3 className="font-bold text-[#1E293B] mb-1">Rack Label Manager</h3>
          <p className="text-sm text-[#64748B]">Generate and print location barcodes.</p>
        </div>

        <div 
          onClick={() => setShowReassignModal(true)}
          className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center text-center group"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-[#64748B] group-hover:bg-[#0891b2] group-hover:text-white transition-colors">
            <RefreshCw size={32} />
          </div>
          <h3 className="font-bold text-[#1E293B] mb-1">Bin Reassignment</h3>
          <p className="text-sm text-[#64748B]">Mass move stock between zones.</p>
        </div>

        <div 
          onClick={() => setShowBarcodeModal(true)}
          className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center text-center group"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-[#64748B] group-hover:bg-[#0891b2] group-hover:text-white transition-colors">
            <Printer size={32} />
          </div>
          <h3 className="font-bold text-[#1E293B] mb-1">Barcode Reprint</h3>
          <p className="text-sm text-[#64748B]">Replace damaged or missing labels.</p>
        </div>

        <div 
          onClick={() => setShowLogsModal(true)}
          className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center text-center group"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-[#64748B] group-hover:bg-[#0891b2] group-hover:text-white transition-colors">
            <Database size={32} />
          </div>
          <h3 className="font-bold text-[#1E293B] mb-1">Access Logs</h3>
          <p className="text-sm text-[#64748B]">View system usage and security trails.</p>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Bulk SKU Upload</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {uploadStatus === 'idle' && (
                <>
                  <div className="border-2 border-dashed border-[#E2E8F0] rounded-lg p-8 text-center">
                    <FileUp className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
                    <p className="text-sm text-[#64748B] mb-4">
                      {uploadFile ? uploadFile.name : 'Drop CSV file here or click to browse'}
                    </p>
                    <input 
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label 
                      htmlFor="csv-upload"
                      className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] cursor-pointer inline-block"
                    >
                      Choose File
                    </label>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-900 font-medium mb-1">CSV Format Required:</p>
                    <p className="text-xs text-blue-700">SKU, Name, Category, Price, Quantity</p>
                  </div>
                </>
              )}
              {uploadStatus === 'uploading' && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-4 border-[#0891b2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-sm text-[#64748B]">Uploading and processing...</p>
                </div>
              )}
              {uploadStatus === 'success' && (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <p className="text-sm font-bold text-green-600">Upload Successful!</p>
                </div>
              )}
            </div>
            {uploadStatus === 'idle' && (
              <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button 
                  onClick={processUpload}
                  disabled={!uploadFile}
                  className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Label Manager Modal */}
      {showLabelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Generate Rack Labels</h3>
              <button onClick={() => setShowLabelModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Start Location</label>
                <input 
                  type="text"
                  placeholder="e.g., A-1"
                  value={labelConfig.startLocation}
                  onChange={(e) => setLabelConfig({...labelConfig, startLocation: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">End Location</label>
                <input 
                  type="text"
                  placeholder="e.g., A-24"
                  value={labelConfig.endLocation}
                  onChange={(e) => setLabelConfig({...labelConfig, endLocation: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Label Format</label>
                <select 
                  value={labelConfig.format}
                  onChange={(e) => setLabelConfig({...labelConfig, format: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="standard">Standard (40x20mm)</option>
                  <option value="large">Large (60x40mm)</option>
                  <option value="qr">QR Code</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowLabelModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={generateLabels}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Generate Labels
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bin Reassignment Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Bin Reassignment</h3>
              <button onClick={() => setShowReassignModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">From Zone</label>
                <select 
                  value={reassignConfig.fromZone}
                  onChange={(e) => setReassignConfig({...reassignConfig, fromZone: e.target.value})}
                  disabled={zonesLoading}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2] disabled:opacity-60"
                >
                  <option value="">{zonesLoading ? 'Loading zones...' : 'Select zone'}</option>
                  {zones.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">To Zone</label>
                <select 
                  value={reassignConfig.toZone}
                  onChange={(e) => setReassignConfig({...reassignConfig, toZone: e.target.value})}
                  disabled={zonesLoading}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2] disabled:opacity-60"
                >
                  <option value="">{zonesLoading ? 'Loading zones...' : 'Select zone'}</option>
                  {zones.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">SKU Filter (Optional)</label>
                <input 
                  type="text"
                  placeholder="Leave empty for all SKUs"
                  value={reassignConfig.skuFilter}
                  onChange={(e) => setReassignConfig({...reassignConfig, skuFilter: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-900 font-medium">⚠️ This operation will move all matching inventory</p>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowReassignModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={processReassignment}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Process Reassignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Reprint Modal */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Barcode Reprint</h3>
              <button onClick={() => setShowBarcodeModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">SKU</label>
                <input 
                  type="text"
                  placeholder="Enter SKU"
                  value={barcodeConfig.sku}
                  onChange={(e) => setBarcodeConfig({...barcodeConfig, sku: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Quantity</label>
                <input 
                  type="number"
                  min="1"
                  value={barcodeConfig.quantity}
                  onChange={(e) => setBarcodeConfig({...barcodeConfig, quantity: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowBarcodeModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={printBarcodes}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Print Barcodes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Access Logs</h3>
              <div className="flex gap-3">
                <button 
                  onClick={exportLogs}
                  className="px-3 py-1.5 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC] flex items-center gap-2 text-sm"
                >
                  <Download size={14} />
                  Export
                </button>
                <button onClick={() => setShowLogsModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 max-h-[500px] overflow-y-auto">
              {logsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891b2]" />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-[#64748B] text-sm">No access logs found</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0] sticky top-0">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Details</th>
                      <th className="px-4 py-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3 font-medium text-[#1E293B]">{log.user}</td>
                        <td className="px-4 py-3 text-[#64748B]">{log.action}</td>
                        <td className="px-4 py-3 text-[#64748B]">{log.details}</td>
                        <td className="px-4 py-3 text-xs text-[#94A3B8] font-mono">{log.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}