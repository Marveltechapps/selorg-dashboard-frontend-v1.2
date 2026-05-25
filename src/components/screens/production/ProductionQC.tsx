import React, { useState } from 'react';
import { stopModalPointerPropagation } from "@/components/ui/modalOverlayGuards";
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
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import {
  fetchQCInspections,
  createQCInspection,
  updateQCInspection,
  deleteQCInspection,
  fetchQCLabTests,
  createQCLabTest,
  updateQCLabTest,
  deleteQCLabTest,
  updateQCLabTestStatus,
  type QCInspection as Inspection,
  type QCLabTest as LabTest,
} from '../../../api/productionApi';
import { useProductionFactory } from '../../../contexts/ProductionFactoryContext';

export function ProductionQC() {
  const queryClient = useQueryClient();
  const { selectedFactoryId } = useProductionFactory();
  const [activeTab, setActiveTab] = useState<'inspections' | 'lab_tests'>('inspections');
  const [inspectionFormMode, setInspectionFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingInspectionId, setEditingInspectionId] = useState<string | null>(null);
  const [inspectionToDelete, setInspectionToDelete] = useState<Inspection | null>(null);
  const [labFormMode, setLabFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingLabSampleId, setEditingLabSampleId] = useState<string | null>(null);
  const [labTestToDelete, setLabTestToDelete] = useState<LabTest | null>(null);
  const [labResultModal, setLabResultModal] = useState<{ sampleId: string; result: string } | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<Inspection | LabTest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: inspections = [], isLoading: loadingInspections } = useQuery({
    queryKey: ['production', 'qc', 'inspections', selectedFactoryId],
    queryFn: () => fetchQCInspections(selectedFactoryId || undefined),
    enabled: !!selectedFactoryId,
  });

  const { data: labTests = [], isLoading: loadingLabTests } = useQuery({
    queryKey: ['production', 'qc', 'labTests', selectedFactoryId],
    queryFn: () => fetchQCLabTests(selectedFactoryId || undefined),
    enabled: !!selectedFactoryId,
  });

  const invalidateQC = () => {
    queryClient.invalidateQueries({ queryKey: ['production', 'qc', 'inspections', selectedFactoryId] });
    queryClient.invalidateQueries({ queryKey: ['production', 'qc', 'labTests', selectedFactoryId] });
  };

  const saveInspectionMutation = useMutation({
    mutationFn: async (payload: {
      mode: 'create' | 'edit';
      id?: string;
      body: { batch: string; checkType: string; result: 'pass' | 'fail' | 'pending'; inspector: string; notes?: string };
    }) => {
      if (!selectedFactoryId) throw new Error('Select a factory first');
      if (payload.mode === 'create') {
        return createQCInspection(payload.body, selectedFactoryId);
      }
      if (!payload.id) throw new Error('Missing inspection id');
      return updateQCInspection(payload.id, payload.body, selectedFactoryId);
    },
    onSuccess: (_, vars) => {
      invalidateQC();
      toast.success(vars.mode === 'create' ? 'Inspection logged successfully' : 'Inspection updated');
      setInspectionFormMode(null);
      setEditingInspectionId(null);
      setInspectionForm(emptyInspectionForm());
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to save inspection'),
  });

  const deleteInspectionMutation = useMutation({
    mutationFn: (id: string) => {
      if (!selectedFactoryId) throw new Error('Select a factory first');
      return deleteQCInspection(id, selectedFactoryId);
    },
    onSuccess: () => {
      invalidateQC();
      toast.success('Inspection deleted');
      setInspectionToDelete(null);
      setShowDetailsModal(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to delete inspection'),
  });

  const createLabTestMutation = useMutation({
    mutationFn: (body: { product: string; source: string; testType: string; priority?: 'low' | 'normal' | 'high' }) =>
      createQCLabTest(body, selectedFactoryId || undefined),
    onSuccess: () => {
      invalidateQC();
      toast.success('Lab test requested');
      setLabFormMode(null);
      setEditingLabSampleId(null);
      setLabTestForm(emptyLabTestForm());
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to request lab test'),
  });

  const saveLabTestMutation = useMutation({
    mutationFn: async (payload: {
      mode: 'create' | 'edit';
      sampleId?: string;
      body: {
        product: string;
        source: string;
        testType: string;
        priority?: 'low' | 'normal' | 'high';
        status?: LabTest['status'];
        result?: string;
      };
    }) => {
      if (!selectedFactoryId) throw new Error('Select a factory first');
      if (payload.mode === 'create') {
        return createQCLabTest(payload.body, selectedFactoryId);
      }
      if (!payload.sampleId) throw new Error('Missing sample id');
      return updateQCLabTest(payload.sampleId, payload.body, selectedFactoryId);
    },
    onSuccess: (_, vars) => {
      invalidateQC();
      toast.success(vars.mode === 'create' ? 'Lab test saved' : 'Lab test updated');
      setLabFormMode(null);
      setEditingLabSampleId(null);
      setLabTestForm(emptyLabTestForm());
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to save lab test'),
  });

  const deleteLabTestMutation = useMutation({
    mutationFn: (sampleId: string) => {
      if (!selectedFactoryId) throw new Error('Select a factory first');
      return deleteQCLabTest(sampleId, selectedFactoryId);
    },
    onSuccess: () => {
      invalidateQC();
      toast.success('Lab test deleted');
      setLabTestToDelete(null);
      setShowDetailsModal(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to delete lab test'),
  });

  const updateLabTestStatusMutation = useMutation({
    mutationFn: ({ sampleId, status, result }: { sampleId: string; status: 'pending' | 'in-progress' | 'completed'; result?: string }) => {
      if (!selectedFactoryId) throw new Error('Select a factory first');
      if (!sampleId) throw new Error('Invalid sample id');
      return updateQCLabTestStatus(sampleId, status, result, selectedFactoryId);
    },
    onSuccess: (_, vars) => {
      invalidateQC();
      if (vars.status === 'in-progress') toast.success('Lab test started');
      else if (vars.status === 'completed') toast.success('Test result saved');
      setLabResultModal(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update test'),
  });

  const emptyInspectionForm = () => ({
    batch: '',
    checkType: '',
    result: 'pass' as Inspection['result'],
    inspector: '',
    notes: '',
  });

  const emptyLabTestForm = () => ({
    product: '',
    source: '',
    testType: '',
    priority: 'normal' as LabTest['priority'],
    status: 'pending' as LabTest['status'],
    result: '',
  });

  const [inspectionForm, setInspectionForm] = useState(emptyInspectionForm);
  const [labTestForm, setLabTestForm] = useState(emptyLabTestForm);

  const openCreateInspection = () => {
    setEditingInspectionId(null);
    setInspectionForm(emptyInspectionForm());
    setInspectionFormMode('create');
  };

  const openEditInspection = (inspection: Inspection) => {
    setEditingInspectionId(inspection.id);
    setInspectionForm({
      batch: inspection.batch,
      checkType: inspection.checkType,
      result: inspection.result,
      inspector: inspection.inspector,
      notes: inspection.notes ?? '',
    });
    setInspectionFormMode('edit');
    setShowDetailsModal(null);
  };

  const handleSaveInspection = () => {
    if (!inspectionForm.batch.trim() || !inspectionForm.checkType.trim() || !inspectionForm.inspector.trim()) {
      toast.error('Please fill batch, check type, and inspector');
      return;
    }
    saveInspectionMutation.mutate({
      mode: inspectionFormMode === 'edit' ? 'edit' : 'create',
      id: editingInspectionId ?? undefined,
      body: {
        batch: inspectionForm.batch.trim(),
        checkType: inspectionForm.checkType.trim(),
        result: inspectionForm.result,
        inspector: inspectionForm.inspector.trim(),
        notes: inspectionForm.notes.trim() || undefined,
      },
    });
  };

  const openCreateLabTest = () => {
    setEditingLabSampleId(null);
    setLabTestForm(emptyLabTestForm());
    setLabFormMode('create');
  };

  const openEditLabTest = (test: LabTest) => {
    setEditingLabSampleId(test.sampleId);
    setLabTestForm({
      product: test.product,
      source: test.source,
      testType: test.testType,
      priority: test.priority,
      status: test.status,
      result: test.result ?? '',
    });
    setLabFormMode('edit');
    setShowDetailsModal(null);
  };

  const handleSaveLabTest = () => {
    if (!selectedFactoryId) {
      toast.error('Select a factory first');
      return;
    }
    if (!labTestForm.product.trim() || !labTestForm.source.trim() || !labTestForm.testType.trim()) {
      toast.error('Please fill product, source, and test type');
      return;
    }
    if (labFormMode === 'create') {
      createLabTestMutation.mutate({
        product: labTestForm.product.trim(),
        source: labTestForm.source.trim(),
        testType: labTestForm.testType.trim(),
        priority: labTestForm.priority,
      });
      return;
    }
    saveLabTestMutation.mutate({
      mode: 'edit',
      sampleId: editingLabSampleId ?? undefined,
      body: {
        product: labTestForm.product.trim(),
        source: labTestForm.source.trim(),
        testType: labTestForm.testType.trim(),
        priority: labTestForm.priority,
        status: labTestForm.status,
        result: labTestForm.result.trim() || undefined,
      },
    });
  };

  const handleUpdateTestStatus = (sampleId: string, newStatus: 'in-progress' | 'completed') => {
    if (!selectedFactoryId) {
      toast.error('Select a factory first');
      return;
    }
    if (!sampleId) {
      toast.error('Invalid sample id');
      return;
    }
    if (newStatus === 'completed') {
      setLabResultModal({ sampleId, result: '' });
      return;
    }
    updateLabTestStatusMutation.mutate({ sampleId, status: newStatus });
  };

  const submitLabResult = () => {
    if (!labResultModal) return;
    const trimmed = labResultModal.result.trim();
    if (!trimmed) {
      toast.error('Enter a test result');
      return;
    }
    updateLabTestStatusMutation.mutate({
      sampleId: labResultModal.sampleId,
      status: 'completed',
      result: trimmed,
    });
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
                type="button"
                onClick={openCreateInspection}
                disabled={!selectedFactoryId}
                className="px-3 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
                Log Inspection
              </button>
            )}
            {activeTab === 'lab_tests' && (
              <button
                type="button"
                onClick={openCreateLabTest}
                disabled={!selectedFactoryId}
                className="px-3 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#757575]">
                    {!selectedFactoryId
                      ? 'Select a factory to view inspections.'
                      : 'No inspections yet. Log an inspection to get started.'}
                  </td>
                </tr>
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
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditInspection(inspection)}
                        className="p-1.5 text-[#616161] hover:text-[#212121] hover:bg-[#F5F5F5] rounded-lg"
                        aria-label={`Edit inspection ${inspection.batch}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectionToDelete(inspection)}
                        className="p-1.5 text-[#EF4444] hover:text-[#DC2626] hover:bg-red-50 rounded-lg"
                        aria-label={`Delete inspection ${inspection.batch}`}
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDetailsModal(inspection)}
                        className="text-[#16A34A] hover:text-[#15803D] font-medium text-xs px-1"
                      >
                        View
                      </button>
                    </div>
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
                    <div className="flex justify-end items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditLabTest(test)}
                        className="p-1.5 text-[#616161] hover:text-[#212121] hover:bg-[#F5F5F5] rounded-lg"
                        aria-label={`Edit lab test ${test.sampleId}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLabTestToDelete(test)}
                        className="p-1.5 text-[#EF4444] hover:text-[#DC2626] hover:bg-red-50 rounded-lg"
                        aria-label={`Delete lab test ${test.sampleId}`}
                      >
                        <Trash2 size={14} />
                      </button>
                      {test.status === 'pending' && test.sampleId && (
                        <button
                          type="button"
                          onClick={() => handleUpdateTestStatus(test.sampleId, 'in-progress')}
                          disabled={updateLabTestStatusMutation.isPending || !selectedFactoryId}
                          className="text-blue-600 hover:text-blue-700 font-medium text-xs disabled:opacity-50"
                        >
                          Start
                        </button>
                      )}
                      {test.status === 'in-progress' && test.sampleId && (
                        <button
                          type="button"
                          onClick={() => handleUpdateTestStatus(test.sampleId, 'completed')}
                          disabled={updateLabTestStatusMutation.isPending || !selectedFactoryId}
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

      {inspectionFormMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" {...stopModalPointerPropagation}>
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">
                {inspectionFormMode === 'create' ? 'Log QC Inspection' : 'Edit QC Inspection'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setInspectionFormMode(null);
                  setEditingInspectionId(null);
                  setInspectionForm(emptyInspectionForm());
                }}
                className="text-[#757575] hover:text-[#212121]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Batch / Item</label>
                <input
                  type="text"
                  placeholder="e.g., Batch #9921"
                  value={inspectionForm.batch}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, batch: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Check Type</label>
                <select
                  value={inspectionForm.checkType}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, checkType: e.target.value })}
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
                  value={inspectionForm.result}
                  onChange={(e) =>
                    setInspectionForm({ ...inspectionForm, result: e.target.value as Inspection['result'] })
                  }
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
                  value={inspectionForm.inspector}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, inspector: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Notes (Optional)</label>
                <textarea
                  placeholder="Additional observations..."
                  value={inspectionForm.notes}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setInspectionFormMode(null);
                  setEditingInspectionId(null);
                  setInspectionForm(emptyInspectionForm());
                }}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInspection}
                disabled={saveInspectionMutation.isPending}
                className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] disabled:opacity-50 flex items-center gap-2"
              >
                {saveInspectionMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                {inspectionFormMode === 'create' ? 'Log Inspection' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {labFormMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" {...stopModalPointerPropagation}>
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-[#212121]">
                {labFormMode === 'create' ? 'Request Lab Test' : 'Edit Lab Test'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setLabFormMode(null);
                  setEditingLabSampleId(null);
                  setLabTestForm(emptyLabTestForm());
                }}
                className="text-[#757575] hover:text-[#212121]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Product</label>
                <input
                  type="text"
                  placeholder="e.g., Raw Milk Tank B"
                  value={labTestForm.product}
                  onChange={(e) => setLabTestForm({ ...labTestForm, product: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Source</label>
                <input
                  type="text"
                  placeholder="e.g., Batch #9921, Tank A, Supplier Lot"
                  value={labTestForm.source}
                  onChange={(e) => setLabTestForm({ ...labTestForm, source: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Test Type</label>
                <select
                  value={labTestForm.testType}
                  onChange={(e) => setLabTestForm({ ...labTestForm, testType: e.target.value })}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Priority</label>
                  <select
                    value={labTestForm.priority}
                    onChange={(e) =>
                      setLabTestForm({ ...labTestForm, priority: e.target.value as LabTest['priority'] })
                    }
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
                {labFormMode === 'edit' && (
                  <div>
                    <label className="block text-sm font-medium text-[#212121] mb-2">Status</label>
                    <select
                      value={labTestForm.status}
                      onChange={(e) =>
                        setLabTestForm({ ...labTestForm, status: e.target.value as LabTest['status'] })
                      }
                      className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                )}
              </div>
              {labFormMode === 'edit' && (
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Result (optional)</label>
                  <input
                    type="text"
                    placeholder="Test result notes"
                    value={labTestForm.result}
                    onChange={(e) => setLabTestForm({ ...labTestForm, result: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={() => {
                  setLabFormMode(null);
                  setEditingLabSampleId(null);
                  setLabTestForm(emptyLabTestForm());
                }}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLabTest}
                disabled={createLabTestMutation.isPending || saveLabTestMutation.isPending}
                className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] disabled:opacity-50 flex items-center gap-2"
              >
                {(createLabTestMutation.isPending || saveLabTestMutation.isPending) && (
                  <Loader2 className="animate-spin" size={16} />
                )}
                {labFormMode === 'create' ? 'Request Test' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {inspectionToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" {...stopModalPointerPropagation}>
            <h3 className="font-bold text-lg text-[#212121] mb-2">Delete inspection?</h3>
            <p className="text-sm text-[#757575] mb-6">
              Remove inspection for <span className="font-medium text-[#212121]">{inspectionToDelete.batch}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setInspectionToDelete(null)} className="px-4 py-2 bg-white border border-[#E0E0E0] rounded-lg">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteInspectionMutation.mutate(inspectionToDelete.id)}
                disabled={deleteInspectionMutation.isPending}
                className="px-4 py-2 bg-[#EF4444] text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {deleteInspectionMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {labTestToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" {...stopModalPointerPropagation}>
            <h3 className="font-bold text-lg text-[#212121] mb-2">Delete lab test?</h3>
            <p className="text-sm text-[#757575] mb-6">
              Remove lab test <span className="font-medium text-[#212121]">{labTestToDelete.sampleId}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setLabTestToDelete(null)} className="px-4 py-2 bg-white border border-[#E0E0E0] rounded-lg">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteLabTestMutation.mutate(labTestToDelete.sampleId)}
                disabled={deleteLabTestMutation.isPending}
                className="px-4 py-2 bg-[#EF4444] text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLabTestMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {labResultModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" {...stopModalPointerPropagation}>
            <h3 className="font-bold text-lg text-[#212121] mb-2">Add test result</h3>
            <p className="text-sm text-[#757575] mb-4">
              Sample <span className="font-medium text-[#212121]">{labResultModal.sampleId}</span>
            </p>
            <textarea
              placeholder="e.g., 3.2% moisture — within spec"
              value={labResultModal.result}
              onChange={(e) => setLabResultModal({ ...labResultModal, result: e.target.value })}
              className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] resize-none mb-6"
              rows={3}
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setLabResultModal(null)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitLabResult}
                disabled={updateLabTestStatusMutation.isPending}
                className="px-4 py-2 bg-[#16A34A] text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {updateLabTestStatusMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                Save Result
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" {...stopModalPointerPropagation}>
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
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => openEditInspection(showDetailsModal)}
                      className="flex-1 px-4 py-2 border border-[#E0E0E0] rounded-lg flex items-center justify-center gap-2"
                    >
                      <Pencil size={16} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetailsModal(null);
                        setInspectionToDelete(showDetailsModal);
                      }}
                      className="px-4 py-2 bg-[#EF4444] text-white rounded-lg flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
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
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => openEditLabTest(showDetailsModal)}
                      className="flex-1 px-4 py-2 border border-[#E0E0E0] rounded-lg flex items-center justify-center gap-2"
                    >
                      <Pencil size={16} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetailsModal(null);
                        setLabTestToDelete(showDetailsModal);
                      }}
                      className="px-4 py-2 bg-[#EF4444] text-white rounded-lg flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}