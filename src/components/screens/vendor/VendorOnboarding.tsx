import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  UserPlus, 
  FileCheck, 
  AlertCircle, 
  Search, 
  X, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  MoreVertical,
  Clock,
  Shield,
  FileText,
  Eye,
  Bell,
  Check,
  Upload,
  File,
  Star,
  StickyNote,
  User,
  History,
  Calendar,
  MessageSquare,
  Flag,
  Edit,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { exportToPDF } from '../../../utils/pdfExport';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from '../../ui/page-header';
import { EmptyState } from '../../ui/ux-components';

import * as vendorManagementApi from '../../../api/vendor/vendorManagement.api';

// Types
interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'Farmer' | 'Distributor' | 'Aggregator' | 'Third-party';
  category: string;
  submissionDate: string;
  stage: VendorStage;
  docsStatus: 'ok' | 'missing' | 'incomplete';
  registrationDate: string;
  daysInStage: number;
  documents: Document[];
  activityLog: Activity[];
  tier?: 'Gold' | 'Silver' | 'Bronze';
  contractSigned?: boolean;
  contractId?: string;
}

type VendorStage = 
  | 'new_request' 
  | 'kyc_verification' 
  | 'docs_verification' 
  | 'review_pending' 
  | 'contract' 
  | 'tier_assignment' 
  | 'approved' 
  | 'rejected';

interface Document {
  name: string;
  status: 'verified' | 'missing' | 'pending';
  uploadedAt?: string;
}

interface Activity {
  action: string;
  user: string;
  timestamp: string;
}

type ModalType = 
  | 'invite' 
  | 'approve' 
  | 'reject' 
  | 'nudge' 
  | 'review' 
  | 'reRequestDocs' 
  | 'viewContract' 
  | 'assignTier' 
  | 'addNote' 
  | 'downloadDocs'
  | 'activityLog'
  | 'scheduleMeeting'
  | 'sendMessage'
  | 'flagVendor'
  | 'editInfo'
  | null;


// Helper function to get stage badge styling
function getStageBadgeStyle(stage: VendorStage | string) {
  const styles: { [key: string]: { bg: string; text: string; label: string } } = {
    new_request: { bg: '#EFF6FF', text: '#1E40AF', label: 'New Request' },
    kyc_verification: { bg: '#FEF3C7', text: '#92400E', label: 'KYC Verification' },
    docs_verification: { bg: '#FEF3C7', text: '#92400E', label: 'Docs Verification' },
    review_pending: { bg: '#EFF6FF', text: '#1E40AF', label: 'Review Pending' },
    contract: { bg: '#E9D5FF', text: '#6B21A8', label: 'Contract' },
    tier_assignment: { bg: '#E9D5FF', text: '#6B21A8', label: 'Tier Assignment' },
    approved: { bg: '#DCFCE7', text: '#166534', label: 'Approved' },
    rejected: { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' },
    // Map common API stage values
    pending: { bg: '#EFF6FF', text: '#1E40AF', label: 'New Request' },
    active: { bg: '#DCFCE7', text: '#166534', label: 'Approved' },
    inactive: { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' }
  };
  return styles[stage] || { bg: '#F3F4F6', text: '#6B7280', label: String(stage || 'Unknown') };
}

function mapApiVendorToLocal(item: any): Vendor {
  let stage: VendorStage = 'new_request';
  if (item.stage) {
    const stageMap: { [key: string]: VendorStage } = {
      'pending': 'new_request',
      'active': 'approved',
      'inactive': 'rejected',
      'new_request': 'new_request',
      'kyc_verification': 'kyc_verification',
      'docs_verification': 'docs_verification',
      'review_pending': 'review_pending',
      'contract': 'contract',
      'tier_assignment': 'tier_assignment',
      'approved': 'approved',
      'rejected': 'rejected'
    };
    stage = stageMap[String(item.stage).toLowerCase()] || 'new_request';
  }
  return {
    id: item.code || item._id || item.id || `VND-${Date.now()}`,
    name: item.name || 'Unknown Vendor',
    email: item.contact?.email || item.email || '',
    phone: item.contact?.phone || item.phone || '',
    type: (item.metadata?.vendorType || item.type || 'Farmer') as Vendor['type'],
    category: item.metadata?.category || item.category || 'General',
    submissionDate: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
    stage,
    docsStatus: (item.docsStatus || 'incomplete') as Vendor['docsStatus'],
    registrationDate: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
    daysInStage: item.daysInStage || 0,
    documents: item.documents || [],
    activityLog: item.activityLog || [],
    tier: item.metadata?.tier as Vendor['tier'],
    contractSigned: item.contractSigned || false,
    contractId: item.contractId
  };
}

export function VendorOnboarding() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  const loadVendors = React.useCallback(async () => {
    try {
      setLoadingVendors(true);
      const resp = await vendorManagementApi.listVendors({ page: 1, pageSize: 100 });
      const items = resp?.data ?? resp?.items ?? resp;
      if (Array.isArray(items)) {
        setVendors(items.map(mapApiVendorToLocal));
      } else {
        setVendors([]);
      }
    } catch (err: any) {
      console.error('Failed to load vendors from API', err);
      toast.error(err?.message || 'Failed to load vendors');
      setVendors([]);
    } finally {
      setLoadingVendors(false);
    }
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<VendorStage | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalVendor, setModalVendor] = useState<Vendor | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);
  const [dropdownDirection, setDropdownDirection] = useState<{ [key: string]: 'up' | 'down' }>({});

  const downloadDocument = (doc: Document, vendor: Vendor) => {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${doc.name} - ${vendor.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1F2937; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
            h2 { color: #4F46E5; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #E5E7EB; padding: 12px; text-align: left; }
            th { background-color: #F9FAFB; font-weight: bold; color: #1F2937; }
            .section { margin: 30px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Vendor Document Report</h1>
          <h2>${doc.name}</h2>
          
          <div class="section">
            <h3>Document Information</h3>
            <table>
              <tr><th>Field</th><th>Value</th></tr>
              <tr><td>Document Name</td><td>${doc.name}</td></tr>
              <tr><td>Status</td><td>${doc.status}</td></tr>
              ${doc.uploadedAt ? `<tr><td>Uploaded At</td><td>${doc.uploadedAt}</td></tr>` : ''}
            </table>
          </div>

          <div class="section">
            <h3>Vendor Information</h3>
            <table>
              <tr><th>Field</th><th>Value</th></tr>
              <tr><td>Vendor ID</td><td>${vendor.id}</td></tr>
              <tr><td>Vendor Name</td><td>${vendor.name}</td></tr>
              <tr><td>Email</td><td>${vendor.email}</td></tr>
              <tr><td>Phone</td><td>${vendor.phone}</td></tr>
              <tr><td>Type</td><td>${vendor.type}</td></tr>
              <tr><td>Category</td><td>${vendor.category}</td></tr>
              <tr><td>Stage</td><td>${getStageBadgeStyle(vendor.stage).label}</td></tr>
              <tr><td>Documents Status</td><td>${vendor.docsStatus}</td></tr>
              <tr><td>Registration Date</td><td>${vendor.registrationDate}</td></tr>
              <tr><td>Submission Date</td><td>${vendor.submissionDate}</td></tr>
              <tr><td>Days in Current Stage</td><td>${vendor.daysInStage}</td></tr>
              ${vendor.tier ? `<tr><td>Tier</td><td>${vendor.tier}</td></tr>` : ''}
            </table>
          </div>

          ${vendor.documents.length > 0 ? `
          <div class="section">
            <h3>All Documents</h3>
            <table>
              <tr><th>Document Name</th><th>Status</th><th>Uploaded At</th></tr>
              ${vendor.documents.map(d => `
                <tr>
                  <td>${d.name}</td>
                  <td>${d.status}</td>
                  <td>${d.uploadedAt || 'N/A'}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          ` : ''}

          ${vendor.activityLog.length > 0 ? `
          <div class="section">
            <h3>Activity Log</h3>
            <table>
              <tr><th>Action</th><th>User</th><th>Timestamp</th></tr>
              ${vendor.activityLog.map(activity => `
                <tr>
                  <td>${activity.action}</td>
                  <td>${activity.user}</td>
                  <td>${activity.timestamp}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          ` : ''}

          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>Report ID: DOC-${Date.now()}</p>
          </div>
        </body>
        </html>
      `;
      exportToPDF(htmlContent, `${doc.name}-${vendor.id}`);
      toast.success(`Download started: ${doc.name}`);
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  const downloadAllDocuments = () => {
    if (!modalVendor) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Complete Vendor Report - ${modalVendor.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1F2937; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
            h2 { color: #4F46E5; margin-top: 20px; }
            h3 { color: #6B7280; margin-top: 25px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #E5E7EB; padding: 12px; text-align: left; }
            th { background-color: #F9FAFB; font-weight: bold; color: #1F2937; }
            .section { margin: 30px 0; page-break-inside: avoid; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 12px; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
          </style>
        </head>
        <body>
          <h1>Complete Vendor Report</h1>
          <h2>${modalVendor.name}</h2>
          
          <div class="section">
            <h3>Vendor Information</h3>
            <table>
              <tr><th>Field</th><th>Value</th></tr>
              <tr><td>Vendor ID</td><td>${modalVendor.id}</td></tr>
              <tr><td>Vendor Name</td><td>${modalVendor.name}</td></tr>
              <tr><td>Email</td><td>${modalVendor.email}</td></tr>
              <tr><td>Phone</td><td>${modalVendor.phone}</td></tr>
              <tr><td>Type</td><td>${modalVendor.type}</td></tr>
              <tr><td>Category</td><td>${modalVendor.category}</td></tr>
              <tr><td>Stage</td><td>${getStageBadgeStyle(modalVendor.stage).label}</td></tr>
              <tr><td>Documents Status</td><td>${modalVendor.docsStatus}</td></tr>
              <tr><td>Registration Date</td><td>${modalVendor.registrationDate}</td></tr>
              <tr><td>Submission Date</td><td>${modalVendor.submissionDate}</td></tr>
              <tr><td>Days in Current Stage</td><td>${modalVendor.daysInStage}</td></tr>
              ${modalVendor.tier ? `<tr><td>Tier</td><td>${modalVendor.tier}</td></tr>` : ''}
              ${modalVendor.contractId ? `<tr><td>Contract ID</td><td>${modalVendor.contractId}</td></tr>` : ''}
              <tr><td>Contract Signed</td><td>${modalVendor.contractSigned ? 'Yes' : 'No'}</td></tr>
            </table>
          </div>

          <div class="section">
            <h3>All Documents</h3>
            ${modalVendor.documents.length > 0 ? `
            <table>
              <tr><th>Document Name</th><th>Status</th><th>Uploaded At</th></tr>
              ${modalVendor.documents.map(doc => `
                <tr>
                  <td>${doc.name}</td>
                  <td>${doc.status}</td>
                  <td>${doc.uploadedAt || 'N/A'}</td>
                </tr>
              `).join('')}
            </table>
            ` : '<p>No documents available</p>'}
          </div>

          ${modalVendor.activityLog.length > 0 ? `
          <div class="section">
            <h3>Complete Activity Log</h3>
            <table>
              <tr><th>#</th><th>Action</th><th>User</th><th>Timestamp</th></tr>
              ${modalVendor.activityLog.map((activity, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${activity.action}</td>
                  <td>${activity.user}</td>
                  <td>${activity.timestamp}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          ` : ''}

          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>Report ID: VENDOR-REPORT-${modalVendor.id}-${today}</p>
            <p>Total Documents: ${modalVendor.documents.length} | Total Activities: ${modalVendor.activityLog.length}</p>
          </div>
        </body>
        </html>
      `;
      exportToPDF(htmlContent, `complete-vendor-report-${modalVendor.id}-${today}`);
      toast.success('Download started: Complete vendor report');
    } catch (error) {
      toast.error('Failed to download documents');
    }
  };

  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Form states
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    type: '',
    message: ''
  });

  const [rejectForm, setRejectForm] = useState({
    reason: '',
    message: '',
    allowResubmit: false
  });

  const [approveNotes, setApproveNotes] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);

  const [nudgeForm, setNudgeForm] = useState({
    subject: 'KYC Verification Reminder - Your Application',
    message: ''
  });

  const [reRequestDocsForm, setReRequestDocsForm] = useState({
    documents: [] as string[],
    message: '',
    deadline: ''
  });

  const [assignTierForm, setAssignTierForm] = useState({
    tier: '' as 'Gold' | 'Silver' | 'Bronze' | '',
    notes: ''
  });

  const [addNoteForm, setAddNoteForm] = useState({
    note: '',
    visibleToAll: true
  });

  const [editInfoForm, setEditInfoForm] = useState({
    name: '',
    email: '',
    phone: '',
    category: '',
    type: '' as Vendor['type'] | ''
  });

  const [scheduleMeetingForm, setScheduleMeetingForm] = useState({
    title: '',
    date: '',
    time: '',
    link: '',
    notes: ''
  });

  const [sendMessageForm, setSendMessageForm] = useState({
    subject: '',
    message: '',
    sendCopy: false
  });

  const [flagVendorForm, setFlagVendorForm] = useState({
    reason: '',
    priority: '',
    details: ''
  });

  // Filter vendors
  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendor.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === 'all' || vendor.stage === stageFilter;
    const matchesType = typeFilter === 'all' || vendor.type === typeFilter;
    
    return matchesSearch && matchesStage && matchesType;
  });

  // Count vendors in each stage
  const stageCounts = {
    new_request: vendors.filter(v => v.stage === 'new_request').length,
    kyc_verification: vendors.filter(v => v.stage === 'kyc_verification').length,
    docs_verification: vendors.filter(v => v.stage === 'docs_verification').length,
    review_pending: vendors.filter(v => v.stage === 'review_pending').length,
    contract: vendors.filter(v => v.stage === 'contract').length,
    tier_assignment: vendors.filter(v => v.stage === 'tier_assignment').length,
    approved: vendors.filter(v => v.stage === 'approved').length,
    rejected: vendors.filter(v => v.stage === 'rejected').length
  };

  // Smart dropdown positioning
  useEffect(() => {
    if (!showMoreMenu) return;

    const calculatePosition = () => {
      const menuButton = menuRefs.current[showMoreMenu];
      if (!menuButton) return;

      const rect = menuButton.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const DROPDOWN_HEIGHT = 250; // Approximate height
      const FLIP_THRESHOLD = 150;

      let direction: 'up' | 'down' = 'down';
      
      if (spaceBelow < DROPDOWN_HEIGHT && spaceAbove > FLIP_THRESHOLD) {
        direction = 'up';
      }

      setDropdownDirection(prev => ({ ...prev, [showMoreMenu]: direction }));
    };

    calculatePosition();
    
    const handleScroll = () => calculatePosition();
    const handleResize = () => calculatePosition();
    
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [showMoreMenu]);

  // Initialize editInfoForm when editInfo modal opens
  useEffect(() => {
    if (activeModal === 'editInfo' && modalVendor) {
      setEditInfoForm({
        name: modalVendor.name,
        email: modalVendor.email,
        phone: modalVendor.phone,
        category: modalVendor.category,
        type: modalVendor.type
      });
    }
  }, [activeModal, modalVendor]);

  // Event handlers
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.name) {
      toast.error('Please provide vendor name and email');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteForm.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      // Check for existing vendor by email before creating
      try {
        const searchRes = await vendorManagementApi.getVendors({
          search: inviteForm.email.trim()
        });
        const list = (searchRes as any)?.data ||
                     (searchRes as any)?.items ||
                     (searchRes as any)?.vendors ||
                     (Array.isArray(searchRes) ? searchRes : []);
        const duplicate = list.find((v: any) => {
          const vendorEmail = (
            v.contact?.email ||
            v.email ||
            v.contactEmail || ''
          ).toLowerCase().trim();
          return vendorEmail === inviteForm.email.toLowerCase().trim();
        });
        if (duplicate) {
          toast.error(
            `A vendor with email "${inviteForm.email}" already exists. Check the Vendor List to find them.`,
            { duration: 6000 }
          );
          setActiveModal(null);
          await loadVendors();
          return;
        }
      } catch (checkErr) {
        console.warn('Duplicate check failed, proceeding:', checkErr);
      }

      // Build payload compatible with live backend
      const uniqueCode = `VND-INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      const vendorPayload = {
        name: inviteForm.name,
        code: uniqueCode,
        status: 'invited',
        contact: {
          name: inviteForm.name,
          email: inviteForm.email.trim(),
          phone: (inviteForm as any).phone || ''
        },
        address: {
          line1: 'Pending vendor submission',
          line2: '',
          city: 'Pending',
          state: 'Tamil Nadu',
          pincode: '000000',
          zipCode: '000000'
        },
        taxInfo: {
          gstin: 'PENDING',
          pan: ''
        },
        paymentTerms: '30 days',
        metadata: {
          vendorType: inviteForm.type || 'Third-party',
          category: (inviteForm as any).category || 'Uncategorized',
          assignedTo: (inviteForm as any).assignedTo || '',
          inviteMessage: inviteForm.message || '',
          inviteExpiryDays: parseInt((inviteForm as any).expiryDays || '7'),
          stage: 'invited'
        }
      };

      const newVendor = await vendorManagementApi.createVendor(vendorPayload);
      const newVendorId = (newVendor as any)._id || (newVendor as any).id;

      // Try to send invite email (non-blocking)
      try {
        const authToken =
          localStorage.getItem('token') ||
          localStorage.getItem('authToken') ||
          localStorage.getItem('accessToken') ||
          sessionStorage.getItem('token') || '';
        const baseUrl = API_CONFIG?.baseURL ||
          (import.meta.env.VITE_API_BASE_URL as string) ||
          'http://localhost:5001/api/v1';
        const emailRes = await fetch(
          `${baseUrl}/vendor/vendors/send-invite-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              vendorId: newVendorId,
              personalMessage: inviteForm.message,
              expiryDays: parseInt((inviteForm as any).expiryDays || '7')
            })
          }
        );
        const emailData = await emailRes.json().catch(() => ({}));
        if (emailData?.previewUrl) {
          console.log('Email preview:', emailData.previewUrl);
        }
      } catch (emailErr) {
        console.warn('Email send failed (vendor still created):', emailErr);
      }

      setActiveModal(null);
      setInviteForm({ email: '', name: '', type: '', message: '' });
      await loadVendors();
      toast.success(
        `Vendor "${inviteForm.name}" invited and added to pipeline.`
      );
    } catch (err: any) {
      const msg = err?.message || '';
      const status = err?.status || 0;
      if (status === 409 ||
          msg.includes('409') ||
          msg.includes('already exists') ||
          msg.includes('duplicate') ||
          msg.includes('conflict')) {
        toast.error(
          `A vendor with email "${inviteForm.email}" already exists. Find them in the Vendor List tab.`,
          { duration: 8000 }
        );
        setActiveModal(null);
        await loadVendors();
      } else {
        toast.error(msg || 'Failed to send invite. Please try again.');
      }
    }
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalVendor) return;
    setApproveLoading(true);
    try {
      try {
        await vendorManagementApi.vendorAction(modalVendor.id, 'approve', { notes: approveNotes });
      } catch {
        await vendorManagementApi.updateVendor(modalVendor.id, { status: 'active', metadata: { approvedAt: new Date().toISOString(), approveNotes } });
      }
      setActiveModal(null);
      setModalVendor(null);
      setApproveNotes('');
      toast.success(`${modalVendor.name} approved — moved to Contract`);
      await loadVendors();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve vendor');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalVendor) return;
    setRejectLoading(true);
    try {
      try {
        await vendorManagementApi.vendorAction(modalVendor.id, 'reject', { reason: rejectForm.reason, message: rejectForm.message });
      } catch {
        await vendorManagementApi.updateVendor(modalVendor.id, { status: 'inactive', metadata: { rejectedAt: new Date().toISOString(), rejectReason: rejectForm.reason } });
      }
      setActiveModal(null);
      setModalVendor(null);
      setRejectForm({ reason: '', message: '', allowResubmit: false });
      toast.error(`${modalVendor.name} has been rejected`);
      await loadVendors();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reject vendor');
    } finally {
      setRejectLoading(false);
    }
  };

  const handleNudge = (e: React.FormEvent) => {
    e.preventDefault();
    // Nudge vendor action - API call would go here
    setActiveModal(null);
    setNudgeForm({ subject: 'KYC Verification Reminder - Your Application', message: '' });
  };

  const handleReRequestDocs = (e: React.FormEvent) => {
    e.preventDefault();
    // Re-request docs action - API call would go here
    setActiveModal(null);
    setReRequestDocsForm({ documents: [], message: '', deadline: '' });
  };

  const handleAssignTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalVendor || !assignTierForm.tier) return;
    try {
      await vendorManagementApi.updateVendor(modalVendor.id, { metadata: { tier: assignTierForm.tier } });
      setActiveModal(null);
      setAssignTierForm({ tier: '', notes: '' });
      toast.success(`Tier assigned to ${modalVendor.name}`);
      await loadVendors();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to assign tier');
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalVendor || !addNoteForm.note.trim()) {
      toast.error('Please enter a note');
      return;
    }
    
    const updatedVendors = vendors.map(v => {
      if (v.id === modalVendor.id) {
        const newActivity = {
          action: `Note added: ${addNoteForm.note}`,
          user: 'Admin',
          timestamp: new Date().toLocaleString()
        };
        return {
          ...v,
          activityLog: [...(v.activityLog || []), newActivity]
        };
      }
      return v;
    });
    
    setVendors(updatedVendors);
    
    // Update selected vendor if it's the same one
    if (selectedVendor?.id === modalVendor.id) {
      const updated = updatedVendors.find(v => v.id === modalVendor.id);
      if (updated) setSelectedVendor(updated);
    }
    
    setActiveModal(null);
    setAddNoteForm({ note: '', visibleToAll: true });
    toast.success('Note added successfully');
  };

  const handleReviewClick = (vendor: Vendor) => {
    setModalVendor(vendor);
    setActiveModal('review');
  };

  // Get action buttons based on vendor stage
  const getActionButtons = (vendor: Vendor) => {
    const buttons: JSX.Element[] = [];

    // Review button - for review_pending or docs_verification
    if (vendor.stage === 'review_pending' || vendor.stage === 'docs_verification') {
      buttons.push(
        <button
          key="review"
          onClick={() => handleReviewClick(vendor)}
          className="px-4 py-2 bg-[#4F46E5] text-white text-xs font-medium rounded-md hover:bg-[#4338CA] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <Eye className="w-3 h-3 inline mr-1" />
          Review
        </button>
      );
    }

    // Nudge button - for kyc_verification or docs_verification (pending >3 days)
    if ((vendor.stage === 'kyc_verification' || vendor.stage === 'docs_verification') && vendor.daysInStage >= 3) {
      buttons.push(
        <button
          key="nudge"
          onClick={() => {
            setModalVendor(vendor);
            setActiveModal('nudge');
          }}
          className="px-4 py-2 bg-[#F59E0B] text-white text-xs font-medium rounded-md hover:bg-[#D97706] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <Bell className="w-3 h-3 inline mr-1" />
          Nudge
        </button>
      );
    }

    // Approve button - for review_pending with all docs verified
    if (vendor.stage === 'review_pending' && vendor.docsStatus === 'ok') {
      buttons.push(
        <button
          key="approve"
          onClick={() => {
            setModalVendor(vendor);
            setActiveModal('approve');
          }}
          className="px-4 py-2 bg-[#10B981] text-white text-xs font-medium rounded-md hover:bg-[#059669] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <Check className="w-3 h-3 inline mr-1" />
          Approve
        </button>
      );
    }

    // Reject button - for review_pending or kyc_verification
    if (vendor.stage === 'review_pending' || vendor.stage === 'kyc_verification') {
      buttons.push(
        <button
          key="reject"
          onClick={() => {
            setModalVendor(vendor);
            setActiveModal('reject');
          }}
          className="px-4 py-2 bg-[#EF4444] text-white text-xs font-medium rounded-md hover:bg-[#DC2626] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <X className="w-3 h-3 inline mr-1" />
          Reject
        </button>
      );
    }

    // Re-Request Docs button - for docs_verification with incomplete docs
    if (vendor.stage === 'docs_verification' && vendor.docsStatus === 'incomplete') {
      buttons.push(
        <button
          key="reRequestDocs"
          onClick={() => {
            setModalVendor(vendor);
            setActiveModal('reRequestDocs');
          }}
          className="px-4 py-2 bg-[#F97316] text-white text-xs font-medium rounded-md hover:bg-[#EA580C] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <Upload className="w-3 h-3 inline mr-1" />
          Re-Request
        </button>
      );
    }

    // View Contract button - for contract, tier_assignment, or approved
    if (vendor.stage === 'contract' || vendor.stage === 'tier_assignment' || vendor.stage === 'approved') {
      buttons.push(
        <button
          key="viewContract"
          onClick={() => {
            setModalVendor(vendor);
            setActiveModal('viewContract');
          }}
          className="px-4 py-2 bg-[#6B7280] text-white text-xs font-medium rounded-md hover:bg-[#4B5563] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <File className="w-3 h-3 inline mr-1" />
          Contract
        </button>
      );
    }

    // Assign Tier button - for contract with signed contract
    if (vendor.stage === 'contract' && vendor.contractSigned) {
      buttons.push(
        <button
          key="assignTier"
          onClick={() => {
            setModalVendor(vendor);
            setActiveModal('assignTier');
          }}
          className="px-4 py-2 bg-[#7C3AED] text-white text-xs font-medium rounded-md hover:bg-[#6D28D9] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <Star className="w-3 h-3 inline mr-1" />
          Assign Tier
        </button>
      );
    }

    return buttons;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Onboarding"
        subtitle="Manage vendor applications and approvals"
        actions={
          <button
            onClick={() => setActiveModal('invite')}
            className="px-4 py-2 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#4338CA] transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Invite Vendor
          </button>
        }
      />

      {/* Stage Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setStageFilter(stageFilter === 'review_pending' ? 'all' : 'review_pending')}
          className={`bg-white p-4 rounded-xl border-l-4 border-[#4F46E5] cursor-pointer transition-all hover:shadow-md ${stageFilter === 'review_pending' ? 'ring-2 ring-[#4F46E5]' : 'border border-[#E0E0E0]'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#9CA3AF] uppercase mb-1">Review Pending</p>
              <h3 className="text-2xl font-bold text-[#1F2937]">{stageCounts.review_pending}</h3>
            </div>
            <div className="p-2 bg-[#EFF6FF] text-[#4F46E5] rounded-lg">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div 
          onClick={() => setStageFilter(stageFilter === 'docs_verification' ? 'all' : 'docs_verification')}
          className={`bg-white p-4 rounded-xl border-l-4 border-[#F59E0B] cursor-pointer transition-all hover:shadow-md ${stageFilter === 'docs_verification' ? 'ring-2 ring-[#F59E0B]' : 'border border-[#E0E0E0]'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#9CA3AF] uppercase mb-1">Docs Verification</p>
              <h3 className="text-2xl font-bold text-[#1F2937]">{stageCounts.docs_verification}</h3>
            </div>
            <div className="p-2 bg-[#FEF3C7] text-[#F59E0B] rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div 
          onClick={() => setStageFilter(stageFilter === 'contract' ? 'all' : 'contract')}
          className={`bg-white p-4 rounded-xl border-l-4 border-[#7C3AED] cursor-pointer transition-all hover:shadow-md ${stageFilter === 'contract' ? 'ring-2 ring-[#7C3AED]' : 'border border-[#E0E0E0]'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#9CA3AF] uppercase mb-1">Contract</p>
              <h3 className="text-2xl font-bold text-[#1F2937]">{stageCounts.contract}</h3>
            </div>
            <div className="p-2 bg-[#E9D5FF] text-[#7C3AED] rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div 
          onClick={() => setStageFilter(stageFilter === 'approved' ? 'all' : 'approved')}
          className={`bg-white p-4 rounded-xl border-l-4 border-[#10B981] cursor-pointer transition-all hover:shadow-md ${stageFilter === 'approved' ? 'ring-2 ring-[#10B981]' : 'border border-[#E0E0E0]'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#9CA3AF] uppercase mb-1">Approved</p>
              <h3 className="text-2xl font-bold text-[#1F2937]">{stageCounts.approved}</h3>
            </div>
            <div className="p-2 bg-[#DCFCE7] text-[#10B981] rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-3 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 px-3 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
        >
          <option value="all">All Types</option>
          <option value="Farmer">Farmer</option>
          <option value="Distributor">Distributor</option>
          <option value="Aggregator">Aggregator</option>
          <option value="Third-party">Third-party</option>
        </select>
      </div>

      {/* Vendor Queue Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full">
            <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                  Vendor Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                  Submission Date
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-2 py-3 text-center text-xs font-bold text-[#6B7280] uppercase tracking-wider w-12">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredVendors.map((vendor) => {
                const stageBadge = getStageBadgeStyle(vendor.stage);
                return (
                  <tr 
                    key={vendor.id} 
                    className="hover:bg-[#F9FAFB] transition-colors"
                  >
                    <td 
                      className="px-6 py-4 text-sm font-medium text-[#1F2937] cursor-pointer"
                      onClick={() => setSelectedVendor(vendor)}
                    >
                      {vendor.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B7280]">
                      {vendor.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B7280]">
                      {vendor.submissionDate}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span 
                        className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-medium"
                        style={{ backgroundColor: stageBadge.bg, color: stageBadge.text }}
                      >
                        {stageBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {vendor.docsStatus === 'ok' && (
                        <div className="flex items-center justify-center gap-1 text-[#10B981]">
                          <CheckCircle size={14} />
                          <span className="text-xs font-medium">OK</span>
                        </div>
                      )}
                      {vendor.docsStatus === 'missing' && (
                        <div className="flex items-center justify-center gap-1 text-[#EF4444]">
                          <XCircle size={14} />
                          <span className="text-xs font-medium">Missing</span>
                        </div>
                      )}
                      {vendor.docsStatus === 'incomplete' && (
                        <div className="flex items-center justify-center gap-1 text-[#F59E0B]">
                          <AlertTriangle size={14} />
                          <span className="text-xs font-medium">Incomplete</span>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-4 w-12">
                      <div className="flex items-center justify-center">
                        <div 
                          className="relative"
                          ref={(el) => {
                            if (el) menuRefs.current[vendor.id] = el;
                          }}
                        >
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMoreMenu(showMoreMenu === vendor.id ? null : vendor.id);
                            }}
                            className="p-1 hover:bg-[#F3F4F6] rounded transition-colors"
                            aria-label="Actions menu"
                            aria-expanded={showMoreMenu === vendor.id}
                          >
                            <MoreVertical size={16} className="text-[#9CA3AF]" />
                          </button>
                          
                          {/* More Options Dropdown */}
                          {showMoreMenu === vendor.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-[90]" 
                                onClick={() => setShowMoreMenu(null)}
                              />
                              {createPortal(
                                <div 
                                  className={`fixed w-48 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-[100] py-1 max-h-[320px] overflow-y-auto transition-all duration-200`}
                                  style={{
                                    top: dropdownDirection[vendor.id] === 'up' 
                                      ? `${(menuRefs.current[vendor.id]?.getBoundingClientRect().top || 0) - 320}px`
                                      : `${(menuRefs.current[vendor.id]?.getBoundingClientRect().bottom || 0) + 4}px`,
                                    left: `${(menuRefs.current[vendor.id]?.getBoundingClientRect().right || 0) - 192}px`
                                  }}
                                  role="menu"
                                  aria-label="Vendor actions"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                <button 
                                  onClick={() => {
                                    setSelectedVendor(vendor);
                                    setShowMoreMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] transition-colors"
                                  role="menuitem"
                                >
                                  View Profile
                                </button>
                                <button 
                                  onClick={() => {
                                    setModalVendor(vendor);
                                    setActiveModal('downloadDocs');
                                    setShowMoreMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] transition-colors"
                                  role="menuitem"
                                >
                                  Download Docs
                                </button>
                                <button 
                                  onClick={() => {
                                    setModalVendor(vendor);
                                    setActiveModal('activityLog');
                                    setShowMoreMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] transition-colors"
                                  role="menuitem"
                                >
                                  Activity Log
                                </button>
                                <button 
                                  onClick={() => {
                                    setModalVendor(vendor);
                                    setActiveModal('addNote');
                                    setShowMoreMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] transition-colors"
                                  role="menuitem"
                                >
                                  Add Note
                                </button>
                                <button 
                                  onClick={() => {
                                    setModalVendor(vendor);
                                    setActiveModal('scheduleMeeting');
                                    setShowMoreMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] transition-colors"
                                  role="menuitem"
                                >
                                  Schedule Meeting
                                </button>
                                <button 
                                  onClick={() => {
                                    setModalVendor(vendor);
                                    setActiveModal('sendMessage');
                                    setShowMoreMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] transition-colors"
                                  role="menuitem"
                                >
                                  Send Message
                                </button>
                                <button 
                                  onClick={() => {
                                    setModalVendor(vendor);
                                    setActiveModal('flagVendor');
                                    setShowMoreMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] transition-colors"
                                  role="menuitem"
                                >
                                  Flag Vendor
                                </button>
                                <button 
                                  onClick={() => {
                                    setModalVendor(vendor);
                                    // Initialize form with current vendor data
                                    setEditInfoForm({
                                      name: vendor.name,
                                      email: vendor.email,
                                      phone: vendor.phone,
                                      category: vendor.category,
                                      type: vendor.type
                                    });
                                    setActiveModal('editInfo');
                                    setShowMoreMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] transition-colors"
                                  role="menuitem"
                                >
                                  Edit Info
                                </button>
                                </div>,
                                document.body
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedVendor && (
        <div className="fixed inset-y-0 right-0 w-[400px] bg-white border-l border-[#E5E7EB] shadow-2xl z-50 overflow-y-auto animate-slide-in">
          {/* Panel Header */}
          <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex justify-between items-center z-10">
            <h3 className="text-lg font-bold text-[#1F2937]">{selectedVendor.name}</h3>
            <button 
              onClick={() => setSelectedVendor(null)}
              className="p-1.5 hover:bg-[#F3F4F6] rounded-md transition-colors"
            >
              <X size={20} className="text-[#6B7280]" />
            </button>
          </div>

          {/* Panel Body */}
          <div className="p-6 space-y-6">
            {/* Vendor Info */}
            <div>
              <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-3">
                Vendor Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Email:</span>
                  <span className="text-[#1F2937] font-medium">{selectedVendor.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Phone:</span>
                  <span className="text-[#1F2937] font-medium">{selectedVendor.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Type:</span>
                  <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#1E40AF] text-xs font-medium rounded">
                    {selectedVendor.type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Category:</span>
                  <span className="text-[#1F2937] font-medium">{selectedVendor.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Registration:</span>
                  <span className="text-[#1F2937] font-medium">{selectedVendor.registrationDate}</span>
                </div>
                {selectedVendor.tier && (
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Tier:</span>
                    <span className="px-2 py-0.5 bg-[#E9D5FF] text-[#7C3AED] text-xs font-medium rounded flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {selectedVendor.tier}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Current Stage */}
            <div>
              <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-3">
                Current Stage
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span 
                    className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-medium"
                    style={{ 
                      backgroundColor: getStageBadgeStyle(selectedVendor.stage).bg, 
                      color: getStageBadgeStyle(selectedVendor.stage).text 
                    }}
                  >
                    {getStageBadgeStyle(selectedVendor.stage).label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                  <Clock size={14} />
                  <span>{selectedVendor.daysInStage} days in current stage</span>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div>
              <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-3">
                Documents
              </h4>
              <div className="space-y-2">
                {selectedVendor.documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-[#6B7280]" />
                      <div>
                        <p className="text-sm font-medium text-[#1F2937]">{doc.name}</p>
                        {doc.uploadedAt && (
                          <p className="text-xs text-[#6B7280]">{doc.uploadedAt}</p>
                        )}
                      </div>
                    </div>
                    {doc.status === 'verified' && (
                      <CheckCircle size={16} className="text-[#10B981]" />
                    )}
                    {doc.status === 'pending' && (
                      <Clock size={16} className="text-[#F59E0B]" />
                    )}
                    {doc.status === 'missing' && (
                      <XCircle size={16} className="text-[#EF4444]" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Log */}
            <div>
              <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-3">
                Activity Log
              </h4>
              <div className="space-y-3">
                {selectedVendor.activityLog.map((activity, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-2 h-2 bg-[#4F46E5] rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm text-[#1F2937]">{activity.action}</p>
                      <p className="text-xs text-[#6B7280]">{activity.user} • {activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            {selectedVendor.stage !== 'approved' && selectedVendor.stage !== 'rejected' && (
              <div className="space-y-2">
                {(selectedVendor.stage === 'review_pending' || selectedVendor.stage === 'new_request' || selectedVendor.stage === 'docs_verification') && (
                  <button 
                    onClick={() => {
                      setModalVendor(selectedVendor);
                      setActiveModal('approve');
                    }}
                    className="w-full px-4 py-2.5 bg-[#10B981] text-white font-medium rounded-lg hover:bg-[#059669] transition-colors"
                  >
                    Approve Application
                  </button>
                )}
                <button 
                  onClick={() => {
                    setModalVendor(selectedVendor);
                    setActiveModal('reject');
                  }}
                  className="w-full px-4 py-2.5 bg-[#EF4444] text-white font-medium rounded-lg hover:bg-[#DC2626] transition-colors"
                >
                  Reject Application
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="vendor-onboarding-modal-description">
          <DialogHeader>
            <DialogTitle>
              {activeModal === 'invite' && "Invite New Vendor"}
              {activeModal === 'approve' && "Approve Vendor"}
              {activeModal === 'reject' && "Reject Vendor"}
              {activeModal === 'nudge' && "Send Reminder"}
              {activeModal === 'review' && "Vendor Review"}
              {activeModal === 'reRequestDocs' && "Re-Request Documents"}
              {activeModal === 'viewContract' && "Contract Details"}
              {activeModal === 'assignTier' && "Assign Vendor Tier"}
              {activeModal === 'addNote' && "Add Internal Note"}
              {activeModal === 'downloadDocs' && "Download Documents"}
              {activeModal === 'activityLog' && "Activity Log"}
              {activeModal === 'scheduleMeeting' && "Schedule Meeting"}
              {activeModal === 'sendMessage' && "Send Message"}
              {activeModal === 'flagVendor' && "Flag Vendor"}
              {activeModal === 'editInfo' && "Edit Vendor Information"}
            </DialogTitle>
            <DialogDescription id="vendor-onboarding-modal-description">
              {activeModal === 'invite' && "Enter the details of the vendor you want to invite to the platform."}
              {activeModal === 'approve' && `Review the details before approving ${modalVendor?.name}.`}
              {activeModal === 'reject' && `Please provide a reason for rejecting ${modalVendor?.name}.`}
              {activeModal === 'nudge' && `Send a notification to ${modalVendor?.name} to complete their application.`}
              {activeModal === 'review' && `Complete vendor details for ${modalVendor?.name}.`}
              {activeModal === 'reRequestDocs' && `Select documents to request from ${modalVendor?.name}.`}
              {activeModal === 'viewContract' && modalVendor?.contractId}
              {activeModal === 'assignTier' && `Select a tier for ${modalVendor?.name}.`}
              {activeModal === 'addNote' && `Add an internal note for ${modalVendor?.name}.`}
              {activeModal === 'downloadDocs' && `Download all documents submitted by ${modalVendor?.name}.`}
              {activeModal === 'activityLog' && `View all activities and actions for ${modalVendor?.name}.`}
              {activeModal === 'scheduleMeeting' && `Schedule a meeting with ${modalVendor?.name}.`}
              {activeModal === 'sendMessage' && `Send a direct message to ${modalVendor?.name}.`}
              {activeModal === 'flagVendor' && `Report or flag ${modalVendor?.name} for review.`}
              {activeModal === 'editInfo' && `Update vendor information for ${modalVendor?.name}.`}
            </DialogDescription>
          </DialogHeader>

          {/* Modal 1: Invite Vendor */}
          {activeModal === 'invite' && (
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-4 py-2">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    EMAIL <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="vendor@example.com"
                    className="w-full h-10 px-3 border border-[#D1D5DB] rounded-md text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    NAME <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    placeholder="Vendor Name"
                    className="w-full h-10 px-3 border border-[#D1D5DB] rounded-md text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    TYPE
                  </label>
                  <select
                    value={inviteForm.type}
                    onChange={(e) => setInviteForm({ ...inviteForm, type: e.target.value })}
                    className="w-full h-10 px-3 border border-[#D1D5DB] rounded-md text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/10"
                  >
                    <option value="">Select type</option>
                    <option value="Farmer">Farmer</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Aggregator">Aggregator</option>
                    <option value="Third-party">Third-party</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    MESSAGE
                  </label>
                  <textarea
                    value={inviteForm.message}
                    onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                    placeholder="Welcome message (optional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-md text-sm resize-none focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/10"
                  />
                </div>
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-6 py-2.5 border border-[#D1D5DB] text-[#1F2937] font-medium rounded-lg hover:bg-[#F3F4F6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#4338CA] transition-colors"
                >
                  Send Invite
                </button>
              </DialogFooter>
            </form>
          )}
          {/* Modal 2: Nudge Vendor */}
          {activeModal === 'nudge' && modalVendor && (
            <form onSubmit={handleNudge} className="space-y-4">
              <div className="space-y-4 py-2">
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={16} className="text-[#1E40AF] mt-0.5" />
                  <p className="text-sm text-[#1E40AF]">
                    Vendor will receive this email at <strong>{modalVendor.email}</strong>
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    EMAIL SUBJECT
                  </label>
                  <input
                    type="text"
                    value={nudgeForm.subject}
                    onChange={(e) => setNudgeForm({ ...nudgeForm, subject: e.target.value })}
                    className="w-full h-10 px-3 border border-[#D1D5DB] rounded-md text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    CUSTOM MESSAGE (OPTIONAL)
                  </label>
                  <textarea
                    value={nudgeForm.message}
                    onChange={(e) => setNudgeForm({ ...nudgeForm, message: e.target.value })}
                    placeholder="Add personalized message..."
                    rows={4}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-md text-sm resize-none focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/10"
                  />
                </div>
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-6 py-2.5 border border-[#D1D5DB] text-[#1F2937] font-medium rounded-lg hover:bg-[#F3F4F6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#F59E0B] text-white font-medium rounded-lg hover:bg-[#D97706] transition-colors"
                >
                  Send Reminder
                </button>
              </DialogFooter>
            </form>
          )}

          {/* Modal 3: Approve Vendor */}
          {activeModal === 'approve' && modalVendor && (
            <form onSubmit={handleApprove} className="space-y-4">
              <div className="space-y-4 py-2">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    Vendor Name
                  </label>
                  <div className="w-full h-10 px-3 bg-[#F9FAFB] border-0 rounded-md text-sm flex items-center text-[#1F2937]">
                    {modalVendor.name}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    Stage Transition
                  </label>
                  <div className="text-sm text-[#6B7280]">
                    {getStageBadgeStyle(modalVendor.stage).label} → Contract
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    APPROVAL NOTES (OPTIONAL)
                  </label>
                  <textarea
                    value={approveNotes}
                    onChange={(e) => setApproveNotes(e.target.value)}
                    placeholder="Internal notes about approval..."
                    rows={3}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-md text-sm resize-none focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/10"
                  />
                </div>
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-6 py-2.5 border border-[#D1D5DB] text-[#1F2937] font-medium rounded-lg hover:bg-[#F3F4F6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approveLoading}
                  className="px-6 py-2.5 bg-[#10B981] text-white font-medium rounded-lg hover:bg-[#059669] transition-colors disabled:opacity-60"
                >
                  {approveLoading ? 'Confirming...' : 'Confirm Approval'}
                </button>
              </DialogFooter>
            </form>
          )}

          {/* Modal 4: Reject Vendor */}
          {activeModal === 'reject' && modalVendor && (
            <form onSubmit={handleReject} className="space-y-4">
              <div className="space-y-4 py-2">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    REJECTION REASON <span className="text-[#EF4444]">*</span>
                  </label>
                  <select
                    required
                    value={rejectForm.reason}
                    onChange={(e) => setRejectForm({ ...rejectForm, reason: e.target.value })}
                    className="w-full h-10 px-3 border border-[#D1D5DB] rounded-md text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/10"
                  >
                    <option value="">Select reason...</option>
                    <option value="incomplete">Incomplete Information</option>
                    <option value="kyc_failed">Failed KYC Verification</option>
                    <option value="invalid_docs">Documents Invalid/Expired</option>
                    <option value="compliance">Compliance Issues</option>
                    <option value="financial">Financial Concerns</option>
                    <option value="quality">Quality Concerns</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    MESSAGE TO VENDOR <span className="text-[#EF4444]">*</span>
                  </label>
                  <textarea
                    required
                    value={rejectForm.message}
                    onChange={(e) => setRejectForm({ ...rejectForm, message: e.target.value })}
                    placeholder="Reason for rejection (will be sent via email)"
                    rows={4}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-md text-sm resize-none focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/10"
                  />
                </div>
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-6 py-2.5 border border-[#D1D5DB] text-[#1F2937] font-medium rounded-lg hover:bg-[#F3F4F6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectLoading}
                  className="px-6 py-2.5 bg-[#EF4444] text-white font-medium rounded-lg hover:bg-[#DC2626] transition-colors disabled:opacity-60"
                >
                  {rejectLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
