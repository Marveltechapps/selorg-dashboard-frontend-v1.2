import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  fetchDocuments,
  fetchCertifications,
  fetchAudits,
  fetchPolicies,
  fetchMetrics,
  fetchViolations,
  uploadDocument,
  scheduleAudit,
  updateFindingStatus,
  acknowledgePolicy,
  generateComplianceReport,
  ComplianceDocument,
  Certification,
  AuditRecord,
  Policy,
  ComplianceMetrics,
  ViolationAlert,
} from './complianceApi';
import { toast } from 'sonner';
import {
  FileCheck,
  RefreshCw,
  Plus,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  FileText,
  Award,
  ClipboardCheck,
  Calendar,
  TrendingUp,
  AlertCircle,
  Eye,
  Search,
  Filter,
  BarChart3,
} from 'lucide-react';

export function ComplianceCenter() {
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [violations, setViolations] = useState<ViolationAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showDocDetailsModal, setShowDocDetailsModal] = useState(false);
  const [showCertDetailsModal, setShowCertDetailsModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ComplianceDocument | null>(null);
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState<ComplianceDocument[]>([]);
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('all');

  // Form states
  const [uploadForm, setUploadForm] = useState<{
    name: string;
    type: ComplianceDocument['type'];
    category: ComplianceDocument['category'];
    description: string;
    file: File | null;
  }>({
    name: '',
    type: 'policy',
    category: 'legal',
    description: '',
    file: null,
  });

  const [auditForm, setAuditForm] = useState({
    name: '',
    type: 'internal' as AuditRecord['type'],
    auditor: '',
    scheduledDate: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docsData, certsData, auditsData, policiesData, metricsData, violationsData] = await Promise.all([
        fetchDocuments(),
        fetchCertifications(),
        fetchAudits(),
        fetchPolicies(),
        fetchMetrics(),
        fetchViolations(),
      ]);

      setDocuments(docsData);
      setFilteredDocuments(docsData);
      setCertifications(certsData);
      setAudits(auditsData);
      setPolicies(policiesData);
      setMetrics(metricsData);
      setViolations(violationsData);
    } catch (error) {
      toast.error('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadForm.file) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!uploadForm.name.trim()) {
      toast.error('Please enter a document name');
      return;
    }
    try {
      await uploadDocument({ ...uploadForm, file: uploadForm.file });
      toast.success('Document uploaded successfully');
      setShowUploadModal(false);
      setUploadForm({ name: '', type: 'policy', category: 'legal', description: '', file: null });
      loadData();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    }
  };

  const handleScheduleAudit = async () => {
    try {
      await scheduleAudit(auditForm);
      toast.success('Audit scheduled successfully');
      setShowAuditModal(false);
      setAuditForm({ name: '', type: 'internal', auditor: '', scheduledDate: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to schedule audit');
    }
  };

  const handleAcknowledgePolicy = async (policyId: string) => {
    try {
      await acknowledgePolicy(policyId);
      toast.success('Policy acknowledged');
      loadData();
    } catch (error) {
      toast.error('Failed to acknowledge policy');
    }
  };

  const handleGenerateReport = async () => {
    try {
      await generateComplianceReport();
      toast.success('Compliance report generated and downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate report');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { icon: any; className: string }> = {
      valid: { icon: CheckCircle, className: 'bg-emerald-500' },
      active: { icon: CheckCircle, className: 'bg-emerald-500' },
      'expiring-soon': { icon: AlertTriangle, className: 'bg-amber-500' },
      expired: { icon: XCircle, className: 'bg-rose-500' },
      'pending-renewal': { icon: Clock, className: 'bg-blue-500' },
      'under-review': { icon: Eye, className: 'bg-purple-500' },
      scheduled: { icon: Calendar, className: 'bg-blue-500' },
      'in-progress': { icon: Clock, className: 'bg-amber-500' },
      completed: { icon: CheckCircle, className: 'bg-emerald-500' },
      draft: { icon: FileText, className: 'bg-gray-400' },
      archived: { icon: XCircle, className: 'bg-gray-400' },
    };
    const config = statusMap[status] || { icon: FileText, className: 'bg-gray-400' };
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon size={12} className="mr-1" />
        {status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const severityMap: Record<string, string> = {
      critical: 'bg-rose-600',
      high: 'bg-rose-500',
      major: 'bg-orange-500',
      medium: 'bg-amber-500',
      minor: 'bg-blue-500',
      low: 'bg-blue-400',
      observation: 'bg-gray-400',
    };
    return (
      <Badge className={severityMap[severity] || 'bg-gray-400'}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, any> = {
      'data-protection': Shield,
      financial: BarChart3,
      operational: ClipboardCheck,
      legal: FileText,
      security: Shield,
      tax: FileCheck,
    };
    const Icon = iconMap[category] || FileText;
    return <Icon size={16} className="text-[#71717a]" />;
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const days = Math.floor((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-[#71717a]">Loading compliance data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Compliance Center</h1>
          <p className="text-[#71717a] text-sm">Manage regulatory documents, certifications, and audits</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={loadData} variant="outline">
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={handleGenerateReport}>
            <Download size={14} className="mr-1.5" /> Generate Report
          </Button>
          <Button size="sm" onClick={() => setShowUploadModal(true)}>
            <Upload size={14} className="mr-1.5" /> Upload Document
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Overall Score</p>
            <TrendingUp className="text-emerald-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{metrics?.overallScore}%</p>
          <p className="text-xs text-[#71717a] mt-2">Compliance health</p>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Documents</p>
            <FileText className="text-blue-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{metrics?.totalDocuments}</p>
          <p className="text-xs text-emerald-600 mt-2">{metrics?.validDocuments} valid</p>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Certifications</p>
            <Award className="text-purple-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-purple-600">{metrics?.activeCertifications}</p>
          <p className="text-xs text-[#71717a] mt-2">Active</p>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Audits</p>
            <ClipboardCheck className="text-amber-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-amber-600">{metrics?.completedAudits}</p>
          <p className="text-xs text-[#71717a] mt-2">Completed</p>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Open Findings</p>
            <AlertCircle className="text-rose-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-rose-600">{metrics?.openFindings}</p>
          <p className="text-xs text-rose-600 mt-2">{metrics?.criticalFindings} critical</p>
        </div>
      </div>

      {/* Violation Alerts */}
      {violations.length > 0 && (
        <div className="space-y-3">
          {violations.map((violation) => (
            <div
              key={violation.id}
              className={`border rounded-xl p-4 ${
                violation.severity === 'critical'
                  ? 'bg-rose-50 border-rose-200'
                  : violation.severity === 'high'
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={`flex-shrink-0 mt-0.5 ${
                    violation.severity === 'critical'
                      ? 'text-rose-600'
                      : violation.severity === 'high'
                      ? 'text-orange-600'
                      : 'text-amber-600'
                  }`}
                  size={20}
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3
                      className={`font-bold ${
                        violation.severity === 'critical'
                          ? 'text-rose-900'
                          : violation.severity === 'high'
                          ? 'text-orange-900'
                          : 'text-amber-900'
                      }`}
                    >
                      {violation.title}
                    </h3>
                    {getSeverityBadge(violation.severity)}
                  </div>
                  <p
                    className={`text-sm mb-2 ${
                      violation.severity === 'critical'
                        ? 'text-rose-800'
                        : violation.severity === 'high'
                        ? 'text-orange-800'
                        : 'text-amber-800'
                    }`}
                  >
                    {violation.description}
                  </p>
                  <div className="flex gap-4 text-xs">
                    <span
                      className={
                        violation.severity === 'critical'
                          ? 'text-rose-700'
                          : violation.severity === 'high'
                          ? 'text-orange-700'
                          : 'text-amber-700'
                      }
                    >
                      Area: {violation.affectedArea}
                    </span>
                    <span
                      className={
                        violation.severity === 'critical'
                          ? 'text-rose-700'
                          : violation.severity === 'high'
                          ? 'text-orange-700'
                          : 'text-amber-700'
                      }
                    >
                      Assigned: {violation.assignedTo}
                    </span>
                    <span
                      className={
                        violation.severity === 'critical'
                          ? 'text-rose-700'
                          : violation.severity === 'high'
                          ? 'text-orange-700'
                          : 'text-amber-700'
                      }
                    >
                      Status: {violation.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">
            <FileText size={14} className="mr-1.5" /> Documents
          </TabsTrigger>
          <TabsTrigger value="certifications">
            <Award size={14} className="mr-1.5" /> Certifications
          </TabsTrigger>
          <TabsTrigger value="audits">
            <ClipboardCheck size={14} className="mr-1.5" /> Audits
          </TabsTrigger>
          <TabsTrigger value="policies">
            <Shield size={14} className="mr-1.5" /> Policies
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#18181b]">Compliance Documents</h3>
                <p className="text-xs text-[#71717a] mt-1">All regulatory and legal documents</p>
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Search documents..." 
                  className="w-64"
                  value={docSearchQuery}
                  onChange={(e) => {
                    const query = e.target.value.toLowerCase();
                    setDocSearchQuery(e.target.value);
                    let filtered = documents.filter(doc => 
                      doc.name.toLowerCase().includes(query) ||
                      doc.type.toLowerCase().includes(query) ||
                      doc.category.toLowerCase().includes(query) ||
                      doc.status.toLowerCase().includes(query)
                    );
                    // Apply type filter
                    if (docTypeFilter !== 'all') {
                      filtered = filtered.filter(doc => doc.type === docTypeFilter);
                    }
                    // Apply category filter
                    if (docCategoryFilter !== 'all') {
                      filtered = filtered.filter(doc => doc.category === docCategoryFilter);
                    }
                    setFilteredDocuments(filtered);
                  }}
                />
                <Select value={docTypeFilter} onValueChange={(val) => {
                  setDocTypeFilter(val);
                  let filtered = documents;
                  if (docSearchQuery) {
                    const query = docSearchQuery.toLowerCase();
                    filtered = filtered.filter(doc => 
                      doc.name.toLowerCase().includes(query) ||
                      doc.type.toLowerCase().includes(query) ||
                      doc.category.toLowerCase().includes(query)
                    );
                  }
                  if (val !== 'all') {
                    filtered = filtered.filter(doc => doc.type === val);
                  }
                  if (docCategoryFilter !== 'all') {
                    filtered = filtered.filter(doc => doc.category === docCategoryFilter);
                  }
                  setFilteredDocuments(filtered);
                }}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="license">License</SelectItem>
                    <SelectItem value="permit">Permit</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="registration">Registration</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={docCategoryFilter} onValueChange={(val) => {
                  setDocCategoryFilter(val);
                  let filtered = documents;
                  if (docSearchQuery) {
                    const query = docSearchQuery.toLowerCase();
                    filtered = filtered.filter(doc => 
                      doc.name.toLowerCase().includes(query) ||
                      doc.type.toLowerCase().includes(query) ||
                      doc.category.toLowerCase().includes(query)
                    );
                  }
                  if (docTypeFilter !== 'all') {
                    filtered = filtered.filter(doc => doc.type === docTypeFilter);
                  }
                  if (val !== 'all') {
                    filtered = filtered.filter(doc => doc.category === val);
                  }
                  setFilteredDocuments(filtered);
                }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="data-protection">Data Protection</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="tax">Tax</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setDocSearchQuery('');
                    setDocTypeFilter('all');
                    setDocCategoryFilter('all');
                    setFilteredDocuments(documents);
                    toast.info('Filters cleared');
                  }}
                >
                  <Filter size={14} className="mr-1.5" /> Filter
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(docSearchQuery || docTypeFilter !== 'all' || docCategoryFilter !== 'all' ? filteredDocuments : documents).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-[#71717a]">
                      {documents.length === 0
                        ? 'No compliance documents yet. Upload a regulatory document to get started.'
                        : 'No documents match your filters.'}
                    </TableCell>
                  </TableRow>
                ) : (docSearchQuery || docTypeFilter !== 'all' || docCategoryFilter !== 'all' ? filteredDocuments : documents).map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(doc.category)}
                        <div>
                          <div className="font-medium text-sm">{doc.name}</div>
                          <div className="text-xs text-[#71717a]">{doc.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {doc.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs capitalize">{doc.category.replace('-', ' ')}</TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell className="text-sm font-mono">v{doc.version}</TableCell>
                    <TableCell>
                      {doc.expiresAt ? (
                        <div className="text-xs">
                          <div className="font-medium text-[#18181b]">
                            {new Date(doc.expiresAt).toLocaleDateString()}
                          </div>
                          {doc.status === 'expiring-soon' && (
                            <div className="text-amber-600">
                              {getDaysUntilExpiry(doc.expiresAt)} days left
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[#71717a]">No expiry</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-[#71717a]">{doc.fileSize}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => {
                            setSelectedDoc(doc);
                            setShowDocDetailsModal(true);
                          }}
                        >
                          <Eye size={14} />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const content = `Compliance Document: ${doc.name}\nVersion: ${doc.version}\nCategory: ${doc.category}\nStatus: ${doc.status}\nLast Updated: ${new Date(doc.lastUpdated ?? doc.uploadedAt).toLocaleString()}`;
                            const blob = new Blob([content], { type: 'text/plain' });
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${doc.name}-v${doc.version}.txt`;
                            link.style.display = 'none';
                            document.body.appendChild(link);
                            requestAnimationFrame(() => {
                              link.click();
                              setTimeout(() => {
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                              }, 100);
                            });
                            toast.success(`${doc.name} downloaded`);
                          }}
                        >
                          <Download size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Certifications Tab */}
        <TabsContent value="certifications">
          <div className="grid grid-cols-2 gap-4">
            {certifications.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
                <Award className="text-[#71717a] mb-4" size={48} />
                <p className="text-[#71717a]">No certifications yet.</p>
                <p className="text-sm text-[#a1a1aa] mt-1">Add certifications when they become available.</p>
              </div>
            ) : certifications.map((cert) => (
              <div
                key={cert.id}
                className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Cert Header */}
                <div
                  className={`p-4 border-b border-[#e4e4e7] ${
                    cert.status === 'active'
                      ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50'
                      : cert.status === 'expiring-soon'
                      ? 'bg-gradient-to-r from-amber-50 to-amber-100/50'
                      : 'bg-gradient-to-r from-gray-50 to-gray-100/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <Award
                          className={
                            cert.status === 'active'
                              ? 'text-emerald-600'
                              : cert.status === 'expiring-soon'
                              ? 'text-amber-600'
                              : 'text-gray-600'
                          }
                          size={24}
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#18181b]">{cert.name}</h3>
                        <p className="text-xs text-[#71717a]">{cert.issuer}</p>
                      </div>
                    </div>
                    {getStatusBadge(cert.status)}
                  </div>
                  <p className="text-sm text-[#52525b]">{cert.scope}</p>
                </div>

                {/* Cert Body */}
                <div className="p-4">
                  {/* Cert Details */}
                  <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                    <div>
                      <span className="text-[#71717a]">Cert Number:</span>{' '}
                      <span className="font-medium text-[#18181b] font-mono">{cert.certNumber}</span>
                    </div>
                    <div>
                      <span className="text-[#71717a]">Score:</span>{' '}
                      {cert.score ? (
                        <span className="font-bold text-emerald-600">{cert.score}%</span>
                      ) : (
                        <span className="text-[#71717a]">N/A</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[#71717a]">Issued:</span>{' '}
                      <span className="font-medium text-[#18181b]">
                        {new Date(cert.issuedDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#71717a]">Expires:</span>{' '}
                      <span
                        className={`font-medium ${
                          cert.status === 'expiring-soon' ? 'text-amber-600' : 'text-[#18181b]'
                        }`}
                      >
                        {new Date(cert.expiryDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Days Until Expiry */}
                  {cert.status !== 'expired' && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#71717a]">Days Until Expiry</span>
                        <span className="font-medium text-[#18181b]">
                          {getDaysUntilExpiry(cert.expiryDate)} days
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#e4e4e7] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            getDaysUntilExpiry(cert.expiryDate) < 60
                              ? 'bg-rose-500'
                              : getDaysUntilExpiry(cert.expiryDate) < 180
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              (getDaysUntilExpiry(cert.expiryDate) / 365) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Auditor Info */}
                  <div className="bg-[#f4f4f5] rounded-lg p-3 mb-4 text-xs">
                    <div className="font-medium text-[#18181b] mb-1">Audited By: {cert.auditedBy}</div>
                    <div className="text-[#71717a]">
                      Next Audit: {new Date(cert.nextAudit).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedCert(cert);
                        setShowCertDetailsModal(true);
                      }}
                    >
                      <Eye size={14} className="mr-1" /> View Details
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        // Create download link for certificate
                        const content = `Certificate: ${cert.name}\nCert Number: ${cert.certNumber}\nIssuer: ${cert.issuer}\nStatus: ${cert.status}\nIssued: ${new Date(cert.issuedDate).toLocaleDateString()}\nExpires: ${new Date(cert.expiryDate).toLocaleDateString()}\nScore: ${cert.score || 'N/A'}%`;
                        const blob = new Blob([content], { type: 'text/plain' });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${cert.name}-${cert.certNumber}.txt`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        toast.success(`${cert.name} downloaded`);
                      }}
                    >
                      <Download size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Audits Tab */}
        <TabsContent value="audits">
          <div className="space-y-4">
            {/* Schedule Audit Button */}
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowAuditModal(true)}>
                <Plus size={14} className="mr-1.5" /> Schedule Audit
              </Button>
            </div>

            {/* Audits List */}
            {audits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#e4e4e7] rounded-xl">
                <ClipboardCheck className="text-[#71717a] mb-4" size={48} />
                <p className="text-[#71717a]">No audits yet.</p>
                <p className="text-sm text-[#a1a1aa] mt-1">Schedule an audit to track compliance reviews.</p>
                <Button size="sm" className="mt-4" onClick={() => setShowAuditModal(true)}>
                  <Plus size={14} className="mr-1.5" /> Schedule Audit
                </Button>
              </div>
            ) : audits.map((audit) => (
              <div
                key={audit.id}
                className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm"
              >
                <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-[#18181b]">{audit.name}</h3>
                        {getStatusBadge(audit.status)}
                        <Badge variant="outline" className="text-xs">
                          {audit.type}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-[#71717a]">Auditor:</span>{' '}
                          <span className="font-medium text-[#18181b]">{audit.auditor}</span>
                        </div>
                        <div>
                          <span className="text-[#71717a]">Organization:</span>{' '}
                          <span className="font-medium text-[#18181b]">{audit.auditorOrg}</span>
                        </div>
                        <div>
                          <span className="text-[#71717a]">Scheduled:</span>{' '}
                          <span className="font-medium text-[#18181b]">
                            {new Date(audit.scheduledDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {audit.overallScore !== undefined && (
                      <div className="text-right">
                        <div className="text-3xl font-bold text-emerald-600">{audit.overallScore}%</div>
                        <div className="text-xs text-[#71717a]">Overall Score</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  {/* Scope */}
                  <div className="mb-4">
                    <h4 className="text-sm font-bold text-[#18181b] mb-2">Audit Scope</h4>
                    <div className="flex flex-wrap gap-2">
                      {audit.scope.map((item, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Findings Summary */}
                  {audit.status === 'completed' && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-rose-600">{audit.criticalIssues}</div>
                        <div className="text-xs text-rose-700">Critical</div>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-orange-600">{audit.majorIssues}</div>
                        <div className="text-xs text-orange-700">Major</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">{audit.minorIssues}</div>
                        <div className="text-xs text-blue-700">Minor</div>
                      </div>
                    </div>
                  )}

                  {/* Findings */}
                  {audit.findings.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-[#18181b] mb-2">Findings</h4>
                      <div className="space-y-2">
                        {audit.findings.map((finding) => (
                          <div
                            key={finding.id}
                            className="bg-[#f4f4f5] rounded-lg p-3 border border-[#e4e4e7]"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getSeverityBadge(finding.severity)}
                                  <span className="font-medium text-sm text-[#18181b]">{finding.title}</span>
                                </div>
                                <p className="text-xs text-[#52525b]">{finding.description}</p>
                              </div>
                              <Badge
                                variant="outline"
                                className={
                                  finding.status === 'resolved'
                                    ? 'border-emerald-500 text-emerald-600'
                                    : finding.status === 'in-progress'
                                    ? 'border-amber-500 text-amber-600'
                                    : 'border-rose-500 text-rose-600'
                                }
                              >
                                {finding.status}
                              </Badge>
                            </div>
                            <div className="flex gap-4 text-xs text-[#71717a]">
                              <span>Assigned: {finding.assignedTo}</span>
                              <span>Due: {new Date(finding.dueDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Internal Policies</h3>
              <p className="text-xs text-[#71717a] mt-1">Company policies requiring employee acknowledgment</p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Acknowledgment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-[#71717a]">
                      No policies yet. Policies are managed by your compliance team.
                    </TableCell>
                  </TableRow>
                ) : policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{policy.name}</div>
                      <div className="text-xs text-[#71717a]">{policy.id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {policy.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">v{policy.version}</TableCell>
                    <TableCell>{getStatusBadge(policy.status)}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(policy.effectiveDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {policy.requiresAcknowledgment ? (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 h-2 bg-[#e4e4e7] rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  policy.acknowledgmentRate === 100
                                    ? 'bg-emerald-500'
                                    : policy.acknowledgmentRate > 80
                                    ? 'bg-blue-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${policy.acknowledgmentRate}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-[#18181b] min-w-[3rem]">
                              {policy.acknowledgmentRate}%
                            </span>
                          </div>
                          <div className="text-xs text-[#71717a]">
                            {policy.acknowledgedEmployees}/{policy.totalEmployees} employees
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[#71717a]">Not required</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedPolicy(policy);
                            setShowPolicyModal(true);
                          }}
                        >
                          <Eye size={14} />
                        </Button>
                        {policy.requiresAcknowledgment && policy.acknowledgmentRate < 100 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await handleAcknowledgePolicy(policy.id);
                                toast.success('Policy acknowledged successfully');
                                loadData();
                              } catch (error) {
                                toast.error('Failed to acknowledge policy');
                              }
                            }}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Document Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Compliance Document</DialogTitle>
            <DialogDescription>Add a new regulatory or policy document</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#18181b] mb-1 block">Document Name</label>
              <Input
                placeholder="e.g., ISO 27001 Certificate"
                value={uploadForm.name}
                onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">Type</label>
                <Select
                  value={uploadForm.type}
                  onValueChange={(value: any) => setUploadForm({ ...uploadForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="license">License</SelectItem>
                    <SelectItem value="audit">Audit Report</SelectItem>
                    <SelectItem value="report">Compliance Report</SelectItem>
                    <SelectItem value="agreement">Agreement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">Category</label>
                <Select
                  value={uploadForm.category}
                  onValueChange={(value: any) => setUploadForm({ ...uploadForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data-protection">Data Protection</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="tax">Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#18181b] mb-1 block">Description</label>
              <Textarea
                placeholder="Brief description of the document"
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="bg-[#f4f4f5] rounded-lg p-4 border-2 border-dashed border-[#d4d4d8] text-center">
              <input
                type="file"
                id="document-upload"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      toast.error('File size must be less than 10MB');
                      return;
                    }
                    setUploadForm({ ...uploadForm, file });
                    toast.success(`File selected: ${file.name}`);
                  }
                }}
                className="hidden"
              />
              <label htmlFor="document-upload" className="cursor-pointer">
                <Upload className="mx-auto mb-2 text-[#71717a]" size={32} />
                <p className="text-sm text-[#71717a]">Drop file here or click to upload</p>
                <p className="text-xs text-[#a1a1aa] mt-1">PDF, DOC, DOCX, JPG, PNG, GIF, WEBP (Max 10MB)</p>
              </label>
              {uploadForm.file && (
                <div className="mt-3 p-2 bg-white rounded border border-[#e4e4e7]">
                  <p className="text-sm font-medium text-[#18181b]">Selected: {uploadForm.file.name}</p>
                  <p className="text-xs text-[#71717a]">Size: {(uploadForm.file.size / 1024).toFixed(2)} KB</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadDocument}>Upload Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Audit Modal */}
      <Dialog open={showAuditModal} onOpenChange={setShowAuditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule New Audit</DialogTitle>
            <DialogDescription>Plan a compliance or security audit</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#18181b] mb-1 block">Audit Name</label>
              <Input
                placeholder="e.g., Q1 2025 Security Audit"
                value={auditForm.name}
                onChange={(e) => setAuditForm({ ...auditForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">Type</label>
                <Select
                  value={auditForm.type}
                  onValueChange={(value: any) => setAuditForm({ ...auditForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                    <SelectItem value="regulatory">Regulatory</SelectItem>
                    <SelectItem value="third-party">Third-Party</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">Scheduled Date</label>
                <Input
                  type="date"
                  value={auditForm.scheduledDate}
                  onChange={(e) => setAuditForm({ ...auditForm, scheduledDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#18181b] mb-1 block">Auditor Name</label>
              <Input
                placeholder="e.g., Sarah Chen"
                value={auditForm.auditor}
                onChange={(e) => setAuditForm({ ...auditForm, auditor: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleAudit}>Schedule Audit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Details Modal */}
      <Dialog open={showDocDetailsModal} onOpenChange={setShowDocDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.name}</DialogTitle>
            <DialogDescription>{selectedDoc?.description}</DialogDescription>
          </DialogHeader>

          {selectedDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#f4f4f5] rounded-lg p-3">
                  <p className="text-xs text-[#71717a] mb-1">Document ID</p>
                  <p className="font-mono text-sm text-[#18181b]">{selectedDoc.id}</p>
                </div>
                <div className="bg-[#f4f4f5] rounded-lg p-3">
                  <p className="text-xs text-[#71717a] mb-1">Status</p>
                  {getStatusBadge(selectedDoc.status)}
                </div>
                <div className="bg-[#f4f4f5] rounded-lg p-3">
                  <p className="text-xs text-[#71717a] mb-1">Version</p>
                  <p className="font-mono text-sm text-[#18181b]">v{selectedDoc.version}</p>
                </div>
                <div className="bg-[#f4f4f5] rounded-lg p-3">
                  <p className="text-xs text-[#71717a] mb-1">File Size</p>
                  <p className="text-sm text-[#18181b]">{selectedDoc.fileSize}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-[#18181b] mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDoc.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#71717a]">Uploaded:</span>{' '}
                  <span className="font-medium text-[#18181b]">
                    {new Date(selectedDoc.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[#71717a]">Uploaded By:</span>{' '}
                  <span className="font-medium text-[#18181b]">{selectedDoc.uploadedBy}</span>
                </div>
                {selectedDoc.expiresAt && (
                  <>
                    <div>
                      <span className="text-[#71717a]">Expires:</span>{' '}
                      <span className="font-medium text-[#18181b]">
                        {new Date(selectedDoc.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#71717a]">Days Until Expiry:</span>{' '}
                      <span className="font-medium text-[#18181b]">
                        {getDaysUntilExpiry(selectedDoc.expiresAt)} days
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocDetailsModal(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!selectedDoc) return;
                const content = `Compliance Document: ${selectedDoc.name}\nVersion: ${selectedDoc.version}\nType: ${selectedDoc.type}\nCategory: ${selectedDoc.category}\nStatus: ${selectedDoc.status}\nLast Updated: ${new Date(selectedDoc.lastUpdated).toLocaleString()}\nUploaded: ${new Date(selectedDoc.uploadedAt).toLocaleDateString()}\nUploaded By: ${selectedDoc.uploadedBy}${selectedDoc.expiresAt ? `\nExpires: ${new Date(selectedDoc.expiresAt).toLocaleDateString()}` : ''}`;
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${selectedDoc.name}-v${selectedDoc.version}.txt`;
                link.setAttribute('download', link.download);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                toast.success(`${selectedDoc.name} downloaded`);
              }}
            >
              <Download size={14} className="mr-1.5" /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certification Details Modal */}
      <Dialog open={showCertDetailsModal} onOpenChange={setShowCertDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="text-emerald-600" size={24} />
              {selectedCert?.name}
            </DialogTitle>
            <DialogDescription>{selectedCert?.issuer}</DialogDescription>
          </DialogHeader>

          {selectedCert && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#f4f4f5] rounded-lg p-3">
                  <p className="text-xs text-[#71717a] mb-1">Status</p>
                  {getStatusBadge(selectedCert.status)}
                </div>
                <div className="bg-[#f4f4f5] rounded-lg p-3">
                  <p className="text-xs text-[#71717a] mb-1">Score</p>
                  <p className="text-lg font-bold text-emerald-600">{selectedCert.score}%</p>
                </div>
                <div className="bg-[#f4f4f5] rounded-lg p-3">
                  <p className="text-xs text-[#71717a] mb-1">Attachments</p>
                  <p className="text-lg font-bold text-[#18181b]">{selectedCert.attachments}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-[#18181b] mb-2">Scope</h4>
                <p className="text-sm text-[#52525b] bg-[#f4f4f5] rounded-lg p-3">{selectedCert.scope}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#71717a]">Cert Number:</span>{' '}
                  <span className="font-mono font-medium text-[#18181b]">{selectedCert.certNumber}</span>
                </div>
                <div>
                  <span className="text-[#71717a]">Audited By:</span>{' '}
                  <span className="font-medium text-[#18181b]">{selectedCert.auditedBy}</span>
                </div>
                <div>
                  <span className="text-[#71717a]">Issued:</span>{' '}
                  <span className="font-medium text-[#18181b]">
                    {new Date(selectedCert.issuedDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[#71717a]">Expires:</span>{' '}
                  <span className="font-medium text-[#18181b]">
                    {new Date(selectedCert.expiryDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[#71717a]">Next Audit:</span>{' '}
                  <span className="font-medium text-[#18181b]">
                    {new Date(selectedCert.nextAudit).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[#71717a]">Days Until Expiry:</span>{' '}
                  <span className="font-medium text-[#18181b]">
                    {getDaysUntilExpiry(selectedCert.expiryDate)} days
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCertDetailsModal(false)}>
              Close
            </Button>
            <Button onClick={() => {
              if (selectedCert) {
                const link = document.createElement('a');
                link.href = `#certificate-${selectedCert.id}`;
                link.download = `${selectedCert.name}-${selectedCert.certNumber}.pdf`;
                toast.info(`Downloading ${selectedCert.name}...`);
                setTimeout(() => {
                  toast.success(`${selectedCert.name} downloaded`);
                }, 500);
              }
            }}>
              <Download size={14} className="mr-1.5" /> Download Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Policy View Modal */}
      <Dialog open={showPolicyModal} onOpenChange={setShowPolicyModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{selectedPolicy?.name}</DialogTitle>
            <DialogDescription>
              Policy Version {selectedPolicy?.version} • Effective: {selectedPolicy?.effectiveDate ? new Date(selectedPolicy.effectiveDate).toLocaleDateString() : 'N/A'}
            </DialogDescription>
          </DialogHeader>
          {selectedPolicy && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-[#52525b] mt-1">{selectedPolicy.description || 'No description provided.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p className="text-sm text-[#52525b] mt-1 capitalize">{selectedPolicy.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedPolicy.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Owner</Label>
                  <p className="text-sm text-[#52525b] mt-1">{selectedPolicy.owner}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Approved By</Label>
                  <p className="text-sm text-[#52525b] mt-1">{selectedPolicy.approvedBy}</p>
                </div>
              </div>
              {selectedPolicy.requiresAcknowledgment && (
                <div>
                  <Label className="text-sm font-medium">Acknowledgment Status</Label>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-[#71717a] mb-1">
                      <span>{selectedPolicy.acknowledgedEmployees} / {selectedPolicy.totalEmployees} employees</span>
                      <span>{selectedPolicy.acknowledgmentRate}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#e4e4e7] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          selectedPolicy.acknowledgmentRate === 100
                            ? 'bg-emerald-500'
                            : selectedPolicy.acknowledgmentRate > 80
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${selectedPolicy.acknowledgmentRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setShowPolicyModal(false)}>
              Close
            </Button>
            {selectedPolicy?.requiresAcknowledgment && selectedPolicy.acknowledgmentRate < 100 && (
              <Button onClick={async () => {
                try {
                  await handleAcknowledgePolicy(selectedPolicy.id);
                  toast.success('Policy acknowledged successfully');
                  setShowPolicyModal(false);
                  loadData();
                } catch (error) {
                  toast.error('Failed to acknowledge policy');
                }
              }}>
                Acknowledge Policy
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
