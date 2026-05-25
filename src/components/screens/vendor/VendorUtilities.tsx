import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, CheckCircle2, FileUp, Download } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { TableSkeleton } from '../../ui/ux-components';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { toast } from 'sonner';
import {
  fetchUploadHistory,
  bulkUploadVendors,
  downloadBulkUploadTemplate,
  VENDOR_BULK_UPLOAD_COLUMNS,
  type UploadHistory,
  type BulkUploadRowError,
} from '../../../api/vendor/vendorUtilities.api';
import { useOnDashboardRefresh, DASHBOARD_TOPICS } from '../../../hooks/useDashboardRefresh';

export function VendorUtilities() {
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [uploadHistoryLoading, setUploadHistoryLoading] = useState(false);
  const [uploadHistoryError, setUploadHistoryError] = useState<string | null>(null);
  const [lastUploadErrors, setLastUploadErrors] = useState<BulkUploadRowError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const loadUploadHistory = useCallback(async () => {
    setUploadHistoryLoading(true);
    setUploadHistoryError(null);
    try {
      const data = await fetchUploadHistory(20);
      setUploadHistory(data ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load upload history';
      setUploadHistoryError(msg);
      setUploadHistory([]);
    } finally {
      setUploadHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUploadHistory();
  }, [loadUploadHistory]);

  useOnDashboardRefresh(DASHBOARD_TOPICS.vendor, () => {
    void loadUploadHistory();
  });

  const handleOpenBulkUploadModal = () => {
    setShowBulkUploadModal(true);
    setLastUploadErrors([]);
  };

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (
      !allowedTypes.includes(file.type) &&
      !file.name.endsWith('.csv') &&
      !file.name.endsWith('.xlsx') &&
      !file.name.endsWith('.xls')
    ) {
      toast.error('Invalid file type. Please upload CSV or Excel files only.');
      return;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit.');
      return;
    }
    setUploadFile(file);
    toast.success('File selected: ' + file.name);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadBulkUploadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vendor-bulk-upload-template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to download template';
      toast.error(msg);
    }
  };

  const processUpload = async () => {
    if (!uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }
    setUploadStatus('uploading');
    setLastUploadErrors([]);
    try {
      const res = await bulkUploadVendors(uploadFile);
      setLastUploadErrors(res.errors ?? []);
      if (res.failedRows > 0) {
        toast.warning(res.message);
      } else {
        toast.success(res.message);
      }
      setUploadFile(null);
      setUploadStatus('success');
      await loadUploadHistory();
      setTimeout(() => {
        setShowBulkUploadModal(false);
        setUploadStatus('idle');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, res.failedRows > 0 ? 3000 : 1500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      toast.error(msg);
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilities & Vendor Tools"
        subtitle="Bulk import vendors using the official vendor schema"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-xl">
        <div
          onClick={handleOpenBulkUploadModal}
          className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center text-center group"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-[#757575] group-hover:bg-[#4F46E5] group-hover:text-white transition-colors">
            <Upload size={32} />
          </div>
          <h3 className="font-bold text-[#212121]">Bulk Vendor Upload</h3>
          <p className="text-sm text-[#757575] mt-1">
            Import vendors via CSV/Excel matching the MongoDB vendor schema.
          </p>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm">
        <div className="px-6 py-4 border-b border-[#E0E0E0] flex items-center justify-between">
          <h3 className="font-bold text-[#212121]">Upload History</h3>
          <button
            type="button"
            onClick={() => void loadUploadHistory()}
            disabled={uploadHistoryLoading}
            className="text-sm text-[#4F46E5] hover:underline disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
        {uploadHistoryLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} columns={4} />
          </div>
        ) : uploadHistoryError ? (
          <div className="text-center py-10 text-sm text-[#EF4444]">{uploadHistoryError}</div>
        ) : uploadHistory.length === 0 ? (
          <div className="text-center py-10 text-sm text-[#757575]">No uploads yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5F7FA] text-left text-xs text-[#757575] uppercase tracking-wide">
                  <th className="px-6 py-3 font-medium">File</th>
                  <th className="px-6 py-3 font-medium">Records</th>
                  <th className="px-6 py-3 font-medium">Uploaded by</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E0E0]">
                {uploadHistory.map((upload) => (
                  <tr key={upload.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-6 py-4 font-medium text-[#212121]">{upload.fileName}</td>
                    <td className="px-6 py-4 text-[#616161]">{upload.recordsProcessed}</td>
                    <td className="px-6 py-4 text-[#616161]">{upload.uploadedBy}</td>
                    <td className="px-6 py-4 text-[#616161]">
                      {upload.timestamp
                        ? new Date(upload.timestamp).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          upload.status === 'success'
                            ? 'bg-[#DCFCE7] text-[#166534]'
                            : upload.status === 'failed'
                              ? 'bg-[#FEE2E2] text-[#991B1B]'
                              : 'bg-[#FEF3C7] text-[#92400E]'
                        }`}
                      >
                        {upload.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={showBulkUploadModal} onOpenChange={setShowBulkUploadModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Vendor Upload</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel file with columns aligned to the Vendor collection schema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {uploadStatus === 'idle' && (
              <>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-3 py-2 text-sm font-medium text-[#4F46E5] border border-[#4F46E5] rounded-lg hover:bg-[#EEF2FF] flex items-center gap-2"
                  >
                    <Download size={16} />
                    Download template
                  </button>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-[#4F46E5] bg-[#E0E7FF]'
                      : uploadFile
                        ? 'border-[#10B981] bg-[#DCFCE7]'
                        : 'border-[#E0E0E0] hover:border-[#4F46E5] hover:bg-[#F5F7FA]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  {uploadFile ? (
                    <>
                      <CheckCircle2 size={48} className="mx-auto text-[#10B981] mb-2" />
                      <p className="text-sm font-medium text-[#212121]">{uploadFile.name}</p>
                      <p className="text-xs text-[#757575] mt-1">
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="mt-2 text-xs text-[#EF4444] hover:underline"
                      >
                        Remove file
                      </button>
                    </>
                  ) : (
                    <>
                      <FileUp size={48} className="mx-auto text-[#757575] mb-2" />
                      <p className="text-sm text-[#757575]">Click to upload or drag and drop</p>
                      <p className="text-xs text-[#757575] mt-1">CSV, XLSX, XLS (Max 10MB)</p>
                    </>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900 font-medium mb-2">Required columns (row 1 headers):</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    {VENDOR_BULK_UPLOAD_COLUMNS.join(', ')}
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    Required per row: vendorCode, vendorName, gstin, paymentTerms (e.g. net30 or 30 days),
                    contactName, contactPhone, contactEmail, addressLine1, addressCity, addressState,
                    addressCountry, zipCode. Optional: pan, status, currencyCode, addressLine2, creditLimit,
                    leadTimeDays, minimumOrderValue.
                  </p>
                </div>
              </>
            )}

            {uploadStatus === 'uploading' && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4F46E5] mx-auto mb-4" />
                <p className="text-sm text-[#757575]">Creating vendors from file...</p>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="text-center py-8">
                <CheckCircle2 size={48} className="mx-auto text-[#10B981] mb-4" />
                <p className="text-sm font-medium text-[#212121]">Upload finished</p>
              </div>
            )}

            {lastUploadErrors.length > 0 && (
              <div className="border border-[#FECACA] bg-[#FEF2F2] rounded-lg p-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-medium text-[#991B1B] mb-2">Row errors</p>
                <ul className="space-y-1 text-xs text-[#7F1D1D]">
                  {lastUploadErrors.slice(0, 20).map((err, idx) => (
                    <li key={`${err.row}-${idx}`}>
                      Row {err.row}
                      {err.vendorCode ? ` (${err.vendorCode})` : ''}: {err.error}
                    </li>
                  ))}
                </ul>
                {lastUploadErrors.length > 20 && (
                  <p className="text-xs text-[#991B1B] mt-2">
                    +{lastUploadErrors.length - 20} more errors
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setUploadFile(null);
                  setUploadStatus('idle');
                  setLastUploadErrors([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-4 py-2 bg-white text-[#616161] border border-[#E0E0E0] rounded-lg hover:bg-[#F5F7FA] transition-colors"
              >
                Cancel
              </button>
              {uploadStatus === 'idle' && uploadFile && (
                <button
                  type="button"
                  onClick={processUpload}
                  className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA] transition-colors"
                >
                  Upload File
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
