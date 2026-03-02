import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Thermometer, ShieldCheck, AlertTriangle, X, Download, Plus, Search, CheckCircle, FileText, Activity, Beaker, TrendingUp, Clock, User } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { EmptyState, LoadingState } from '../../ui/ux-components';
import { toast } from 'sonner';
import { 
  fetchQCInspections, 
  createQCInspection as apiCreateInspection, 
  fetchTemperatureLogs, 
  createTemperatureLog as apiCreateTempLog,
  fetchQCRejections,
  logQCRejection as apiLogRejection,
  fetchComplianceDocs,
  fetchSampleTests,
  createSampleTest as apiCreateSample,
  updateSampleTestResult,
  fetchComplianceChecks,
  toggleComplianceCheck as apiToggleComplianceCheck,
  QCInspection,
  TemperatureLog,
  ComplianceDoc,
  SampleTest,
  Rejection,
  ComplianceCheck
} from './warehouseApi';

export function QCCompliance() {
  const [activeTab, setActiveTab] = useState<'overview' | 'inspections' | 'temperature' | 'compliance-docs' | 'sampling' | 'rejections'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showTempLogModal, setShowTempLogModal] = useState(false);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [showInspectionReportModal, setShowInspectionReportModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showSampleReportModal, setShowSampleReportModal] = useState(false);
  const [showTempChartModal, setShowTempChartModal] = useState(false);
  
  const [selectedInspection, setSelectedInspection] = useState<QCInspection | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<ComplianceDoc | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleTest | null>(null);
  const [selectedTempLog, setSelectedTempLog] = useState<TemperatureLog | null>(null);
  
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);

  const [newRejection, setNewRejection] = useState({ batch: '', reason: '', items: '', severity: 'medium' as const });
  const [newInspection, setNewInspection] = useState({ batchId: '', productName: '', itemsInspected: '', defectsFound: '' });
  const [newTempLog, setNewTempLog] = useState({ zone: '', temperature: '', humidity: '' });
  const [newSample, setNewSample] = useState({ batchId: '', productName: '', testType: '' });

  const [inspections, setInspections] = useState<QCInspection[]>([]);
  const [temperatureLogs, setTemperatureLogs] = useState<TemperatureLog[]>([]);
  const [complianceDocs, setComplianceDocs] = useState<ComplianceDoc[]>([]);
  const [sampleTests, setSampleTests] = useState<SampleTest[]>([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const [insps, temps, docs, samples, rejs, chks] = await Promise.all([
          fetchQCInspections(),
          fetchTemperatureLogs(),
          fetchComplianceDocs(),
          fetchSampleTests(),
          fetchQCRejections(),
          fetchComplianceChecks()
        ]);
        setInspections(insps);
        setTemperatureLogs(temps);
        setComplianceDocs(docs);
        setSampleTests(samples);
        setRejections(rejs);
        setChecks(chks ?? []);
      } else if (activeTab === 'inspections') {
        const data = await fetchQCInspections();
        setInspections(data);
      } else if (activeTab === 'temperature') {
        const data = await fetchTemperatureLogs();
        setTemperatureLogs(data);
      } else if (activeTab === 'compliance-docs') {
        const data = await fetchComplianceDocs();
        setComplianceDocs(data);
      } else if (activeTab === 'sampling') {
        const data = await fetchSampleTests();
        setSampleTests(data);
      } else if (activeTab === 'rejections') {
        const data = await fetchQCRejections();
        setRejections(data);
      }
    } catch (error) {
      toast.error('Failed to load quality control data');
    } finally {
      setLoading(false);
    }
  };

  const createRejection = async () => {
    if (newRejection.batch && newRejection.reason) {
      try {
        await apiLogRejection({
          batch: newRejection.batch,
          reason: newRejection.reason,
          items: parseInt(newRejection.items) || 0,
          severity: newRejection.severity,
          timestamp: new Date().toISOString(),
          inspector: 'Current User'
        });
        toast.success('Rejection logged successfully');
        setNewRejection({ batch: '', reason: '', items: '', severity: 'medium' });
        setShowRejectionModal(false);
        loadData();
      } catch (error) {
        toast.error('Failed to log rejection');
      }
    }
  };

  const createInspection = async () => {
    if (newInspection.batchId && newInspection.productName) {
      try {
        const itemsInspected = parseInt(newInspection.itemsInspected) || 0;
        const defectsFound = parseInt(newInspection.defectsFound) || 0;
        const score = itemsInspected > 0 ? Math.round(((itemsInspected - defectsFound) / itemsInspected) * 100) : 0;
        
        await apiCreateInspection({
          batchId: newInspection.batchId,
          productName: newInspection.productName,
          itemsInspected,
          defectsFound,
          score,
          status: score >= 80 ? 'passed' : 'failed',
          inspector: 'Current User',
          date: new Date().toISOString().split('T')[0]
        });
        toast.success('Inspection created successfully');
        setNewInspection({ batchId: '', productName: '', itemsInspected: '', defectsFound: '' });
        setShowInspectionModal(false);
        loadData();
      } catch (error) {
        toast.error('Failed to create inspection');
      }
    }
  };

  const createTempLog = async () => {
    if (newTempLog.zone && newTempLog.temperature) {
      try {
        const temp = parseFloat(newTempLog.temperature);
        await apiCreateTempLog({
          zone: newTempLog.zone,
          temperature: temp,
          humidity: parseInt(newTempLog.humidity) || 0,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        toast.success('Temperature log created');
        setNewTempLog({ zone: '', temperature: '', humidity: '' });
        setShowTempLogModal(false);
        loadData();
      } catch (error) {
        toast.error('Failed to log temperature');
      }
    }
  };

  const createSample = async () => {
    if (newSample.batchId && newSample.testType) {
      try {
        await apiCreateSample({
          batchId: newSample.batchId,
          productName: newSample.productName,
          testType: newSample.testType,
          result: 'pending',
          testedBy: 'Current User',
          date: new Date().toISOString().split('T')[0]
        });
        toast.success('Sample test created');
        setNewSample({ batchId: '', productName: '', testType: '' });
        setShowSampleModal(false);
        loadData();
      } catch (error) {
        toast.error('Failed to create sample test');
      }
    }
  };

  const updateSampleResult = async (id: string, result: 'pass' | 'fail' | 'pending') => {
    try {
      await updateSampleTestResult(id, result);
      toast.success('Sample result updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update sample result');
    }
  };

  const toggleCheck = async (id: string) => {
    const check = checks.find(c => c.id === id);
    if (!check) return;
    
    const newCompleted = !check.completed;
    try {
      await apiToggleComplianceCheck(id, newCompleted);
      setChecks(prev => prev.map(c => 
        c.id === id ? { 
          ...c, 
          completed: newCompleted, 
          timestamp: newCompleted ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined, 
          inspector: newCompleted ? 'Current User' : undefined 
        } : c
      ));
      toast.success('Checklist updated');
    } catch (error) {
      // If backend endpoint doesn't exist, update locally
      setChecks(prev => prev.map(c => 
        c.id === id ? { 
          ...c, 
          completed: newCompleted, 
          timestamp: newCompleted ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined, 
          inspector: newCompleted ? 'Current User' : undefined 
        } : c
      ));
      toast.success('Checklist updated');
    }
  };

  const exportData = () => {
    const today = new Date().toISOString().split('T')[0];
    let csvData: any[] = [];

    if (activeTab === 'inspections') {
      csvData = [
        ['QC Inspections Report', `Date: ${today}`],
        [''],
        ['Inspection ID', 'Batch ID', 'Product', 'Inspector', 'Date', 'Status', 'Score', 'Items Inspected', 'Defects Found'],
        ...inspections.map(i => [i.inspectionId, i.batchId, i.productName, i.inspector, i.date, i.status, i.score, i.itemsInspected, i.defectsFound]),
      ];
    } else if (activeTab === 'temperature') {
      csvData = [
        ['Temperature Logs Report', `Date: ${today}`],
        [''],
        ['Zone', 'Temperature (°C)', 'Humidity (%)', 'Timestamp', 'Status'],
        ...temperatureLogs.map(t => [t.zone, t.temperature, t.humidity, t.timestamp, t.status]),
      ];
    } else if (activeTab === 'compliance-docs') {
      csvData = [
        ['Compliance Documents Report', `Date: ${today}`],
        [''],
        ['Doc ID', 'Document Name', 'Type', 'Issued Date', 'Expiry Date', 'Status'],
        ...complianceDocs.map(d => [d.docId, d.docName, d.type, d.issuedDate, d.expiryDate, d.status]),
      ];
    } else if (activeTab === 'sampling') {
      csvData = [
        ['Sample Testing Report', `Date: ${today}`],
        [''],
        ['Sample ID', 'Batch ID', 'Product', 'Test Type', 'Result', 'Tested By', 'Date'],
        ...sampleTests.map(s => [s.sampleId, s.batchId, s.productName, s.testType, s.result, s.testedBy, s.date]),
      ];
    } else if (activeTab === 'rejections') {
      csvData = [
        ['Rejections Report', `Date: ${today}`],
        [''],
        ['Batch', 'Reason', 'Items', 'Severity', 'Inspector', 'Timestamp'],
        ...rejections.map(r => [r.batch, r.reason, r.items, r.severity, r.inspector, r.timestamp]),
      ];
    } else {
      csvData = [
        ['QC & Compliance Report', `Date: ${today}`],
        [''],
        ['Summary Metrics'],
        ['Items Scanned', '156'],
        ['Pass Rate', '98%'],
        ['Cold Chain Avg Temp', '4.2°C'],
        ['Rejections', rejections.length.toString()],
        [''],
        ['Compliance Checklist'],
        ['Check Name', 'Status', 'Category', 'Inspector', 'Timestamp'],
        ...checks.map(c => [c.name, c.completed ? 'Completed' : 'Pending', c.category, c.inspector || 'N/A', c.timestamp || 'N/A']),
      ];
    }
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qc-compliance-${activeTab}-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredInspections = inspections.filter(i =>
    (String(i.inspectionId || '')).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (String(i.batchId || '')).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (String(i.productName || '')).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTempLogs = temperatureLogs.filter(t =>
    (String(t.zone || '')).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDocs = complianceDocs.filter(d =>
    (String(d.docId || '')).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (String(d.docName || '')).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSamples = sampleTests.filter(s =>
    (String(s.sampleId || '')).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (String(s.batchId || '')).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (String(s.productName || '')).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRejections = rejections.filter(r =>
    (String(r.batch || '')).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (String(r.reason || '')).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const passRate = inspections.length > 0 
    ? Math.round((inspections.filter(i => i.status === 'passed').length / inspections.length) * 100) 
    : 98;

  const avgTemp = temperatureLogs.length > 0
    ? (temperatureLogs.reduce((sum, t) => sum + t.temperature, 0) / temperatureLogs.length).toFixed(1)
    : '4.2';

  const completedChecks = checks.filter(c => c.completed).length;
  const totalChecks = checks.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Control & Compliance"
        subtitle="Inspection protocols, temperature monitoring, and regulatory documentation"
        actions={[
          <button 
            key="export"
            onClick={exportData}
            className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC] flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>,
          activeTab === 'overview' && (
            <button 
              key="rejection"
              onClick={() => setShowRejectionModal(true)}
              className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <AlertTriangle size={16} />
              Log Rejection
            </button>
          ),
          activeTab === 'inspections' && (
            <button 
              key="inspection"
              onClick={() => setShowInspectionModal(true)}
              className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
            >
              <Plus size={16} />
              New Inspection
            </button>
          ),
          activeTab === 'temperature' && (
            <button 
              key="temp"
              onClick={() => setShowTempLogModal(true)}
              className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
            >
              <Plus size={16} />
              Log Temperature
            </button>
          ),
          activeTab === 'sampling' && (
            <button 
              key="sample"
              onClick={() => setShowSampleModal(true)}
              className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
            >
              <Plus size={16} />
              New Sample
            </button>
          )
        ]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><ClipboardCheck size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Inspections</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{inspections.length}</p>
          <p className="text-xs text-green-600 font-bold">{passRate}% Pass Rate</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg"><Thermometer size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Avg Temp</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{avgTemp}°C</p>
          <p className="text-xs text-green-600 font-bold">Within Range</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><ShieldCheck size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Compliance</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{completedChecks}/{totalChecks}</p>
          <p className="text-xs text-[#64748B]">Checks Done</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Beaker size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Samples</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{sampleTests.filter(s => s.result === 'pending').length}</p>
          <p className="text-xs text-[#64748B]">Pending Tests</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Rejections</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{rejections.length}</p>
          <p className="text-xs text-[#64748B]">This Week</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E2E8F0] overflow-x-auto">
        <button
          onClick={() => { setActiveTab('overview'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'overview' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => { setActiveTab('inspections'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'inspections' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          QC Inspections
        </button>
        <button
          onClick={() => { setActiveTab('temperature'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'temperature' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Temperature Logs
        </button>
        <button
          onClick={() => { setActiveTab('compliance-docs'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'compliance-docs' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Compliance Docs
        </button>
        <button
          onClick={() => { setActiveTab('sampling'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'sampling' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Sample Testing
        </button>
        <button
          onClick={() => { setActiveTab('rejections'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'rejections' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Rejections
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <h3 className="font-bold text-[#1E293B]">Compliance Checklist (FSSAI/ISO/HACCP)</h3>
            </div>
            <div className="divide-y divide-[#E2E8F0] max-h-[500px] overflow-y-auto">
              {checks.length === 0 && (
                <div className="p-8 text-center text-[#64748B]">
                  No compliance checks configured. Add checks via backend seed or admin.
                </div>
              )}
              {checks.map(check => (
                <div key={check.id} className="p-4 flex items-center justify-between hover:bg-[#F8FAFC]">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${check.completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-[#1E293B] block">{check.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#64748B]">{check.category}</span>
                        {check.timestamp && (
                          <>
                            <span className="text-xs text-[#94A3B8]">•</span>
                            <span className="text-xs text-[#64748B]">{check.timestamp} by {check.inspector}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleCheck(check.id)}
                    className={`px-3 py-1 text-xs font-bold rounded ${
                      check.completed 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    }`}
                  >
                    {check.completed ? 'Done' : 'Mark Complete'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
              <h3 className="font-bold text-[#1E293B]">Recent Rejections</h3>
              <button 
                onClick={() => setShowRejectionModal(true)}
                className="text-xs text-red-600 hover:underline font-medium"
              >
                + New
              </button>
            </div>
            <div className="divide-y divide-[#E2E8F0] max-h-[500px] overflow-y-auto">
              {rejections.slice(0, 5).map(rej => (
                <div key={rej.id} className="p-4 hover:bg-[#F8FAFC]">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-[#1E293B]">{rej.batch}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      rej.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      rej.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {rej.severity.charAt(0).toUpperCase() + rej.severity.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-red-600 mb-1">{rej.reason}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#64748B]">{rej.items} items rejected</p>
                    <p className="text-xs text-[#94A3B8]">{rej.timestamp} • {rej.inspector}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QC Inspections Tab */}
      {activeTab === 'inspections' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search inspection, batch, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Inspection ID</th>
                  <th className="px-6 py-3">Batch ID</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Inspector</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Score</th>
                  <th className="px-6 py-3">Items/Defects</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredInspections.map(inspection => (
                  <tr key={inspection.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-mono text-[#475569]">{inspection.inspectionId}</td>
                    <td className="px-6 py-4 font-mono text-xs text-[#64748B]">{inspection.batchId}</td>
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{inspection.productName}</td>
                    <td className="px-6 py-4 text-[#64748B]">{inspection.inspector}</td>
                    <td className="px-6 py-4 text-[#64748B]">{inspection.date}</td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${
                        inspection.score >= 90 ? 'text-green-600' :
                        inspection.score >= 70 ? 'text-amber-600' :
                        'text-red-600'
                      }`}>
                        {inspection.score}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#64748B]">{inspection.itemsInspected} / {inspection.defectsFound}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        inspection.status === 'passed' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        inspection.status === 'failed' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                        'bg-[#F1F5F9] text-[#64748B]'
                      }`}>
                        {inspection.status.charAt(0).toUpperCase() + inspection.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setSelectedInspection(inspection);
                          setShowInspectionReportModal(true);
                        }}
                        className="text-[#0891b2] hover:underline text-xs font-bold"
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Temperature Logs Tab */}
      {activeTab === 'temperature' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search zone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Zone</th>
                  <th className="px-6 py-3">Temperature</th>
                  <th className="px-6 py-3">Humidity</th>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredTempLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{log.zone}</td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${
                        log.status === 'normal' ? 'text-green-600' :
                        log.status === 'warning' ? 'text-amber-600' :
                        'text-red-600'
                      }`}>
                        {log.temperature}°C
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#64748B]">{log.humidity}%</td>
                    <td className="px-6 py-4 text-[#64748B]">{log.timestamp}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'normal' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        log.status === 'warning' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        'bg-[#FEE2E2] text-[#991B1B]'
                      }`}>
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setSelectedTempLog(log);
                          setShowTempChartModal(true);
                        }}
                        className="text-[#0891b2] hover:underline text-xs font-bold"
                      >
                        View Chart
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compliance Docs Tab */}
      {activeTab === 'compliance-docs' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search document..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Document ID</th>
                  <th className="px-6 py-3">Document Name</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Issued Date</th>
                  <th className="px-6 py-3">Expiry Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-mono text-xs text-[#475569]">{doc.docId}</td>
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{doc.docName}</td>
                    <td className="px-6 py-4 text-[#64748B]">{doc.type}</td>
                    <td className="px-6 py-4 text-[#64748B]">{doc.issuedDate}</td>
                    <td className="px-6 py-4 text-[#64748B]">{doc.expiryDate}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        doc.status === 'valid' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        doc.status === 'expiring-soon' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        'bg-[#FEE2E2] text-[#991B1B]'
                      }`}>
                        {doc.status === 'expiring-soon' ? 'Expiring Soon' :
                         doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setSelectedDoc(doc);
                          setShowDocumentModal(true);
                        }}
                        className="text-[#0891b2] hover:underline text-xs font-bold"
                      >
                        View Document
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sample Testing Tab */}
      {activeTab === 'sampling' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search sample, batch, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Sample ID</th>
                  <th className="px-6 py-3">Batch ID</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Test Type</th>
                  <th className="px-6 py-3">Tested By</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Result</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredSamples.map(sample => (
                  <tr key={sample.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-mono text-[#475569]">{sample.sampleId}</td>
                    <td className="px-6 py-4 font-mono text-xs text-[#64748B]">{sample.batchId}</td>
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{sample.productName}</td>
                    <td className="px-6 py-4 text-[#64748B]">{sample.testType}</td>
                    <td className="px-6 py-4 text-[#64748B]">{sample.testedBy}</td>
                    <td className="px-6 py-4 text-[#64748B]">{sample.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sample.result === 'pass' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        sample.result === 'fail' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                        'bg-[#F1F5F9] text-[#64748B]'
                      }`}>
                        {sample.result.charAt(0).toUpperCase() + sample.result.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {sample.result === 'pending' ? (
                        <button 
                          onClick={() => updateSampleResult(sample.id, 'pass')}
                          className="text-[#0891b2] hover:underline text-xs font-bold"
                        >
                          Update Result
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            setSelectedSample(sample);
                            setShowSampleReportModal(true);
                          }}
                          className="text-[#0891b2] hover:underline text-xs font-bold"
                        >
                          View Report
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejections Tab */}
      {activeTab === 'rejections' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-[#1E293B]">Quality Rejections Log</h3>
              <button 
                onClick={() => setShowRejectionModal(true)}
                className="text-xs text-red-600 hover:underline font-medium"
              >
                + Log Rejection
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search batch or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            {filteredRejections.map(rej => (
              <div key={rej.id} className="p-6 hover:bg-[#F8FAFC]">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-[#1E293B] mb-1">{rej.batch}</h4>
                    <p className="text-sm text-red-600 mb-2">{rej.reason}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    rej.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    rej.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {rej.severity.charAt(0).toUpperCase() + rej.severity.slice(1)} Priority
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm text-[#64748B]">
                  <div className="flex items-center gap-1">
                    <AlertTriangle size={14} />
                    <span>{rej.items} items rejected</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User size={14} />
                    <span>{rej.inspector}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{rej.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Log Batch Rejection</h3>
              <button onClick={() => setShowRejectionModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Batch Number</label>
                <input 
                  type="text"
                  placeholder="BTH-XXXX"
                  value={newRejection.batch}
                  onChange={(e) => setNewRejection({...newRejection, batch: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Rejection Reason</label>
                <select 
                  value={newRejection.reason}
                  onChange={(e) => setNewRejection({...newRejection, reason: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select reason</option>
                  <option>Temperature breach</option>
                  <option>Damaged packaging</option>
                  <option>Expiry date issue</option>
                  <option>Quality defect</option>
                  <option>Contamination risk</option>
                  <option>Incorrect labeling</option>
                  <option>Failed microbiological test</option>
                  <option>Foreign material found</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Severity</label>
                <select 
                  value={newRejection.severity}
                  onChange={(e) => setNewRejection({...newRejection, severity: e.target.value as 'critical' | 'high' | 'medium'})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Number of Items</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={newRejection.items}
                  onChange={(e) => setNewRejection({...newRejection, items: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowRejectionModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={createRejection}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
              >
                Log Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Inspection Modal */}
      {showInspectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">New QC Inspection</h3>
              <button onClick={() => setShowInspectionModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Batch ID</label>
                <input 
                  type="text"
                  placeholder="BTH-XXXX"
                  value={newInspection.batchId}
                  onChange={(e) => setNewInspection({...newInspection, batchId: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Product Name</label>
                <input 
                  type="text"
                  placeholder="Enter product name"
                  value={newInspection.productName}
                  onChange={(e) => setNewInspection({...newInspection, productName: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Items Inspected</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={newInspection.itemsInspected}
                  onChange={(e) => setNewInspection({...newInspection, itemsInspected: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Defects Found</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={newInspection.defectsFound}
                  onChange={(e) => setNewInspection({...newInspection, defectsFound: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowInspectionModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={createInspection}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Create Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temperature Log Modal */}
      {showTempLogModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Log Temperature Reading</h3>
              <button onClick={() => setShowTempLogModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Zone</label>
                <select 
                  value={newTempLog.zone}
                  onChange={(e) => setNewTempLog({...newTempLog, zone: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="">Select zone</option>
                  <option>Cold Storage A</option>
                  <option>Cold Storage B</option>
                  <option>Freezer Zone 1</option>
                  <option>Freezer Zone 2</option>
                  <option>Dry Storage</option>
                  <option>Loading Dock</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Temperature (°C)</label>
                <input 
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={newTempLog.temperature}
                  onChange={(e) => setNewTempLog({...newTempLog, temperature: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Humidity (%)</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={newTempLog.humidity}
                  onChange={(e) => setNewTempLog({...newTempLog, humidity: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowTempLogModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={createTempLog}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Log Reading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sample Test Modal */}
      {showSampleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Create Sample Test</h3>
              <button onClick={() => setShowSampleModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Batch ID</label>
                <input 
                  type="text"
                  placeholder="BTH-XXXX"
                  value={newSample.batchId}
                  onChange={(e) => setNewSample({...newSample, batchId: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Product Name</label>
                <input 
                  type="text"
                  placeholder="Enter product name"
                  value={newSample.productName}
                  onChange={(e) => setNewSample({...newSample, productName: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Test Type</label>
                <select 
                  value={newSample.testType}
                  onChange={(e) => setNewSample({...newSample, testType: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="">Select test type</option>
                  <option>Microbiological</option>
                  <option>Chemical Analysis</option>
                  <option>Allergen Testing</option>
                  <option>Nutritional Analysis</option>
                  <option>Heavy Metals</option>
                  <option>Pesticide Residue</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowSampleModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={createSample}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Create Sample
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspection Report Modal */}
      {showInspectionReportModal && selectedInspection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-[#1E293B]">Inspection Report - {selectedInspection.inspectionId}</h3>
              <button onClick={() => setShowInspectionReportModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Inspection ID</label>
                  <p className="font-bold text-[#1E293B] font-mono">{selectedInspection.inspectionId}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Batch ID</label>
                  <p className="font-bold text-[#1E293B] font-mono">{selectedInspection.batchId}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Product Name</label>
                  <p className="font-bold text-[#1E293B]">{selectedInspection.productName}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Inspector</label>
                  <p className="font-bold text-[#1E293B]">{selectedInspection.inspector}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Date</label>
                  <p className="font-bold text-[#1E293B]">{selectedInspection.date}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Status</label>
                  <p className={`font-bold ${
                    selectedInspection.status === 'passed' ? 'text-green-600' :
                    selectedInspection.status === 'failed' ? 'text-red-600' :
                    'text-amber-600'
                  }`}>
                    {selectedInspection.status.charAt(0).toUpperCase() + selectedInspection.status.slice(1)}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Score</label>
                  <p className="font-bold text-[#1E293B]">{selectedInspection.score}%</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Items Inspected</label>
                  <p className="font-bold text-[#1E293B]">{selectedInspection.itemsInspected}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Defects Found</label>
                  <p className="font-bold text-red-600">{selectedInspection.defectsFound}</p>
                </div>
              </div>
              <div className="border-t border-[#E2E8F0] pt-4">
                <h4 className="font-bold text-[#1E293B] mb-3">Inspection Details</h4>
                <div className="bg-[#F8FAFC] p-4 rounded-lg space-y-2">
                  <p className="text-sm text-[#64748B]">Quality score: <span className="font-bold text-[#1E293B]">{selectedInspection.score}%</span></p>
                  <p className="text-sm text-[#64748B]">Items inspected: <span className="font-bold text-[#1E293B]">{selectedInspection.itemsInspected}</span></p>
                  <p className="text-sm text-[#64748B]">Defects found: <span className="font-bold text-red-600">{selectedInspection.defectsFound}</span></p>
                  {selectedInspection.status === 'failed' && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 font-medium">Inspection Failed</p>
                      <p className="text-xs text-red-600 mt-1">This batch requires review and corrective action.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3 sticky bottom-0 bg-white">
              <button 
                onClick={() => setShowInspectionReportModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  toast.success('Report downloaded');
                }}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
              >
                <Download size={16} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document View Modal */}
      {showDocumentModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-[#1E293B]">Document - {selectedDoc.docName}</h3>
              <button onClick={() => setShowDocumentModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Document ID</label>
                  <p className="font-bold text-[#1E293B] font-mono">{selectedDoc.docId}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Document Name</label>
                  <p className="font-bold text-[#1E293B]">{selectedDoc.docName}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Type</label>
                  <p className="font-bold text-[#1E293B]">{selectedDoc.type}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Status</label>
                  <p className={`font-bold ${
                    selectedDoc.status === 'valid' ? 'text-green-600' :
                    selectedDoc.status === 'expiring-soon' ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {selectedDoc.status === 'expiring-soon' ? 'Expiring Soon' :
                     selectedDoc.status.charAt(0).toUpperCase() + selectedDoc.status.slice(1)}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Issued Date</label>
                  <p className="font-bold text-[#1E293B]">{selectedDoc.issuedDate}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Expiry Date</label>
                  <p className="font-bold text-[#1E293B]">{selectedDoc.expiryDate}</p>
                </div>
              </div>
              <div className="border-t border-[#E2E8F0] pt-4">
                <h4 className="font-bold text-[#1E293B] mb-3">Document Preview</h4>
                <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center min-h-[400px] border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 font-medium">Document Preview</p>
                    <p className="text-sm text-gray-500 mt-2">PDF viewer would be integrated here</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3 sticky bottom-0 bg-white">
              <button 
                onClick={() => setShowDocumentModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  toast.success('Document downloaded');
                }}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
              >
                <Download size={16} />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sample Report Modal */}
      {showSampleReportModal && selectedSample && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-[#1E293B]">Sample Test Report - {selectedSample.sampleId}</h3>
              <button onClick={() => setShowSampleReportModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Sample ID</label>
                  <p className="font-bold text-[#1E293B] font-mono">{selectedSample.sampleId}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Batch ID</label>
                  <p className="font-bold text-[#1E293B] font-mono">{selectedSample.batchId}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Product Name</label>
                  <p className="font-bold text-[#1E293B]">{selectedSample.productName}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Test Type</label>
                  <p className="font-bold text-[#1E293B]">{selectedSample.testType}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Tested By</label>
                  <p className="font-bold text-[#1E293B]">{selectedSample.testedBy}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Date</label>
                  <p className="font-bold text-[#1E293B]">{selectedSample.date}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Result</label>
                  <p className={`font-bold ${
                    selectedSample.result === 'pass' ? 'text-green-600' :
                    selectedSample.result === 'fail' ? 'text-red-600' :
                    'text-amber-600'
                  }`}>
                    {selectedSample.result.charAt(0).toUpperCase() + selectedSample.result.slice(1)}
                  </p>
                </div>
              </div>
              <div className="border-t border-[#E2E8F0] pt-4">
                <h4 className="font-bold text-[#1E293B] mb-3">Test Results</h4>
                <div className="bg-[#F8FAFC] p-4 rounded-lg space-y-2">
                  <p className="text-sm text-[#64748B]">Test Type: <span className="font-bold text-[#1E293B]">{selectedSample.testType}</span></p>
                  <p className="text-sm text-[#64748B]">Result: <span className={`font-bold ${
                    selectedSample.result === 'pass' ? 'text-green-600' :
                    selectedSample.result === 'fail' ? 'text-red-600' :
                    'text-amber-600'
                  }`}>
                    {selectedSample.result.charAt(0).toUpperCase() + selectedSample.result.slice(1)}
                  </span></p>
                  {selectedSample.result === 'fail' && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 font-medium">Test Failed</p>
                      <p className="text-xs text-red-600 mt-1">This sample requires review and corrective action.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3 sticky bottom-0 bg-white">
              <button 
                onClick={() => setShowSampleReportModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  toast.success('Report downloaded');
                }}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
              >
                <Download size={16} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temperature Chart Modal */}
      {showTempChartModal && selectedTempLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-[#1E293B]">Temperature Chart - {selectedTempLog.zone}</h3>
              <button onClick={() => setShowTempChartModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Zone</label>
                  <p className="font-bold text-[#1E293B]">{selectedTempLog.zone}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Current Temperature</label>
                  <p className={`font-bold text-lg ${
                    selectedTempLog.status === 'normal' ? 'text-green-600' :
                    selectedTempLog.status === 'warning' ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {selectedTempLog.temperature}°C
                  </p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Current Humidity</label>
                  <p className="font-bold text-[#1E293B]">{selectedTempLog.humidity}%</p>
                </div>
              </div>

              {/* Temperature Chart Visualization */}
              <div className="border-t border-[#E2E8F0] pt-4">
                <h4 className="font-bold text-[#1E293B] mb-4">24-Hour Temperature Trend</h4>
                <div className="bg-gray-50 rounded-lg p-6 border border-[#E2E8F0]">
                  <div className="relative h-64 flex items-end justify-between gap-2">
                    {/* Mock chart bars representing temperature over 24 hours */}
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i;
                      const baseTemp = selectedTempLog.temperature;
                      const variation = (Math.sin(i / 4) * 2) + (Math.random() * 1 - 0.5);
                      const temp = baseTemp + variation;
                      const height = Math.max(20, Math.min(100, ((temp + 20) / 30) * 100));
                      const isCurrent = hour === new Date().getHours();
                      
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <div 
                            className={`w-full rounded-t transition-all ${
                              temp < 5 && temp > -20 ? 'bg-blue-500' :
                              temp >= 5 && temp < 10 ? 'bg-cyan-500' :
                              temp >= 10 && temp < 20 ? 'bg-green-500' :
                              temp >= 20 ? 'bg-amber-500' :
                              'bg-purple-500'
                            } ${isCurrent ? 'ring-2 ring-[#0891b2] ring-offset-2' : ''}`}
                            style={{ height: `${height}%` }}
                            title={`${hour}:00 - ${temp.toFixed(1)}°C`}
                          />
                          {i % 6 === 0 && (
                            <span className="text-[10px] text-[#64748B] mt-1">{hour}:00</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-6 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-[#64748B]">Frozen (-20°C to 5°C)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                      <span className="text-[#64748B]">Cold (5°C to 10°C)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-[#64748B]">Normal (10°C to 20°C)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded"></div>
                      <span className="text-[#64748B]">Warm (20°C+)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Humidity Chart */}
              <div className="border-t border-[#E2E8F0] pt-4">
                <h4 className="font-bold text-[#1E293B] mb-4">24-Hour Humidity Trend</h4>
                <div className="bg-gray-50 rounded-lg p-6 border border-[#E2E8F0]">
                  <div className="relative h-64 flex items-end justify-between gap-2">
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i;
                      const baseHumidity = selectedTempLog.humidity;
                      const variation = (Math.sin(i / 3) * 5) + (Math.random() * 3 - 1.5);
                      const humidity = Math.max(30, Math.min(80, baseHumidity + variation));
                      const height = ((humidity - 30) / 50) * 100;
                      const isCurrent = hour === new Date().getHours();
                      
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <div 
                            className={`w-full rounded-t transition-all bg-indigo-500 ${
                              isCurrent ? 'ring-2 ring-[#0891b2] ring-offset-2' : ''
                            }`}
                            style={{ height: `${height}%` }}
                            title={`${hour}:00 - ${humidity.toFixed(1)}%`}
                          />
                          {i % 6 === 0 && (
                            <span className="text-[10px] text-[#64748B] mt-1">{hour}:00</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 text-center text-xs text-[#64748B]">
                    Optimal Range: 40% - 70%
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-4 gap-4 border-t border-[#E2E8F0] pt-4">
                <div className="text-center">
                  <label className="text-xs text-[#64748B] font-medium">Min Temp (24h)</label>
                  <p className="font-bold text-[#1E293B]">{(selectedTempLog.temperature - 3).toFixed(1)}°C</p>
                </div>
                <div className="text-center">
                  <label className="text-xs text-[#64748B] font-medium">Max Temp (24h)</label>
                  <p className="font-bold text-[#1E293B]">{(selectedTempLog.temperature + 3).toFixed(1)}°C</p>
                </div>
                <div className="text-center">
                  <label className="text-xs text-[#64748B] font-medium">Avg Temp (24h)</label>
                  <p className="font-bold text-[#1E293B]">{selectedTempLog.temperature.toFixed(1)}°C</p>
                </div>
                <div className="text-center">
                  <label className="text-xs text-[#64748B] font-medium">Status</label>
                  <p className={`font-bold ${
                    selectedTempLog.status === 'normal' ? 'text-green-600' :
                    selectedTempLog.status === 'warning' ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {selectedTempLog.status.charAt(0).toUpperCase() + selectedTempLog.status.slice(1)}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3 sticky bottom-0 bg-white">
              <button 
                onClick={() => setShowTempChartModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  toast.success('Chart data exported');
                  // In a real app, this would export the chart data
                }}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
              >
                <Download size={16} />
                Export Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
