import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Download, 
  X, 
  TestTube,
  Search,
  Loader2,
  Plus
} from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import {
  fetchQCInspections,
  createQCInspection,
  fetchQCLabTests,
  createQCLabTest,
  updateQCLabTestStatus,
  type QCInspection as Inspection,
  type QCLabTest as LabTest,
} from '../../../api/productionApi';

export function ProductionQC() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'inspections' | 'lab_tests'>('inspections');
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showLabTestModal, setShowLabTestModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<Inspection | LabTest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: inspections = [], isLoading: loadingInspections } = useQuery({
    queryKey: ['production', 'qc', 'inspections'],
    queryFn: () => fetchQCInspections(),
  });

  const { data: labTests = [], isLoading: loadingLabTests } = useQuery({
    queryKey: ['production', 'qc', 'labTests'],
    queryFn: () => fetchQCLabTests(),
  });

  const createInspectionMutation = useMutation({
    mutationFn: (body: { batch: string; checkType: string; result: 'pass' | 'fail' | 'pending'; inspector: string; notes?: string }) =>
      createQCInspection(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production', 'qc', 'inspections'] });
      toast.success('Inspection logged successfully');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to log inspection'),
  });

  const createLabTestMutation = useMutation({
    mutationFn: (body: { product: string; source: string; testType: string; priority?: 'low' | 'normal' | 'high' }) =>
      createQCLabTest(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production', 'qc', 'labTests'] });
      toast.success('Lab test requested');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to request lab test'),
  });

  const updateLabTestStatusMutation = useMutation({
    mutationFn: ({ sampleId, status, result }: { sampleId: string; status: 'pending' | 'in-progress' | 'completed'; result?: string }) =>
      updateQCLabTestStatus(sampleId, status, result),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production', 'qc', 'labTests'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update test'),
  });

  const [newInspection, setNewInspection] = useState({
    batch: '',
    checkType: '',
    result: 'pass' as const,
    inspector: '',
    notes: '',
  });

  const [newLabTest, setNewLabTest] = useState({
    product: '',
    source: '',
    testType: '',
    priority: 'normal' as const,
  });

  const handleCreateInspection = () => {
    if (newInspection.batch && newInspection.checkType && newInspection.inspector) {
      createInspectionMutation.mutate(newInspection, {
        onSuccess: () => {
          setNewInspection({ batch: '', checkType: '', result: 'pass', inspector: '', notes: '' });
          setShowInspectionModal(false);
        },
      });
    } else {
      toast.error('Please fill batch, check type, and inspector');
    }
  };

  const handleCreateLabTest = () => {
    if (newLabTest.product && newLabTest.source && newLabTest.testType) {
      createLabTestMutation.mutate(newLabTest, {
        onSuccess: () => {
          setNewLabTest({ product: '', source: '', testType: '', priority: 'normal' });
          setShowLabTestModal(false);
        },
      });
    } else {
      toast.error('Please fill product, source, and test type');
    }
  };

  const handleUpdateTestStatus = (sampleId: string, newStatus: 'in-progress' | 'completed') => {
    if (newStatus === 'completed') {
      const result = prompt('Enter test result:');
      if (result != null && result.trim()) {
        updateLabTestStatusMutation.mutate({ sampleId, status: 'completed', result: result.trim() });
      }
    } else {
      updateLabTestStatusMutation.mutate({ sampleId, status: newStatus });
    }
  };

  const exportReport = () => {
    const today = new Date().toISOString().split('T')[0];
    let csvData: any[] = [];

    if (activeTab === 'inspections') {
      csvData = [
        ['Quality Control Inspections Report', `Date: ${today}`],
        [''],
        ['Time', 'Batch', 'Check Type', 'Result', 'Inspector', 'Date', 'Notes'],
        ...inspections.map(i => [
          i.time,
          i.batch,
          i.checkType,
          i.result.toUpperCase(),
          i.inspector,
          i.date,
          i.notes || 'N/A'
        ]),
      ];
    } else {
      csvData = [
        ['Lab Tests Report', `Date: ${today}`],
        [''],
        ['Sample ID', 'Product', 'Source', 'Test Type', 'Status', 'Priority', 'Received Date', 'Completed Date', 'Result'],
        ...labTests.map(t => [
          t.sampleId,
          t.product,
          t.source,
          t.testType,
          t.status,
          t.priority,
          t.receivedDate,
          t.completedDate || 'N/A',
          t.result || 'N/A'
        ]),
      ];
    }
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qc-${activeTab}-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredInspections = inspections.filter((i: Inspection) =>
    i.batch.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.checkType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLabTests = labTests.filter((t: LabTest) =>
    t.sampleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.testType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const passCount = inspections.filter(i => i.result === 'pass').length;
  const failCount = inspections.filter(i => i.result === 'fail').length;
  const totalInspections = inspections.length;
  const passRate = totalInspections > 0 ? ((passCount / totalInspections) * 100).toFixed(1) : '0.0';
  const pendingInspections = inspections.filter(i => i.result === 'pending').length;
  const activeLabTests = labTests.filter(t => t.status === 'in-progress' || t.status === 'pending').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Control"
        subtitle="Batch inspections and defect tracking"
        actions={
          <button 
            onClick={exportReport}
            className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
          >
            <Download size={16} />
            Export Report
          </button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-[#212121]">{passRate}%</h3>
          <p className="text-[#757575] text-sm">Pass Rate (Overall)</p>
          <p className="text-xs text-[#757575] mt-1">{passCount} / {totalInspections} inspections</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <XCircle size={32} className="text-red-600" />
          </div>
          <h3 className="text-2xl font-bold text-[#212121]">{failCount}</h3>
          <p className="text-[#757575] text-sm">Rejections (Overall)</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <Shield size={32} className="text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-[#212121]">{pendingInspections}</h3>
          <p className="text-[#757575] text-sm">Pending Inspections</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
            <TestTube size={32} className="text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-[#212121]">{activeLabTests}</h3>
          <p className="text-[#757575] text-sm">Active Lab Tests</p>
        </div>
      </div>

      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <div className="border-b border-[#E0E0E0] flex justify-between items-center">
          <div className="flex">
            <button 
              onClick={() => setActiveTab('inspections')}
              className={cn(
                "px-6 py-4 text-sm font-bold border-b-2 transition-colors",
                activeTab === 'inspections' 
                  ? "border-[#16A34A] text-[#16A34A] bg-[#FAFAFA]" 
                  : "border-transparent text-[#757575] hover:text-[#212121]"
              )}
            >
              Floor Inspections
            </button>
            <button 
              onClick={() => setActiveTab('lab_tests')}
              className={cn(
                "px-6 py-4 text-sm font-bold border-b-2 transition-colors",
                activeTab === 'lab_tests' 
                  ? "border-[#16A34A] text-[#16A34A] bg-[#FAFAFA]" 
                  : "border-transparent text-[#757575] hover:text-[#212121]"
              )}
            >
              Lab Tests
            </button>
          </div>
          <div className="px-4 flex items-center gap-3">
            {activeTab === 'inspections' && (
              <button
                onClick={() => setShowInspectionModal(true)}
                className="px-3 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] flex items-center gap-2 text-sm"
              >
                <Plus size={14} />
                Log Inspection
              </button>
            )}
            {activeTab === 'lab_tests' && (
              <button
                onClick={() => setShowLabTestModal(true)}
                className="px-3 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] flex items-center gap-2 text-sm"
              >
                <Plus size={14} />
                Request Lab Test
              </button>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
              <input 
                type="text" 
                placeholder={activeTab === 'inspections' ? 'Search inspections...' : 'Search lab tests...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 pr-4 rounded-lg bg-[#F5F5F5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#16A34A] focus:border-transparent transition-all w-64"
              />
            </div>
          </div>
        </div>

        {activeTab === 'inspections' ? (
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Batch / Item</th>
                <th className="px-6 py-3">Check Type</th>
                <th className="px-6 py-3">Result</th>
                <th className="px-6 py-3">Inspector</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {loadingInspections ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-[#757575]"><Loader2 className="animate-spin mx-auto" size={24} /> Loading...</td></tr>
              ) : filteredInspections.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-[#757575]">No inspections yet. Log an inspection to get started.</td></tr>
              ) : filteredInspections.map(inspection => (
                <tr key={inspection.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-6 py-4 text-[#616161]">{inspection.time}</td>
                  <td className="px-6 py-4 font-medium text-[#212121]">{inspection.batch}</td>
                  <td className="px-6 py-4 text-[#616161]">{inspection.checkType}</td>
                  <td className="px-6 py-4">
                    <span className={`font-bold ${
                      inspection.result === 'pass' ? 'text-[#16A34A]' :
                      inspection.result === 'fail' ? 'text-[#EF4444]' :
                      'text-[#F59E0B]'
                    }`}>
                      {inspection.result.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#616161]">{inspection.inspector}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setShowDetailsModal(inspection)}
                      className="text-[#16A34A] hover:text-[#15803D] font-medium text-xs"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3">Sample ID</th>
                <th className="px-6 py-3">Product / Source</th>
                <th className="px-6 py-3">Test Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {loadingLabTests ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-[#757575]"><Loader2 className="animate-spin mx-auto" size={24} /> Loading...</td></tr>
              ) : filteredLabTests.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-[#757575]">No lab tests yet. Request a lab test to get started.</td></tr>
              ) : filteredLabTests.map((test: LabTest) => (
                <tr key={test.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-6 py-4 font-bold text-[#212121]">{test.sampleId}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-[#212121]">{test.product}</p>
                    <p className="text-xs text-[#757575]">{test.source}</p>
                  </td>
                  <td className="px-6 py-4 text-[#616161]">{test.testType}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      test.status === 'completed' ? 'bg-[#DCFCE7] text-[#166534]' :
                      test.status === 'in-progress' ? 'bg-[#E0F2FE] text-[#0369A1]' :
                      test.status === 'failed' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                      'bg-[#FEF9C3] text-[#854D0E]'
                    }`}>
                      {test.status === 'in-progress' ? 'In Progress' : 
                       test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-bold text-xs uppercase ${
                      test.priority === 'high' ? 'text-[#EF4444]' :
                      test.priority === 'normal' ? 'text-[#6B7280]' :
                      'text-[#9CA3AF]'
                    }`}>
                      {test.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {test.status === 'pending' && (
                        <button 
                          onClick={() => handleUpdateTestStatus(test.sampleId, 'in-progress')}
                          disabled={updateLabTestStatusMutation.isPending}
                          className="text-blue-600 hover:text-blue-700 font-medium text-xs disabled:opacity-50"
                        >
                          Start
                        </button>
                      )}
                      {test.status === 'in-progress' && (
                        <button 
                          onClick={() => handleUpdateTestStatus(test.sampleId, 'completed')}
                          disabled={updateLabTestStatusMutation.isPending}
                          className="text-[#16A34A] hover:text-[#15803D] font-medium text-xs disabled:opacity-50"
                        >
                          Add Result
                        </button>
                      )}
                      {test.status === 'completed' && (
                        <button 
                          onClick={() => setShowDetailsModal(test)}
                          className="text-[#16A34A] hover:text-[#15803D] font-medium text-xs"
                        >
                          View Result
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Log Inspection Modal */}
      {showInspectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Log QC Inspection</h3>
              <button onClick={() => setShowInspectionModal(false)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Batch / Item</label>
                <input 
                  type="text"
                  placeholder="e.g., Batch #9921"
                  value={newInspection.batch}
                  onChange={(e) => setNewInspection({...newInspection, batch: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Check Type</label>
                <select 
                  value={newInspection.checkType}
                  onChange={(e) => setNewInspection({...newInspection, checkType: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                >
                  <option value="">Select check type</option>
                  <option>Weight Check</option>
                  <option>Visual Inspection</option>
                  <option>Temperature Check</option>
                  <option>Seal Integrity</option>
                  <option>Dimension Check</option>
                  <option>Color Check</option>
                  <option>Package Inspection</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Result</label>
                <select 
                  value={newInspection.result}
                  onChange={(e) => setNewInspection({...newInspection, result: e.target.value as any})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                >
                  <option value="pass">PASS</option>
                  <option value="fail">FAIL</option>
                  <option value="pending">PENDING</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Inspector Name</label>
                <input 
                  type="text"
                  placeholder="Your name"
                  value={newInspection.inspector}
                  onChange={(e) => setNewInspection({...newInspection, inspector: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Notes (Optional)</label>
                <textarea 
                  placeholder="Additional observations..."
                  value={newInspection.notes}
                  onChange={(e) => setNewInspection({...newInspection, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowInspectionModal(false)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateInspection}
                disabled={createInspectionMutation.isPending}
                className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] disabled:opacity-50"
              >
                {createInspectionMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Log Inspection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Lab Test Modal */}
      {showLabTestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Request Lab Test</h3>
              <button onClick={() => setShowLabTestModal(false)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Product</label>
                <input 
                  type="text"
                  placeholder="e.g., Raw Milk Tank B"
                  value={newLabTest.product}
                  onChange={(e) => setNewLabTest({...newLabTest, product: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Source</label>
                <input 
                  type="text"
                  placeholder="e.g., Batch #9921, Tank A, Supplier Lot"
                  value={newLabTest.source}
                  onChange={(e) => setNewLabTest({...newLabTest, source: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Test Type</label>
                <select 
                  value={newLabTest.testType}
                  onChange={(e) => setNewLabTest({...newLabTest, testType: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                >
                  <option value="">Select test type</option>
                  <option>Microbiology (Bacteria)</option>
                  <option>Moisture Content</option>
                  <option>Heavy Metals</option>
                  <option>Allergen Testing</option>
                  <option>pH Testing</option>
                  <option>Shelf Life Study</option>
                  <option>Nutritional Analysis</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Priority</label>
                <select 
                  value={newLabTest.priority}
                  onChange={(e) => setNewLabTest({...newLabTest, priority: e.target.value as any})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowLabTestModal(false)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateLabTest}
                disabled={createLabTestMutation.isPending}
                className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] disabled:opacity-50"
              >
                {createLabTestMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Request Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">
                {'batch' in showDetailsModal ? 'Inspection Details' : 'Lab Test Details'}
              </h3>
              <button onClick={() => setShowDetailsModal(null)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {'batch' in showDetailsModal ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-[#757575]">Batch/Item</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.batch}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Time</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.time}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Check Type</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.checkType}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Result</span>
                      <p className={`font-bold uppercase ${
                        showDetailsModal.result === 'pass' ? 'text-[#16A34A]' :
                        showDetailsModal.result === 'fail' ? 'text-[#EF4444]' :
                        'text-[#F59E0B]'
                      }`}>
                        {showDetailsModal.result}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Inspector</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.inspector}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Date</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.date}</p>
                    </div>
                  </div>
                  {showDetailsModal.notes && (
                    <div className="bg-[#F5F5F5] p-3 rounded-lg">
                      <span className="text-xs text-[#757575] block mb-1">Notes</span>
                      <p className="text-sm text-[#212121]">{showDetailsModal.notes}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-[#757575]">Sample ID</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.sampleId}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Priority</span>
                      <p className="font-bold text-[#212121] uppercase">{showDetailsModal.priority}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Product</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.product}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Source</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.source}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Test Type</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.testType}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Status</span>
                      <p className="font-bold text-[#212121] capitalize">{showDetailsModal.status}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Received Date</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.receivedDate}</p>
                    </div>
                    {showDetailsModal.completedDate && (
                      <div>
                        <span className="text-xs text-[#757575]">Completed Date</span>
                        <p className="font-bold text-[#212121]">{showDetailsModal.completedDate}</p>
                      </div>
                    )}
                  </div>
                  {showDetailsModal.result && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <span className="text-xs text-green-900 font-medium block mb-1">Test Result</span>
                      <p className="text-sm font-bold text-green-900">{showDetailsModal.result}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}