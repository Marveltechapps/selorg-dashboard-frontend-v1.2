import React, { useState, useEffect } from 'react';
import {
  Clipboard,
  CheckCircle,
  AlertTriangle,
  Eye,
  Download,
  MoreVertical,
  Calendar,
  FileText,
  Upload,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  XCircle,
  AlertCircle,
  ThermometerSun,
  Shield,
  Award,
  Phone,
  Mail,
  Bell,
  Printer,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../ui/page-header';
import { EmptyState } from '../../ui/ux-components';
import { exportToCSV, exportToCSVForExcel } from '../../../utils/csvExport';
import { exportToPDF } from '../../../utils/pdfExport';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import vendorManagementApi from '../../../api/vendor/vendorManagement.api';

// Types
type QCResult = 'Pass' | 'Fail' | 'Pending';
type AuditType = 'Full Audit' | 'Follow-up' | 'Routine' | 'Complaint-based' | 'Certification';
type CertificateStatus = 'Valid' | 'Expiring Soon' | 'Expired' | 'Pending Renewal';
type CheckType = 'Visual' | 'Temperature' | 'Packaging' | 'Labeling' | 'Weight' | 'Chemical' | 'Microbiological';

interface QCCheck {
  id: string;
  checkId: string;
  batchId: string;
  product: string;
  vendor: string;
  checkType: CheckType;
  result: QCResult;
  inspector?: string;
  date?: string;
  actualReading?: string;
  requirement?: string;
  severity?: string;
  // UI state for workflow/status (optimistic)
  status?: 'Pending' | 'Approved' | 'Appealed' | 'Rejected';
  // stage can represent workflow progression for "Next Report" actions
  stage?: 'Review' | 'Reported' | 'Closed';
}

interface Audit {
  id: string;
  auditId: string;
  vendor: string;
  date: string;
  auditType: AuditType;
  result: string;
  score: number;
}

interface Certificate {
  id: string;
  certificateType: string;
  vendor: string;
  issuedDate: string;
  expiryDate: string;
  status: CertificateStatus;
  daysToExpiry: number;
  licenseNumber?: string;
}

interface TemperatureCompliance {
  id: string;
  shipmentId: string;
  product: string;
  vendor: string;
  requirement: string;
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  compliant: boolean;
}

interface VendorRating {
  id: string;
  vendor: string;
  overallRating: number;
  qcPassRate: number;
  complianceScore: number;
  auditScore: number;
  trend: 'up' | 'down' | 'stable';
}

const isValidMongoId = (id: string | null | undefined): boolean =>
  !!id && /^[0-9a-fA-F]{24}$/.test(id);

export function QCCompliance() {
  const [activeTab, setActiveTab] = useState<'qc' | 'audits' | 'certs' | 'temp' | 'ratings'>('qc');
  const [selectedCheck, setSelectedCheck] = useState<QCCheck | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [selectedTemp, setSelectedTemp] = useState<TemperatureCompliance | null>(null);
  const [checks, setChecks] = useState<QCCheck[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [temps, setTemps] = useState<TemperatureCompliance[]>([]);
  const [ratings, setRatings] = useState<VendorRating[]>([]);
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [alerts, setAlerts] = useState<
    { id: string; checkId?: string; message: string; type?: 'info' | 'warning' | 'critical'; acknowledged?: boolean; ts?: number }[]
  >([]);
  const [openReportMenuId, setOpenReportMenuId] = useState<string | null>(null);

  const [loadingChecks, setLoadingChecks] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingChecks(true);
        const rawVendorId = '';
        const useVendorScope = rawVendorId && isValidMongoId(rawVendorId);

        const resp = useVendorScope
          ? await vendorManagementApi.listVendorQCChecks(rawVendorId!)
          : await vendorManagementApi.listQCChecks({ page: 1, perPage: 25 });
        if (!mounted) return;
        let items: any[] = [];
        if (Array.isArray(resp)) {
          items = resp;
        } else if (resp?.data && Array.isArray(resp.data)) {
          items = resp.data;
        } else if (resp?.items && Array.isArray(resp.items)) {
          items = resp.items;
        } else if (resp?.pagination && resp?.data) {
          items = Array.isArray(resp.data) ? resp.data : [];
        }
        const transformedChecks = items.map((item: any) => ({
          id: item._id?.toString() || item.id,
          checkId: item.checkId || item.id || `QC-${(item._id?.toString() || '').substring(0, 8)}`,
          batchId: item.batchId || 'N/A',
          product: item.product || 'Unknown',
          vendor: item.vendor || item.vendorId || 'Unknown',
          checkType: item.checkType || 'Visual',
          result: item.result || (item.status === 'approved' || item.status === 'passed' ? 'Pass' : item.status === 'rejected' || item.status === 'failed' ? 'Fail' : 'Pending'),
          inspector: item.inspector || item.inspectorId || 'N/A',
          date: item.date || item.createdAt,
          actualReading: item.actualReading,
          requirement: item.requirement,
          severity: item.severity,
          status: item.status === 'approved' || item.status === 'passed' ? 'Approved' : item.status === 'rejected' || item.status === 'failed' ? 'Rejected' : item.status === 'appealed' ? 'Appealed' : 'Pending',
          stage: item.stage || 'Review',
        }));
        setChecks(transformedChecks);

        if (useVendorScope && rawVendorId) {
          try {
            const certResp = await vendorManagementApi.listVendorCertificates(rawVendorId);
            const certs = Array.isArray(certResp) ? certResp : (certResp?.items ?? certResp?.data ?? []);
            if (mounted) {
              const transformedCerts = (certs ?? []).map((c: any) => ({
                id: c._id?.toString() || c.id,
                certificateType: c.type || c.certificateType || 'Unknown',
                vendor: c.vendor || c.vendorName || c.vendorId || 'Unknown',
                issuedDate: c.issuedAt ? new Date(c.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
                expiryDate: c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
                status: c.status === 'valid' ? 'Valid' : c.status === 'expired' ? 'Expired' : c.status === 'pending_renewal' ? 'Pending Renewal' : c.status === 'expiring_soon' ? 'Expiring Soon' : 'Valid',
                daysToExpiry: c.expiresAt ? Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
                licenseNumber: c.licenseNumber || c.metadata?.licenseNumber,
              }));
              setCertificates(transformedCerts);
            }
          } catch (e) {
            console.warn('Failed to load certificates', e);
            if (mounted) setCertificates([]);
          }
          
          try {
            const auditsResp = await vendorManagementApi.getAudits({ vendorId: rawVendorId });
            const auditsData = Array.isArray(auditsResp?.data) ? auditsResp.data : (Array.isArray(auditsResp) ? auditsResp : []);
            if (mounted) {
              const transformedAudits = (auditsData ?? []).map((a: any) => ({
                id: a._id?.toString() || a.id,
                auditId: a.auditId || a.id,
                vendor: a.vendor || a.vendorName || a.vendorId || 'N/A',
                date: a.date || new Date(a.createdAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                auditType: a.auditType || 'Routine',
                result: a.result || 'Pending',
                score: a.score || 0,
              }));
              setAudits(transformedAudits);
            }
          } catch (e) {
            console.warn('Failed to load audits', e);
            if (mounted) setAudits([]);
          }
          
          try {
            const tempResp = await vendorManagementApi.getTemperatureCompliance({ vendorId: rawVendorId });
            const tempData = Array.isArray(tempResp?.data) ? tempResp.data : (Array.isArray(tempResp) ? tempResp : []);
            if (mounted) {
              const transformedTemps = (tempData ?? []).map((t: any) => ({
                id: t._id?.toString() || t.id,
                shipmentId: t.shipmentId || 'N/A',
                product: t.product || t.productName || 'Unknown',
                vendor: t.vendor || t.vendorName || t.vendorId || 'Unknown',
                requirement: t.requirement || 'N/A',
                avgTemp: t.avgTemp ?? 0,
                minTemp: t.minTemp ?? 0,
                maxTemp: t.maxTemp ?? 0,
                compliant: t.compliant !== undefined ? t.compliant : true,
              }));
              setTemps(transformedTemps);
            }
          } catch (e) {
            console.warn('Failed to load temperature compliance', e);
            if (mounted) setTemps([]);
          }
          
          try {
            const ratingsResp = await vendorManagementApi.getVendorRatings(rawVendorId);
            const ratingsData = Array.isArray(ratingsResp?.data) ? ratingsResp.data : (Array.isArray(ratingsResp) ? ratingsResp : []);
            if (mounted) {
              const transformedRatings = (ratingsData ?? []).map((r: any) => ({
                id: r._id?.toString() || r.id || r.vendorId || 'unknown',
                vendor: r.vendor || r.vendorName || r.vendorId || 'Unknown',
                overallRating: r.overallRating ?? 0,
                qcPassRate: r.qcPassRate ?? 0,
                complianceScore: r.complianceScore ?? 0,
                auditScore: r.auditScore ?? 0,
                trend: r.trend || 'stable',
              }));
              setRatings(transformedRatings);
            }
          } catch (e) {
            console.warn('Failed to load vendor ratings', e);
            if (mounted) setRatings([]);
          }
        } else {
          setCertificates([]);
          setAudits([]);
          setTemps([]);
          try {
            const ratingsResp = await vendorManagementApi.getVendorRatings();
            const ratingsData = Array.isArray(ratingsResp?.data) ? ratingsResp.data : (Array.isArray(ratingsResp) ? ratingsResp : []);
            if (mounted) {
              const transformedRatings = (ratingsData ?? []).map((r: any) => ({
                id: r._id?.toString() || r.id || r.vendorId || 'unknown',
                vendor: r.vendor || r.vendorName || r.vendorId || 'Unknown',
                overallRating: r.overallRating ?? 0,
                qcPassRate: r.qcPassRate ?? 0,
                complianceScore: r.complianceScore ?? 0,
                auditScore: r.auditScore ?? 0,
                trend: r.trend || 'stable',
              }));
              setRatings(transformedRatings);
            }
          } catch (e) {
            if (mounted) setRatings([]);
          }
        }
      } catch (err: any) {
        console.error('Failed to load QC checks', err);
        const errorMsg = err.message || 'Failed to load QC checks';
        // Show user-friendly error message
        if (errorMsg.includes('Authentication') || errorMsg.includes('token') || errorMsg.includes('Access denied') || errorMsg.includes('403')) {
          toast.error('Authentication failed. Please log in again.');
        } else {
          toast.error(errorMsg);
        }
      } finally {
        setLoadingChecks(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setLoadingFor = (id: string, val: boolean) =>
    setLoadingIds(prev => ({ ...prev, [id]: val }));

  // Optimistic handlers
  const approveCheck = async (id: string) => {
    if (!isValidMongoId(id)) {
      toast.error('Invalid check. Cannot approve.');
      return;
    }
    setLoadingFor(id, true);
    // capture previous state for rollback
    let previous: QCCheck | undefined;
    setChecks(prev =>
      prev.map(c => {
        if (c.id === id) {
          previous = c;
          return { ...c, status: 'Approved', result: 'Pass' };
        }
        return c;
      })
    );
    try {
      await vendorManagementApi.updateQCCheck(id, {
        status: 'approved',
        result: 'Pass',
      });
      toast.success('Check approved');
      // remove any existing alerts for this check (acknowledge)
      setAlerts(prev => prev.filter(a => a.checkId !== id));
      // Reload checks to get updated data
      const rawVendorId = '';
      const useVendorScope = rawVendorId && isValidMongoId(rawVendorId);
      const resp = useVendorScope
        ? await vendorManagementApi.listVendorQCChecks(rawVendorId)
        : await vendorManagementApi.listQCChecks({ page: 1, perPage: 25 });
      // Handle different response structures
      let items: any[] = [];
      if (Array.isArray(resp)) {
        items = resp;
      } else if (resp.data && Array.isArray(resp.data)) {
        items = resp.data;
      } else if (resp.items && Array.isArray(resp.items)) {
        items = resp.items;
      } else if (resp.pagination && resp.data) {
        items = Array.isArray(resp.data) ? resp.data : [];
      }
      // Transform items to match QCCheck interface
      const transformedChecks = items.map((item: any) => ({
        id: item._id?.toString() || item.id,
        checkId: item.checkId || item.id || `QC-${item._id?.toString().substring(0, 8)}`,
        batchId: item.batchId || 'N/A',
        product: item.product || 'Unknown',
        vendor: item.vendor || item.vendorId || 'Unknown',
        checkType: item.checkType || 'Visual',
        result: item.result || (item.status === 'approved' || item.status === 'passed' ? 'Pass' : item.status === 'rejected' || item.status === 'failed' ? 'Fail' : 'Pending'),
        inspector: item.inspector || item.inspectorId || 'N/A',
        date: item.date || item.createdAt,
        actualReading: item.actualReading,
        requirement: item.requirement,
        severity: item.severity,
        status: item.status === 'approved' || item.status === 'passed' ? 'Approved' : item.status === 'rejected' || item.status === 'failed' ? 'Rejected' : item.status === 'appealed' ? 'Appealed' : 'Pending',
        stage: item.stage || 'Review',
      }));
      setChecks(transformedChecks);
    } catch (err) {
      // rollback
      setChecks(prev => prev.map(c => (c.id === id && previous ? previous : c)));
      toast.error('Failed to approve check');
    } finally {
      setLoadingFor(id, false);
      setShowQCDetailModal(false);
    }
  };

  const rejectCheck = async (id: string) => {
    if (!isValidMongoId(id)) {
      toast.error('Invalid check. Cannot reject.');
      return;
    }
    setLoadingFor(id, true);
    let previous: QCCheck | undefined;
    setChecks(prev =>
      prev.map(c => {
        if (c.id === id) {
          previous = c;
          return { ...c, status: 'Rejected', result: 'Fail' };
        }
        return c;
      })
    );
    try {
      await vendorManagementApi.updateQCCheck(id, {
        status: 'rejected',
        result: 'Fail',
      });
      toast.error('Check rejected');
      // create an in-app alert for rejected checks
      const alertId = `alert-reject-${id}-${Date.now()}`;
      setAlerts(prev => [
        { id: alertId, checkId: id, message: `Check ${id} rejected — action required`, type: 'critical', acknowledged: false, ts: Date.now() },
        ...prev,
      ]);
      // Reload checks to get updated data
      const rawVendorId = '';
      const useVendorScope = rawVendorId && isValidMongoId(rawVendorId);
      const resp = useVendorScope
        ? await vendorManagementApi.listVendorQCChecks(rawVendorId)
        : await vendorManagementApi.listQCChecks({ page: 1, perPage: 25 });
      // Handle different response structures
      let items: any[] = [];
      if (Array.isArray(resp)) {
        items = resp;
      } else if (resp.data && Array.isArray(resp.data)) {
        items = resp.data;
      } else if (resp.items && Array.isArray(resp.items)) {
        items = resp.items;
      } else if (resp.pagination && resp.data) {
        items = Array.isArray(resp.data) ? resp.data : [];
      }
      // Transform items to match QCCheck interface
      const transformedChecks = items.map((item: any) => ({
        id: item._id?.toString() || item.id,
        checkId: item.checkId || item.id || `QC-${item._id?.toString().substring(0, 8)}`,
        batchId: item.batchId || 'N/A',
        product: item.product || 'Unknown',
        vendor: item.vendor || item.vendorId || 'Unknown',
        checkType: item.checkType || 'Visual',
        result: item.result || (item.status === 'approved' || item.status === 'passed' ? 'Pass' : item.status === 'rejected' || item.status === 'failed' ? 'Fail' : 'Pending'),
        inspector: item.inspector || item.inspectorId || 'N/A',
        date: item.date || item.createdAt,
        actualReading: item.actualReading,
        requirement: item.requirement,
        severity: item.severity,
        status: item.status === 'approved' || item.status === 'passed' ? 'Approved' : item.status === 'rejected' || item.status === 'failed' ? 'Rejected' : item.status === 'appealed' ? 'Appealed' : 'Pending',
        stage: item.stage || 'Review',
      }));
      setChecks(transformedChecks);
    } catch (err) {
      setChecks(prev => prev.map(c => (c.id === id && previous ? previous : c)));
      toast.error('Failed to reject check');
    } finally {
      setLoadingFor(id, false);
      setShowQCDetailModal(false);
    }
  };

  const appealCheck = async (id: string) => {
    if (!isValidMongoId(id)) {
      toast.error('Invalid check. Cannot appeal.');
      return;
    }
    setLoadingFor(id, true);
    let previous: QCCheck | undefined;
    setChecks(prev =>
      prev.map(c => {
        if (c.id === id) {
          previous = c;
          return { ...c, status: 'Appealed' };
        }
        return c;
      })
    );
    try {
      await vendorManagementApi.updateQCCheck(id, {
        status: 'appealed',
        notes: 'Appeal submitted',
      });
      toast.success('Appeal submitted');
      // add informational alert
      const alertId = `alert-appeal-${id}-${Date.now()}`;
      setAlerts(prev => [{ id: alertId, checkId: id, message: `Appeal submitted for ${id}`, type: 'info', acknowledged: false, ts: Date.now() }, ...prev]);
      // Reload checks to get updated data
      const rawVendorId = '';
      const useVendorScope = rawVendorId && isValidMongoId(rawVendorId);
      const resp = useVendorScope
        ? await vendorManagementApi.listVendorQCChecks(rawVendorId)
        : await vendorManagementApi.listQCChecks({ page: 1, perPage: 25 });
      // Handle different response structures
      let items: any[] = [];
      if (Array.isArray(resp)) {
        items = resp;
      } else if (resp.data && Array.isArray(resp.data)) {
        items = resp.data;
      } else if (resp.items && Array.isArray(resp.items)) {
        items = resp.items;
      } else if (resp.pagination && resp.data) {
        items = Array.isArray(resp.data) ? resp.data : [];
      }
      // Transform items to match QCCheck interface
      const transformedChecks = items.map((item: any) => ({
        id: item._id?.toString() || item.id,
        checkId: item.checkId || item.id || `QC-${item._id?.toString().substring(0, 8)}`,
        batchId: item.batchId || 'N/A',
        product: item.product || 'Unknown',
        vendor: item.vendor || item.vendorId || 'Unknown',
        checkType: item.checkType || 'Visual',
        result: item.result || (item.status === 'approved' || item.status === 'passed' ? 'Pass' : item.status === 'rejected' || item.status === 'failed' ? 'Fail' : 'Pending'),
        inspector: item.inspector || item.inspectorId || 'N/A',
        date: item.date || item.createdAt,
        actualReading: item.actualReading,
        requirement: item.requirement,
        severity: item.severity,
        status: item.status === 'approved' || item.status === 'passed' ? 'Approved' : item.status === 'rejected' || item.status === 'failed' ? 'Rejected' : item.status === 'appealed' ? 'Appealed' : 'Pending',
        stage: item.stage || 'Review',
      }));
      setChecks(transformedChecks);
    } catch (err) {
      setChecks(prev => prev.map(c => (c.id === id && previous ? previous : c)));
      toast.error('Failed to submit appeal');
    } finally {
      setLoadingFor(id, false);
      setShowQCDetailModal(false);
    }
  };
 
  const handleNextReportAction = async (id: string, action: 'approve' | 'reject') => {
    if (!isValidMongoId(id)) {
      toast.error('Invalid check. Cannot process.');
      return;
    }
    setLoadingFor(id, true);
    let previous: QCCheck | undefined;
    setChecks(prev =>
      prev.map(c => {
        if (c.id === id) {
          previous = c;
          return {
            ...c,
            stage: 'Reported',
            status: action === 'approve' ? 'Approved' : 'Rejected',
            result: action === 'approve' ? 'Pass' : 'Fail',
          };
        }
        return c;
      })
    );
    try {
      console.log('Updating QC check:', { id, action });
      const updateResult = await vendorManagementApi.updateQCCheck(id, {
        status: action === 'approve' ? 'approved' : 'rejected',
        result: action === 'approve' ? 'Pass' : 'Fail',
      });
      console.log('QC check update result:', updateResult);
      toast.success(`Report ${action === 'approve' ? 'approved' : 'rejected'}`);
      // close menu
      setOpenReportMenuId(null);
      if (action === 'reject') {
        const alertId = `alert-report-reject-${id}-${Date.now()}`;
        setAlerts(prev => [{ id: alertId, checkId: id, message: `Report for ${id} was rejected`, type: 'warning', acknowledged: false, ts: Date.now() }, ...prev]);
      }
      // Wait a bit to ensure backend has saved, then reload checks to get updated data
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Reloading QC checks after update...');
      const rawVendorId = '';
      const useVendorScope = rawVendorId && isValidMongoId(rawVendorId);
      const resp = useVendorScope
        ? await vendorManagementApi.listVendorQCChecks(rawVendorId)
        : await vendorManagementApi.listQCChecks({ page: 1, perPage: 25 });
      console.log('Reloaded QC checks response:', resp);
      // Handle different response structures
      let items: any[] = [];
      if (Array.isArray(resp)) {
        items = resp;
      } else if (resp.data && Array.isArray(resp.data)) {
        items = resp.data;
      } else if (resp.items && Array.isArray(resp.items)) {
        items = resp.items;
      } else if (resp.pagination && resp.data) {
        items = Array.isArray(resp.data) ? resp.data : [];
      }
      
      // Check if the updated item is in the response
      const updatedItem = items.find((item: any) => {
        const itemId = item._id?.toString() || item.id;
        return itemId === id;
      });
      console.log('Updated item found in reload:', updatedItem);
      
      // Transform items to match QCCheck interface
      let transformedChecks = items.map((item: any) => {
        const itemId = item._id?.toString() || item.id;
        // Map backend status to frontend status
        let frontendStatus = 'Pending';
        if (item.status === 'approved' || item.status === 'passed') {
          frontendStatus = 'Approved';
        } else if (item.status === 'rejected' || item.status === 'failed') {
          frontendStatus = 'Rejected';
        } else if (item.status === 'appealed') {
          frontendStatus = 'Appealed';
        }
        
        return {
          id: itemId,
          checkId: item.checkId || item.id || `QC-${itemId.substring(0, 8)}`,
          batchId: item.batchId || 'N/A',
          product: item.product || 'Unknown',
          vendor: item.vendor || item.vendorId || 'Unknown',
          vendorId: item.vendorId || vendorId || '', // Preserve vendorId for persistence
          checkType: item.checkType || 'Visual',
          result: item.result || (item.status === 'approved' || item.status === 'passed' ? 'Pass' : item.status === 'rejected' || item.status === 'failed' ? 'Fail' : 'Pending'),
          inspector: item.inspector || item.inspectorId || 'N/A',
          date: item.date || item.createdAt,
          actualReading: item.actualReading,
          requirement: item.requirement,
          severity: item.severity,
          status: frontendStatus,
          stage: item.stage || 'Review',
        };
      });
      
      // Merge with current checks to preserve optimistic updates
      const currentChecks = checks;
      const currentCheck = currentChecks.find(c => c.id === id);
      
      if (transformedChecks.length > 0) {
        // Merge API data with current state, preserving optimistic update
        const mergedChecks = transformedChecks.map(apiCheck => {
          if (apiCheck.id === id && currentCheck) {
            // Prefer optimistic update if it exists
            return {
              ...apiCheck,
              status: currentCheck.status,
              result: currentCheck.result,
              stage: currentCheck.stage || apiCheck.stage,
            };
          }
          return apiCheck;
        });
        
        // Add any current checks not in API response
        currentChecks.forEach(currentCheck => {
          if (!mergedChecks.find(c => c.id === currentCheck.id)) {
            mergedChecks.push(currentCheck);
          }
        });
        
        setChecks(mergedChecks);
      } else {
        // Backend returned empty - keep optimistic update and ensure it persists
        console.log('Backend returned empty, keeping optimistic update');
        const updatedChecks = currentChecks.map(c => {
          if (c.id === id) {
            return {
              ...c,
              status: action === 'approve' ? 'Approved' : 'Rejected',
              result: action === 'approve' ? 'Pass' : 'Fail',
              stage: 'Reported',
            };
          }
          return c;
        });
        setChecks(updatedChecks);
      }
    } catch (err: any) {
      setChecks(prev => prev.map(c => (c.id === id && previous ? previous : c)));
      const errorMessage = err.message || 'Failed to process report action';
      toast.error(errorMessage);
      console.error('Report action error:', err);
    } finally {
      setLoadingFor(id, false);
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => (a.id === alertId ? { ...a, acknowledged: true } : a)));
  };

  const scheduleAudit = async (auditId?: string) => {
    const id = auditId || `sch-${Date.now()}`;
    setLoadingFor(id, true);
    try {
      let vendorId = '';
      let vendorName = 'N/A';
      
      if (selectedAudit) {
        const auditVendorId = (selectedAudit as any).vendorId;
        if (auditVendorId && auditVendorId.trim() !== '') {
          vendorId = auditVendorId;
        }
        vendorName = selectedAudit.vendor || 'N/A';
      } else if (auditId) {
        const audit = audits.find(a => a.id === auditId);
        if (audit) {
          const auditVendorId = (audit as any).vendorId;
          if (auditVendorId && auditVendorId.trim() !== '') {
            vendorId = auditVendorId;
          }
          vendorName = audit.vendor || 'N/A';
        }
      } else {
        // If no vendorId, try to get from the first audit in the list
        if (!vendorId && audits.length > 0) {
          const firstAudit = audits[0];
          const auditVendorId = (firstAudit as any).vendorId;
          if (auditVendorId && auditVendorId.trim() !== '') {
            vendorId = auditVendorId;
          }
          if (!vendorName || vendorName === 'N/A') {
            vendorName = firstAudit.vendor || 'N/A';
          }
        }
      }
      
      // Final fallback: if still no vendorId, try multiple strategies
      if (!vendorId || vendorId.trim() === '') {
        // Strategy 1: Try to get vendorId from the vendor name in selectedAudit by looking up in audits
        if (selectedAudit && selectedAudit.vendor && selectedAudit.vendor !== 'N/A') {
          const auditWithVendorId = audits.find(a => a.vendor === selectedAudit.vendor && (a as any).vendorId);
          if (auditWithVendorId) {
            vendorId = (auditWithVendorId as any).vendorId;
          }
        }
        
        // Strategy 2: Try to find any audit with a vendorId
        if (!vendorId || vendorId.trim() === '') {
          const auditWithVendorId = audits.find(a => (a as any).vendorId && (a as any).vendorId.trim() !== '');
          if (auditWithVendorId) {
            vendorId = (auditWithVendorId as any).vendorId;
            vendorName = auditWithVendorId.vendor || 'N/A';
          }
        }
        
        if (!vendorId || !isValidMongoId(vendorId)) {
          const errorMsg = 'Valid vendor ID is required to schedule audit. Please select a vendor first.';
          toast.error(errorMsg);
          throw new Error(errorMsg);
        }
      }
      
      // Get vendor name if we don't have it
      if (!vendorName || vendorName === 'N/A') {
        try {
          const vendorResp = await vendorManagementApi.getVendorById(vendorId);
          vendorName = vendorResp.data?.name || vendorResp.name || vendorResp.data?.vendorName || 'N/A';
        } catch (e) {
          console.warn('Failed to fetch vendor name', e);
          // Try to use vendorId as name if fetch fails
          vendorName = vendorId;
        }
      }
      
      const auditData = {
        vendorId: vendorId,
        auditType: 'Routine',
        date: new Date(),
      };
      
      const response = await vendorManagementApi.scheduleAudit(auditData);
      const newAudit: Audit = {
        id: response.data?._id?.toString() || response.data?.id || id,
        auditId: response.data?.auditId || `SCH-${Math.floor(1000 + Math.random() * 9000)}`,
        vendor: vendorName,
        vendorId: vendorId, // Ensure vendorId is included
        date: response.data?.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        auditType: response.data?.auditType || 'Routine',
        result: response.data?.result || 'Pending',
        score: response.data?.score || 0
      };
      // optimistic add
      setAudits(prev => {
        const updated = [newAudit, ...prev];
        return updated;
      });
      toast.success('Audit scheduled');
      // Reload audits to get updated data
      const vendorIdForReload = vendorId;
      if (vendorIdForReload) {
        const auditsResp = await vendorManagementApi.getAudits({ vendorId: vendorIdForReload });
        const auditsData = auditsResp.data || auditsResp || [];
        const transformedAudits = Array.isArray(auditsData) ? auditsData.map((a: any) => ({
          id: a._id?.toString() || a.id,
          auditId: a.auditId || a.id,
          vendor: a.vendor || a.vendorName || a.vendorId || 'N/A',
          vendorId: a.vendorId || vendorIdForReload || '', // Preserve vendorId
          date: a.date || new Date(a.createdAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          auditType: a.auditType || 'Routine',
          result: a.result || 'Pending',
          score: a.score || 0,
        })) : [];
        
        setAudits(transformedAudits);
      }
    } catch (err: any) {
      console.error('Schedule audit error:', err);
      // Extract error message properly
      let errorMessage = 'Failed to schedule audit';
      if (err) {
        if (typeof err === 'string') {
          errorMessage = err;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.error) {
          errorMessage = typeof err.error === 'string' ? err.error : err.error.message || 'Failed to schedule audit';
        } else if (err.data) {
          errorMessage = typeof err.data === 'string' ? err.data : err.data.message || 'Failed to schedule audit';
        } else {
          errorMessage = JSON.stringify(err);
        }
      }
      // Ensure errorMessage is always a string
      const finalErrorMessage = typeof errorMessage === 'string' ? errorMessage : 'Failed to schedule audit';
      toast.error(finalErrorMessage);
      // Don't throw here, just show error
    } finally {
      setLoadingFor(id, false);
    }
  };

  const verifyCertificate = async (certId: string) => {
    if (!isValidMongoId(certId)) {
      toast.error('Invalid certificate. Cannot verify.');
      return;
    }
    setLoadingFor(certId, true);
    const currentCertificates = certificates;
    // Optimistic update - save immediately
    setCertificates(prev => {
      const updated = prev.map(c => c.id === certId ? { ...c, status: 'Valid' } : c);
      return updated;
    });
    try {
      await vendorManagementApi.updateCertificate(certId, {
        status: 'valid',
      });
      toast.success('Certificate verified');
      // Wait a bit to ensure backend has saved, then reload certificates to get updated data
      await new Promise(resolve => setTimeout(resolve, 500));
      const vendorId = '';
      try {
        if (vendorId) {
          const certResp = await vendorManagementApi.listVendorCertificates(vendorId);
          const certs = Array.isArray(certResp) ? certResp : (certResp.items || certResp.data || []);
          if (certs.length > 0) {
            const transformedCerts = certs.map((c: any) => ({
              id: c._id?.toString() || c.id,
              certificateType: c.type || c.certificateType || 'Unknown',
              vendor: c.vendor || c.vendorName || c.vendorId || 'Unknown',
              issuedDate: c.issuedAt ? new Date(c.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
              expiryDate: c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
              status: c.status === 'valid' ? 'Valid' : c.status === 'expired' ? 'Expired' : c.status === 'pending_renewal' ? 'Pending Renewal' : c.status === 'expiring_soon' ? 'Expiring Soon' : 'Valid',
              daysToExpiry: c.expiresAt ? Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
              licenseNumber: c.licenseNumber || c.metadata?.licenseNumber,
            }));
            
            // Merge with current state to preserve optimistic update
            const currentCert = currentCertificates.find(c => c.id === certId);
            const mergedCerts = transformedCerts.map(apiCert => {
              if (apiCert.id === certId && currentCert && currentCert.status === 'Valid') {
                return currentCert; // Prefer optimistic update
              }
              return apiCert;
            });
            
            // Add any current certs not in API
            currentCertificates.forEach(currentCert => {
              if (!mergedCerts.find(c => c.id === currentCert.id)) {
                mergedCerts.push(currentCert);
              }
            });
            
            setCertificates(mergedCerts);
          } else {
            // Backend returned empty - keep optimistic update
            console.log('Backend returned empty certificates, keeping optimistic update');
            const updated = currentCertificates.map(c => c.id === certId ? { ...c, status: 'Valid' } : c);
            setCertificates(updated);
          }
        } else {
          console.warn('No vendorId found, keeping optimistic update');
          const updated = currentCertificates.map(c => c.id === certId ? { ...c, status: 'Valid' } : c);
          setCertificates(updated);
        }
      } catch (reloadErr) {
        console.error('Failed to reload certificates after verification:', reloadErr);
        // Keep the optimistic update
        const updated = currentCertificates.map(c => c.id === certId ? { ...c, status: 'Valid' } : c);
        setCertificates(updated);
      }
    } catch (err: any) {
      console.error('Verify certificate error:', err);
      toast.error(err.message || 'Verification failed');
    } finally {
      setLoadingFor(certId, false);
      setShowCertificateModal(false);
    }
  };

  const renewCertificate = async (certId: string) => {
    if (!isValidMongoId(certId)) {
      toast.error('Invalid certificate. Cannot renew.');
      return;
    }
    setLoadingFor(certId, true);
    const currentCertificates = certificates;
    const cert = currentCertificates.find(c => c.id === certId);
    const newExpiryDate = new Date();
    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1); // Renew for 1 year
    const newExpiryDateStr = newExpiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    
    // Optimistic update - save immediately
    setCertificates(prev => {
      const updated = prev.map(c => c.id === certId ? { ...c, status: 'Pending Renewal', expiryDate: newExpiryDateStr } : c);
      return updated;
    });
    try {
      
      await vendorManagementApi.updateCertificate(certId, {
        status: 'valid',
        expiresAt: newExpiryDate,
      });
      toast.success('Renewal scheduled');
      // Wait a bit to ensure backend has saved, then reload certificates to get updated data
      await new Promise(resolve => setTimeout(resolve, 500));
      const vendorId = '';
      try {
        if (vendorId) {
          const certResp = await vendorManagementApi.listVendorCertificates(vendorId);
          const certs = Array.isArray(certResp) ? certResp : (certResp.items || certResp.data || []);
          if (certs.length > 0) {
            const transformedCerts = certs.map((c: any) => ({
              id: c._id?.toString() || c.id,
              certificateType: c.type || c.certificateType || 'Unknown',
              vendor: c.vendor || c.vendorName || c.vendorId || 'Unknown',
              issuedDate: c.issuedAt ? new Date(c.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
              expiryDate: c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
              status: c.status === 'valid' ? 'Valid' : c.status === 'expired' ? 'Expired' : c.status === 'pending_renewal' ? 'Pending Renewal' : c.status === 'expiring_soon' ? 'Expiring Soon' : 'Valid',
              daysToExpiry: c.expiresAt ? Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
              licenseNumber: c.licenseNumber || c.metadata?.licenseNumber,
            }));
            // Merge with current state to preserve optimistic update
            const currentCert = currentCertificates.find(c => c.id === certId);
            const mergedCerts = transformedCerts.map(apiCert => {
              if (apiCert.id === certId && currentCert && currentCert.status === 'Pending Renewal') {
                return currentCert; // Prefer optimistic update
              }
              return apiCert;
            });
            
            // Add any current certs not in API
            currentCertificates.forEach(currentCert => {
              if (!mergedCerts.find(c => c.id === currentCert.id)) {
                mergedCerts.push(currentCert);
              }
            });
            
            setCertificates(mergedCerts);
          } else {
            // Backend returned empty - keep optimistic update
            console.log('Backend returned empty certificates, keeping optimistic update');
            const updated = currentCertificates.map(c => c.id === certId ? { ...c, status: 'Pending Renewal', expiryDate: newExpiryDateStr } : c);
            setCertificates(updated);
          }
        } else {
          console.warn('No vendorId found, keeping optimistic update');
          const updated = currentCertificates.map(c => c.id === certId ? { ...c, status: 'Pending Renewal', expiryDate: newExpiryDateStr } : c);
          setCertificates(updated);
        }
      } catch (reloadErr) {
        console.error('Failed to reload certificates after renewal:', reloadErr);
        // Keep the optimistic update
        const updated = currentCertificates.map(c => c.id === certId ? { ...c, status: 'Pending Renewal', expiryDate: newExpiryDateStr } : c);
        setCertificates(updated);
      }
    } catch (err: any) {
      console.error('Renew certificate error:', err);
      toast.error(err.message || 'Failed to schedule renewal');
    } finally {
      setLoadingFor(certId, false);
    }
  };

  const alertVendor = async (vendor: string) => {
    const id = `alert-${vendor}-${Date.now()}`;
    setLoadingFor(id, true);
    try {
      await new Promise(res => setTimeout(res, 500));
      toast.success(`Alert sent to ${vendor}`);
    } catch (err) {
      toast.error('Failed to send alert');
    } finally {
      setLoadingFor(id, false);
    }
  };

  // Export functions
  const exportQCCheckReport = () => {
    if (!selectedCheck) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const csvData: (string | number)[][] = [
        ['QC Check Report', `Date: ${today}`],
        [''],
        ['Check Information'],
        ['Check ID', selectedCheck.checkId],
        ['Batch ID', selectedCheck.batchId],
        ['Product', selectedCheck.product],
        ['Vendor', selectedCheck.vendor],
        ['Check Type', selectedCheck.checkType],
        ['Inspector', selectedCheck.inspector || 'N/A'],
        ['Check Date', selectedCheck.date || 'N/A'],
        [''],
        ['Check Details'],
        ['Result', selectedCheck.result],
        ['Requirement', selectedCheck.requirement || 'N/A'],
        ['Actual Reading', selectedCheck.actualReading || 'N/A'],
        ['Severity', selectedCheck.severity || 'N/A'],
      ];
      exportToCSV(csvData, `qc-check-${selectedCheck.checkId}-${today}`);
      toast.success('QC Check report downloaded');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const exportAuditReport = () => {
    if (!selectedAudit) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const csvData: (string | number)[][] = [
        ['Audit Report', `Date: ${today}`],
        [''],
        ['Audit Information'],
        ['Audit ID', selectedAudit.auditId],
        ['Vendor', selectedAudit.vendor],
        ['Audit Date', selectedAudit.date],
        ['Audit Type', selectedAudit.auditType],
        ['Result', selectedAudit.result],
        ['Score', selectedAudit.score],
      ];
      exportToCSV(csvData, `audit-${selectedAudit.auditId}-${today}`);
      toast.success('Audit report downloaded');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const exportSampleTestReport = () => {
    if (!selectedTemp) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const csvData: (string | number)[][] = [
        ['Temperature Compliance Report', `Date: ${today}`],
        [''],
        ['Shipment Information'],
        ['Shipment ID', selectedTemp.shipmentId],
        ['Product', selectedTemp.product],
        ['Vendor', selectedTemp.vendor],
        ['Requirement', selectedTemp.requirement],
        ['Average Temperature', `${selectedTemp.avgTemp}°C`],
        ['Min Temperature', `${selectedTemp.minTemp}°C`],
        ['Max Temperature', `${selectedTemp.maxTemp}°C`],
        ['Compliant', selectedTemp.compliant ? 'Yes' : 'No'],
      ];
      exportToCSV(csvData, `temperature-compliance-${selectedTemp.shipmentId}-${today}`);
      toast.success('Temperature compliance report downloaded');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const exportRejectionReport = () => {
    if (!selectedCheck) return; // Reusing selectedCheck for rejections
    try {
      const today = new Date().toISOString().split('T')[0];
      const csvData: (string | number)[][] = [
        ['Rejection Report', `Date: ${today}`],
        [''],
        ['Rejection Information'],
        ['Check ID', selectedCheck.checkId],
        ['Batch ID', selectedCheck.batchId],
        ['Product', selectedCheck.product],
        ['Vendor', selectedCheck.vendor],
        ['Reason', 'Storage temperature exceeded acceptable range'],
        ['Severity', selectedCheck.severity || 'High'],
        ['Impact', 'Product quality compromise'],
        ['Recommendation', 'Reject batch / Return to vendor'],
      ];
      exportToCSV(csvData, `rejection-${selectedCheck.checkId}-${today}`);
      toast.success('Rejection report downloaded');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const exportCertificate = () => {
    if (!selectedCertificate) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const csvData: (string | number)[][] = [
        ['Certificate Report', `Date: ${today}`],
        [''],
        ['Certificate Information'],
        ['Certificate Type', selectedCertificate.certificateType],
        ['Vendor', selectedCertificate.vendor],
        ['Issued Date', selectedCertificate.issuedDate],
        ['Expiry Date', selectedCertificate.expiryDate],
        ['Status', selectedCertificate.status],
        ['Days to Expiry', selectedCertificate.daysToExpiry],
        ['License Number', selectedCertificate.licenseNumber || 'N/A'],
      ];
      exportToCSV(csvData, `certificate-${selectedCertificate.certificateType}-${today}`);
      toast.success('Certificate report downloaded');
    } catch (error) {
      toast.error('Failed to download certificate');
    }
  };
  const [selectedRating, setSelectedRating] = useState<VendorRating | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);

  // Modal states
  const [showQCDetailModal, setShowQCDetailModal] = useState(false);
  const [showAuditLogModal, setShowAuditLogModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showTempReportModal, setShowTempReportModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Get result badge color
  const getResultColor = (result: QCResult) => {
    switch (result) {
      case 'Pass':
        return { bg: '#DCFCE7', text: '#166534' };
      case 'Fail':
        return { bg: '#FEE2E2', text: '#991B1B' };
      case 'Pending':
        return { bg: '#FEF3C7', text: '#92400E' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  // Get certificate status color
  const getCertificateColor = (status: CertificateStatus) => {
    switch (status) {
      case 'Valid':
        return { bg: '#DCFCE7', text: '#166534' };
      case 'Expiring Soon':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'Expired':
        return { bg: '#FEE2E2', text: '#991B1B' };
      case 'Pending Renewal':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  // Get rating color
  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return '#10B981';
    if (rating >= 4.0) return '#0EA5E9';
    if (rating >= 3.0) return '#F59E0B';
    return '#EF4444';
  };

  // Render stars
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${i < fullStars ? 'fill-current' : ''}`}
          style={{ color: getRatingColor(rating) }}
        />
      );
    }
    return stars;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="QC & Compliance"
        subtitle="Inbound quality checks, audit logs, and safety certificates"
      />

      {/* Three-Metric Dashboard */}
      <div className="grid grid-cols-3 gap-4">
        {/* QC Checks Today */}
        <div
          className="bg-white border border-[#E5E7EB] rounded-lg p-5 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          style={{ borderLeft: '4px solid #0EA5E9' }}
        >
          <div className="flex items-start justify-between mb-3">
            <Clipboard className="w-6 h-6 text-[#0EA5E9]" />
          </div>
          <div className="mb-2">
            <p className="text-[28px] font-bold text-[#1F2937]">42</p>
            <p className="text-xs text-[#6B7280]">Batches</p>
            <p className="text-[10px] text-[#9CA3AF]">QC Checks Today</p>
          </div>
          <div className="text-xs text-[#6B7280] space-y-1">
            <div>Passed: <span className="font-bold text-[#10B981]">40</span> (95.2%)</div>
            <div>Failed: <span className="font-bold text-[#EF4444]">2</span> (4.8%)</div>
            <div>Pending: <span className="font-bold text-[#1F2937]">0</span></div>
          </div>
        </div>

        {/* Pass Rate */}
        <div
          className="bg-white border border-[#E5E7EB] rounded-lg p-5 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          style={{ borderLeft: '4px solid #10B981' }}
        >
          <div className="flex items-start justify-between mb-3">
            <CheckCircle className="w-6 h-6 text-[#10B981]" />
          </div>
          <div className="mb-2">
            <p className="text-[28px] font-bold text-[#1F2937]">96%</p>
            <p className="text-xs text-[#6B7280]">Last 7 days</p>
            <p className="text-[10px] text-[#9CA3AF]">Pass Rate</p>
          </div>
          <div className="text-xs text-[#6B7280] space-y-1">
            <div>Total checks: <span className="font-bold text-[#1F2937]">287</span></div>
            <div>Passed: <span className="font-bold text-[#10B981]">275</span></div>
            <div>Failed: <span className="font-bold text-[#EF4444]">12</span> (requires action)</div>
            <div>Pass target: <span className="font-bold text-[#10B981]">&gt;95% ✓</span></div>
          </div>
        </div>

        {/* Failures */}
        <div
          className="bg-white border border-[#E5E7EB] rounded-lg p-5 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          style={{ borderLeft: '4px solid #EF4444' }}
        >
          <div className="flex items-start justify-between mb-3">
            <AlertTriangle className="w-6 h-6 text-[#EF4444] animate-pulse" />
          </div>
          <div className="mb-2">
            <p className="text-[28px] font-bold text-[#1F2937]">2</p>
            <p className="text-xs text-[#6B7280]">Requires Action</p>
            <p className="text-[10px] text-[#9CA3AF]">Failures</p>
          </div>
          <div className="text-xs text-[#6B7280] space-y-1">
            <div>Critical failures: <span className="font-bold text-[#EF4444]">1</span></div>
            <div>Major failures: <span className="font-bold text-[#F59E0B]">1</span></div>
            <div>Vendor: <span className="font-bold text-[#1F2937]">Dairy Delights</span></div>
            <div>Status: <span className="font-bold text-[#F59E0B]">Pending Review</span></div>
          </div>
        </div>
      </div>

      {/* Recent Audits Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        {/* In-app alerts */}
        {alerts.length > 0 && (
          <div className="px-6 py-3 border-b border-[#E5E7EB] bg-[#FFFBEB]">
            <div className="flex flex-col gap-2">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-white border border-[#F1F5F9] rounded p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-1 rounded-full" style={{ background: a.type === 'critical' ? '#DC2626' : a.type === 'warning' ? '#F59E0B' : '#0EA5E9' }} />
                    <div className="text-sm">
                      <div className="font-medium text-[#1F2937]">{a.message}</div>
                      <div className="text-xs text-[#6B7280]">{new Date(a.ts || Date.now()).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!a.acknowledged && (
                      <button onClick={() => acknowledgeAlert(a.id)} className="px-3 py-1.5 bg-[#10B981] text-white text-xs rounded">Acknowledge</button>
                    )}
                    <button onClick={() => setAlerts(prev => prev.filter(x => x.id !== a.id))} className="px-3 py-1.5 bg-white border border-[#E5E7EB] text-xs rounded">Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-bold text-[#1F2937]">Recent QC Checks</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#6B7280] font-medium border-b border-[#E5E7EB]">
              <tr>
                <th className="px-6 py-3 text-xs font-bold uppercase">Batch ID</th>
                <th className="px-6 py-3 text-xs font-bold uppercase">Product</th>
                <th className="px-6 py-3 text-xs font-bold uppercase">Vendor</th>
                <th className="px-6 py-3 text-xs font-bold uppercase">Check Type</th>
                <th className="px-6 py-3 text-xs font-bold uppercase">Result</th>
                <th className="px-6 py-3 text-xs font-bold uppercase">Inspector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {checks.slice(0, 4).map((check) => {
                const colors = getResultColor(check.result);
                return (
                  <tr key={check.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-6 py-4 font-mono text-[#616161]">{check.batchId}</td>
                    <td className="px-6 py-4 font-medium text-[#212121]">{check.product}</td>
                    <td className="px-6 py-4 text-[#616161]">{check.vendor}</td>
                    <td className="px-6 py-4 text-[#616161]">{check.checkType} / Visual</td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {check.result === 'Pass' && <CheckCircle className="w-3 h-3" />}
                        {check.result === 'Fail' && <XCircle className="w-3 h-3" />}
                        {check.result} {check.result === 'Fail' && check.actualReading && `(${check.actualReading})`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#616161]">{check.inspector}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b-2 border-[#E5E7EB]">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('qc')}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'qc' ? 'text-[#4F46E5]' : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            QC Checks
            {activeTab === 'qc' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />}
          </button>

          <button
            onClick={() => setActiveTab('audits')}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'audits' ? 'text-[#4F46E5]' : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            Audit Logs
            {activeTab === 'audits' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />}
          </button>

          <button
            onClick={() => setActiveTab('certs')}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'certs' ? 'text-[#4F46E5]' : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            Certifications
            {activeTab === 'certs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />}
          </button>

          <button
            onClick={() => setActiveTab('temp')}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'temp' ? 'text-[#4F46E5]' : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            Temperature Compliance
            {activeTab === 'temp' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />}
          </button>

          <button
            onClick={() => setActiveTab('ratings')}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'ratings' ? 'text-[#4F46E5]' : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            Quality Ratings
            {activeTab === 'ratings' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'qc' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F7FA] text-[#6B7280] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Check ID</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Batch ID</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Product</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Vendor</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Check Type</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Result</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {checks.map((check) => {
                  const colors = getResultColor(check.result);
                  return (
                    <tr key={check.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-6 py-4 font-mono text-[#616161]">{check.checkId}</td>
                      <td className="px-6 py-4 font-mono text-[#616161]">{check.batchId}</td>
                      <td className="px-6 py-4 font-medium text-[#212121]">{check.product}</td>
                      <td className="px-6 py-4 text-[#616161]">{check.vendor}</td>
                      <td className="px-6 py-4">
                        <span className="text-[#0EA5E9]">{check.checkType}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {check.result === 'Pass' && <CheckCircle className="w-3 h-3" />}
                          {check.result === 'Fail' && <XCircle className="w-3 h-3" />}
                          {check.result}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedCheck(check);
                              setShowQCDetailModal(true);
                            }}
                            className="px-3 py-1.5 bg-[#6B7280] text-white text-xs font-medium rounded-md hover:bg-[#4B5563] transition-all duration-200"
                          >
                            {check.result === 'Fail' ? 'Review' : 'View'}
                          </button>
                          {check.status !== 'Approved' && (
                            <button
                              onClick={() => approveCheck(check.id)}
                              className="px-3 py-1.5 bg-[#10B981] text-white text-xs font-medium rounded-md hover:bg-[#059669] transition-all duration-200"
                            >
                              {loadingIds[check.id] ? 'Processing...' : 'Approve'}
                            </button>
                          )}
                          {check.result === 'Fail' && check.status !== 'Appealed' && (
                            <button
                              onClick={() => appealCheck(check.id)}
                              className="px-3 py-1.5 bg-[#0EA5E9] text-white text-xs font-medium rounded-md hover:bg-[#0284C7] transition-all duration-200"
                            >
                              {loadingIds[check.id] ? 'Submitting...' : 'Appeal'}
                            </button>
                          )}
                          {/* Next Report dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setOpenReportMenuId(openReportMenuId === check.id ? null : check.id)}
                              className="px-3 py-1.5 bg-[#6B7280] text-white text-xs font-medium rounded-md hover:bg-[#4B5563] transition-all duration-200"
                            >
                              Report
                            </button>
                            {openReportMenuId === check.id && (
                              <div className="absolute right-0 mt-2 w-36 bg-white border border-[#E5E7EB] rounded shadow-sm z-10">
                                <button
                                  onClick={() => handleNextReportAction(check.id, 'approve')}
                                  className="w-full text-left px-3 py-2 hover:bg-[#F3F4F6]"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleNextReportAction(check.id, 'reject')}
                                  className="w-full text-left px-3 py-2 hover:bg-[#FEEDEE] text-[#DC2626]"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                          {/* Alert button removed per design - not used */}
                          <button className="p-1.5 border border-[#E0E0E0] rounded hover:bg-[#F5F5F5]">
                            <MoreVertical className="w-4 h-4 text-[#757575]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audits' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F7FA] text-[#6B7280] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Audit ID</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Vendor</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Date</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Audit Type</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Result</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {audits.map((audit) => (
                  <tr key={audit.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-6 py-4 font-mono text-[#616161]">{audit.auditId}</td>
                    <td className="px-6 py-4 font-medium text-[#212121]">{audit.vendor}</td>
                    <td className="px-6 py-4 text-[#616161]">{audit.date}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-medium ${
                          audit.auditType === 'Full Audit' ? 'text-[#7C3AED]' :
                          audit.auditType === 'Follow-up' ? 'text-[#F59E0B]' :
                          audit.auditType === 'Routine' ? 'text-[#0EA5E9]' :
                          audit.auditType === 'Complaint-based' ? 'text-[#EF4444]' :
                          'text-[#10B981]'
                        }`}
                      >
                        {audit.auditType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${audit.result === 'Passed' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}
                        >
                          {audit.result}
                        </span>
                        <span className="text-[#6B7280]">{audit.score}/100</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedAudit(audit);
                            setShowAuditLogModal(true);
                          }}
                          className="px-3 py-1.5 bg-[#6B7280] text-white text-xs font-medium rounded-md hover:bg-[#4B5563]"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            try {
                              const today = new Date().toISOString().split('T')[0];
                              const csvData: (string | number)[][] = [
                                ['Audit Report', `Date: ${today}`],
                                [''],
                                ['Audit Information'],
                                ['Audit ID', audit.auditId],
                                ['Vendor', audit.vendor],
                                ['Audit Date', audit.date],
                                ['Audit Type', audit.auditType],
                                ['Result', audit.result],
                                ['Score', audit.score],
                              ];
                              exportToCSV(csvData, `audit-${audit.auditId}-${today}`);
                              toast.success('Audit report downloaded');
                            } catch (error) {
                              toast.error('Failed to download report');
                            }
                          }}
                          className="px-3 py-1.5 bg-[#6B7280] text-white text-xs font-medium rounded-md hover:bg-[#4B5563]"
                        >
                          Download
                        </button>
                        {audit.result === 'Passed' && (
                          <button
                            onClick={async () => {
                              try {
                                await scheduleAudit(audit.id);
                              } catch (err: any) {
                                // Error is already handled in scheduleAudit function
                                console.error('Schedule audit error:', err);
                              }
                            }}
                            className="px-3 py-1.5 bg-[#4F46E5] text-white text-xs font-medium rounded-md hover:bg-[#4338CA]"
                          >
                            {loadingIds[audit.id] ? 'Scheduling...' : 'Schedule'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'certs' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F7FA] text-[#6B7280] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Certificate</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Vendor</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Issued Date</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Expiry Date</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Document</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {certificates.map((cert) => {
                  const colors = getCertificateColor(cert.status);
                  return (
                    <tr key={cert.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-6 py-4 font-medium text-[#212121]">{cert.certificateType}</td>
                      <td className="px-6 py-4 text-[#616161]">{cert.vendor}</td>
                      <td className="px-6 py-4 text-[#616161]">{cert.issuedDate}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-medium ${
                            cert.daysToExpiry > 180 ? 'text-[#10B981]' :
                            cert.daysToExpiry > 90 ? 'text-[#F59E0B]' :
                            cert.daysToExpiry > 0 ? 'text-[#EF4444]' :
                            'text-[#991B1B]'
                          }`}
                        >
                          {cert.expiryDate}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {cert.status === 'Valid' && <CheckCircle className="w-3 h-3" />}
                          {cert.status === 'Expired' && <XCircle className="w-3 h-3" />}
                          {cert.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              try {
                                const today = new Date().toISOString().split('T')[0];
                                const csvData: (string | number)[][] = [
                                  ['Certificate Report', `Date: ${today}`],
                                  [''],
                                  ['Certificate Information'],
                                  ['Certificate Type', cert.certificateType],
                                  ['Vendor', cert.vendor],
                                  ['Issued Date', cert.issuedDate],
                                  ['Expiry Date', cert.expiryDate],
                                  ['Status', cert.status],
                                  ['Days to Expiry', cert.daysToExpiry],
                                  ['License Number', cert.licenseNumber || 'N/A'],
                                ];
                                exportToCSV(csvData, `certificate-${cert.certificateType}-${today}`);
                                toast.success('Certificate report downloaded');
                              } catch (error) {
                                toast.error('Failed to download certificate');
                              }
                            }}
                            className="text-xs text-[#4F46E5] hover:underline"
                          >
                            Download
                          </button>
                          {cert.status === 'Expired' && (
                            <button className="text-xs text-[#4F46E5] hover:underline">Upload</button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedCertificate(cert);
                              setShowCertificateModal(true);
                            }}
                            className="px-3 py-1.5 bg-[#4F46E5] text-white text-xs font-medium rounded-md hover:bg-[#4338CA]"
                          >
                            Verify
                          </button>
                          {cert.status === 'Expired' && (
                            <button
                              onClick={() => renewCertificate(cert.id)}
                              className="px-3 py-1.5 bg-[#EF4444] text-white text-xs font-medium rounded-md hover:bg-[#DC2626]"
                            >
                              {loadingIds[cert.id] ? 'Scheduling...' : 'Renew'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'temp' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F7FA] text-[#6B7280] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Shipment ID</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Product</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Vendor</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Requirement</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Avg Temperature</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Min/Max</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {temps.map((temp) => (
                  <tr key={temp.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-6 py-4 font-mono text-[#616161]">{temp.shipmentId}</td>
                    <td className="px-6 py-4 font-medium text-[#212121]">{temp.product}</td>
                    <td className="px-6 py-4 text-[#616161]">{temp.vendor}</td>
                    <td className="px-6 py-4 font-mono text-[#616161]">{temp.requirement}</td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${temp.compliant ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        {temp.avgTemp}°C
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#616161]">
                      {temp.minTemp}°C / {temp.maxTemp}°C
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${
                          temp.compliant
                            ? 'bg-[#DCFCE7] text-[#166534]'
                            : 'bg-[#FEE2E2] text-[#991B1B]'
                        }`}
                      >
                        {temp.compliant ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Compliant
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            Non-compliant
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedTemp(temp);
                          setShowTempReportModal(true);
                        }}
                        className="px-3 py-1.5 bg-[#6B7280] text-white text-xs font-medium rounded-md hover:bg-[#4B5563]"
                      >
                        {temp.compliant ? 'Details' : 'Report'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ratings' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F7FA] text-[#6B7280] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Vendor</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Overall Rating</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">QC Pass Rate</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Compliance Score</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Audit Score</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Trend</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {ratings.map((rating) => (
                  <tr key={rating.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-6 py-4 font-medium text-[#212121]">{rating.vendor}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {renderStars(rating.overallRating)}
                        </div>
                        <span className="font-bold" style={{ color: getRatingColor(rating.overallRating) }}>
                          {rating.overallRating.toFixed(1)}/5
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-bold ${
                          rating.qcPassRate >= 95 ? 'text-[#10B981]' :
                          rating.qcPassRate >= 85 ? 'text-[#0EA5E9]' :
                          rating.qcPassRate >= 75 ? 'text-[#F59E0B]' :
                          'text-[#EF4444]'
                        }`}
                      >
                        {rating.qcPassRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-bold ${
                          rating.complianceScore >= 90 ? 'text-[#10B981]' :
                          rating.complianceScore >= 80 ? 'text-[#0EA5E9]' :
                          rating.complianceScore >= 70 ? 'text-[#F59E0B]' :
                          'text-[#EF4444]'
                        }`}
                      >
                        {rating.complianceScore}/100
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-bold ${
                          rating.auditScore >= 90 ? 'text-[#10B981]' :
                          rating.auditScore >= 80 ? 'text-[#0EA5E9]' :
                          rating.auditScore >= 70 ? 'text-[#F59E0B]' :
                          'text-[#EF4444]'
                        }`}
                      >
                        {rating.auditScore}/100
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {rating.trend === 'up' && (
                          <>
                            <TrendingUp className="w-4 h-4 text-[#10B981]" />
                            <span className="text-xs text-[#10B981]">Improving</span>
                          </>
                        )}
                        {rating.trend === 'down' && (
                          <>
                            <TrendingDown className="w-4 h-4 text-[#EF4444]" />
                            <span className="text-xs text-[#EF4444]">Declining</span>
                          </>
                        )}
                        {rating.trend === 'stable' && (
                          <>
                            <Minus className="w-4 h-4 text-[#6B7280]" />
                            <span className="text-xs text-[#6B7280]">Stable</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedRating(rating);
                            setShowRatingModal(true);
                          }}
                          className="px-3 py-1.5 bg-[#6B7280] text-white text-xs font-medium rounded-md hover:bg-[#4B5563]"
                        >
                          History
                        </button>
                        {rating.trend === 'down' && (
                          <button
                            onClick={() => alertVendor(rating.vendor)}
                            className="px-3 py-1.5 bg-[#EF4444] text-white text-xs font-medium rounded-md hover:bg-[#DC2626]"
                          >
                            {loadingIds[`alert-${rating.vendor}`] ? 'Sending...' : 'Alert'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: QC Check Details */}
      <Dialog open={showQCDetailModal} onOpenChange={setShowQCDetailModal}>
        <DialogContent className="max-w-[700px] p-0" aria-describedby="qc-check-details-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              QC Check Details
            </DialogTitle>
            <DialogDescription id="qc-check-details-description" className="text-sm text-[#6B7280]">
              {selectedCheck ? `${selectedCheck.checkId || 'N/A'} | ${selectedCheck.product || 'N/A'} | ${selectedCheck.batchId || 'N/A'}` : 'QC check details'}
            </DialogDescription>
          </DialogHeader>

          {selectedCheck && (
            <div className="px-6 py-6 space-y-6">
              {/* Check Information */}
              <div className="grid grid-cols-2 gap-4 bg-[#F9FAFB] p-4 rounded-lg">
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Check ID</p>
                  <p className="text-sm font-mono text-[#1F2937]">{selectedCheck.checkId}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Batch ID</p>
                  <p className="text-sm font-mono text-[#1F2937]">{selectedCheck.batchId}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Product</p>
                  <p className="text-sm font-medium text-[#1F2937]">{selectedCheck.product}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Vendor</p>
                  <p className="text-sm text-[#1F2937]">{selectedCheck.vendor}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Inspector</p>
                  <p className="text-sm text-[#1F2937]">{selectedCheck.inspector || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Check Date</p>
                  <p className="text-sm text-[#1F2937]">Dec 19, 2024, 2:30 PM</p>
                </div>
              </div>

              {/* Check Details */}
              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <h3 className="text-sm font-bold text-[#1F2937] mb-3">Check Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Check Type:</span>
                    <span className="font-medium text-[#1F2937]">{selectedCheck.checkType} Compliance</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Method:</span>
                    <span className="text-[#1F2937]">Digital Thermometer</span>
                  </div>
                  {selectedCheck.requirement && (
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Standard/Requirement:</span>
                      <span className="font-mono text-[#1F2937]">{selectedCheck.requirement}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Result:</span>
                    <span className={`font-bold ${selectedCheck.result === 'Pass' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {selectedCheck.result}
                    </span>
                  </div>
                  {selectedCheck.actualReading && (
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Actual Reading:</span>
                      <span className="font-bold text-[#EF4444]">{selectedCheck.actualReading}</span>
                    </div>
                  )}
                  {selectedCheck.severity && (
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Severity:</span>
                      <span className="font-bold text-[#EF4444]">{selectedCheck.severity}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedCheck.result === 'Fail' && (
                <div className="bg-[#FEE2E2] border-l-4 border-[#EF4444] p-4 rounded-lg">
                  <h3 className="text-sm font-bold text-[#991B1B] mb-2">Failure Details</h3>
                  <div className="text-sm text-[#6B7280] space-y-1">
                    <p><span className="font-medium">Reason:</span> Storage temperature exceeded acceptable range</p>
                    <p><span className="font-medium">Impact:</span> Product quality compromise</p>
                    <p><span className="font-medium">Recommendation:</span> Reject batch / Return to vendor</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            {selectedCheck && selectedCheck.status !== 'Approved' && selectedCheck.result === 'Pass' && (
              <button
                onClick={() => selectedCheck && approveCheck(selectedCheck.id)}
                className="px-6 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-md hover:bg-[#059669]"
              >
                {selectedCheck && loadingIds[selectedCheck.id] ? 'Processing...' : 'Approve'}
              </button>
            )}
            {selectedCheck && selectedCheck.result === 'Fail' && (
              <>
                <button
                  onClick={() => selectedCheck && appealCheck(selectedCheck.id)}
                  className="px-6 py-2.5 bg-[#0EA5E9] text-white text-sm font-medium rounded-md hover:bg-[#0284C7]"
                >
                  {selectedCheck && loadingIds[selectedCheck.id] ? 'Submitting...' : 'Appeal'}
                </button>
                <button
                  onClick={() => selectedCheck && rejectCheck(selectedCheck.id)}
                  className="px-6 py-2.5 bg-[#EF4444] text-white text-sm font-medium rounded-md hover:bg-[#DC2626]"
                >
                  {selectedCheck && loadingIds[selectedCheck.id] ? 'Processing...' : 'Reject'}
                </button>
              </>
            )}
            <button
              onClick={exportQCCheckReport}
              className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
            <button
              onClick={() => setShowQCDetailModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Vendor Audit Log */}
      <Dialog open={showAuditLogModal} onOpenChange={setShowAuditLogModal}>
        <DialogContent className="max-w-[750px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="vendor-audit-history-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Vendor Audit History
            </DialogTitle>
            <DialogDescription id="vendor-audit-history-description" className="text-sm text-[#6B7280]">
              {selectedAudit && selectedAudit.vendor ? selectedAudit.vendor : 'Vendor audit history'}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <p className="text-xs text-[#6B7280] mb-1">Total Audits</p>
                <p className="text-2xl font-bold text-[#1F2937]">24</p>
              </div>
              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <p className="text-xs text-[#6B7280] mb-1">Average Score</p>
                <p className="text-2xl font-bold text-[#10B981]">88.5/100</p>
              </div>
              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <p className="text-xs text-[#6B7280] mb-1">Last Audit</p>
                <p className="text-sm font-bold text-[#1F2937]">Dec 15, 2024</p>
              </div>
              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <p className="text-xs text-[#6B7280] mb-1">Next Due</p>
                <p className="text-sm font-bold text-[#1F2937]">Jan 15, 2025</p>
              </div>
              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <p className="text-xs text-[#6B7280] mb-1">Status</p>
                <p className="text-sm font-bold text-[#10B981]">Good Standing</p>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Audit Timeline (Last 12 months)</h3>
              <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F7FA] border-b border-[#E5E7EB]">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Score</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    <tr>
                      <td className="px-4 py-2 text-[#6B7280]">Dec 15</td>
                      <td className="px-4 py-2 text-[#0EA5E9]">Routine</td>
                      <td className="px-4 py-2 font-bold text-[#1F2937]">88/100</td>
                      <td className="px-4 py-2 text-[#10B981]">Pass ✓</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-[#6B7280]">Nov 12</td>
                      <td className="px-4 py-2 text-[#0EA5E9]">Routine</td>
                      <td className="px-4 py-2 font-bold text-[#1F2937]">85/100</td>
                      <td className="px-4 py-2 text-[#10B981]">Pass ✓</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-[#6B7280]">Oct 18</td>
                      <td className="px-4 py-2 text-[#F59E0B]">Follow-up</td>
                      <td className="px-4 py-2 font-bold text-[#1F2937]">82/100</td>
                      <td className="px-4 py-2 text-[#10B981]">Pass ✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={async () => {
                try {
                  await scheduleAudit();
                } catch (err: any) {
                  // Error is already handled in scheduleAudit function
                  console.error('Schedule audit error:', err);
                }
              }}
              className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA]"
            >
              Schedule Audit
            </button>
            <button
              onClick={exportAuditReport}
              className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
            <button
              onClick={() => setShowAuditLogModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Certificate Details */}
      <Dialog open={showCertificateModal} onOpenChange={setShowCertificateModal}>
        <DialogContent className="max-w-[650px] p-0" aria-describedby="certificate-details-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Certificate Details
            </DialogTitle>
            <DialogDescription id="certificate-details-description" className="text-sm text-[#6B7280]">
              {selectedCertificate ? `${selectedCertificate.certificateType || 'Certificate'} - ${selectedCertificate.vendor || 'Unknown'}` : 'Certificate details'}
            </DialogDescription>
          </DialogHeader>

          {selectedCertificate && (
            <div className="px-6 py-6 space-y-6">
              <div className="bg-[#F9FAFB] p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#6B7280] mb-1">Certificate Type</p>
                    <p className="text-sm font-medium text-[#1F2937]">{selectedCertificate.certificateType}</p>
                  </div>
                  {selectedCertificate.licenseNumber && (
                    <div>
                      <p className="text-xs text-[#6B7280] mb-1">License Number</p>
                      <p className="text-sm font-mono text-[#1F2937]">{selectedCertificate.licenseNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-[#6B7280] mb-1">Issued Date</p>
                    <p className="text-sm text-[#1F2937]">{selectedCertificate.issuedDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280] mb-1">Expiry Date</p>
                    <p className={`text-sm font-bold ${
                      selectedCertificate.daysToExpiry > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                    }`}>
                      {selectedCertificate.expiryDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280] mb-1">Days until expiry</p>
                    <p className={`text-sm font-bold ${
                      selectedCertificate.daysToExpiry > 180 ? 'text-[#10B981]' :
                      selectedCertificate.daysToExpiry > 0 ? 'text-[#F59E0B]' :
                      'text-[#EF4444]'
                    }`}>
                      {selectedCertificate.daysToExpiry > 0 ? `${selectedCertificate.daysToExpiry} days` : 'Expired'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280] mb-1">Status</p>
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                      style={{
                        backgroundColor: getCertificateColor(selectedCertificate.status).bg,
                        color: getCertificateColor(selectedCertificate.status).text
                      }}
                    >
                      {selectedCertificate.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <h3 className="text-sm font-bold text-[#1F2937] mb-2">Scope</h3>
                <div className="text-sm text-[#6B7280] space-y-1">
                  <p><span className="font-medium">Food Categories:</span> Vegetables, Fruits</p>
                  <p><span className="font-medium">Trading Type:</span> Wholesale / Retail</p>
                  <p><span className="font-medium">Approval Status:</span> Approved</p>
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => selectedCertificate && verifyCertificate(selectedCertificate.id)}
              className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA]"
            >
              {selectedCertificate && loadingIds[selectedCertificate.id] ? 'Verifying...' : 'Verify Certificate'}
            </button>
            {selectedCertificate?.status === 'Expired' && (
              <button
                onClick={() => selectedCertificate && renewCertificate(selectedCertificate.id)}
                className="px-6 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-md hover:bg-[#059669]"
              >
                {selectedCertificate && loadingIds[selectedCertificate.id] ? 'Scheduling...' : 'Schedule Renewal'}
              </button>
            )}
            <button
              onClick={exportCertificate}
              className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={() => setShowCertificateModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Temperature Compliance Report */}
      <Dialog open={showTempReportModal} onOpenChange={setShowTempReportModal}>
        <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="temp-compliance-report-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Temperature Compliance Report
            </DialogTitle>
            <DialogDescription id="temp-compliance-report-description" className="text-sm text-[#6B7280]">
              {selectedTemp ? `Shipment ${selectedTemp.shipmentId || 'N/A'}` : 'Temperature compliance report'}
            </DialogDescription>
          </DialogHeader>

          {selectedTemp && (
            <div className="px-6 py-6 space-y-6">
              {/* Summary */}
              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <h3 className="text-sm font-bold text-[#1F2937] mb-3">Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#6B7280]">Product:</p>
                    <p className="font-medium text-[#1F2937]">{selectedTemp.product}</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Vendor:</p>
                    <p className="font-medium text-[#1F2937]">{selectedTemp.vendor}</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Requirement:</p>
                    <p className="font-mono text-[#1F2937]">{selectedTemp.requirement}</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Duration:</p>
                    <p className="text-[#1F2937]">48 hours</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[#6B7280] mb-2">Status:</p>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                        selectedTemp.compliant
                          ? 'bg-[#DCFCE7] text-[#166534]'
                          : 'bg-[#FEE2E2] text-[#991B1B]'
                      }`}
                    >
                      {selectedTemp.compliant ? 'PASSED ✓' : 'FAILED ✗'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Graph Placeholder */}
              <div className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-8 text-center">
                <ThermometerSun className="w-12 h-12 text-[#9CA3AF] mx-auto mb-2" />
                <p className="text-sm text-[#6B7280]">Temperature Graph</p>
                <p className="text-xs text-[#9CA3AF]">Line chart showing temperature over time</p>
              </div>

              {/* Timeline */}
              {!selectedTemp.compliant && (
                <div className="bg-[#FEE2E2] border-l-4 border-[#EF4444] p-4 rounded-lg">
                  <h3 className="text-sm font-bold text-[#991B1B] mb-3">Impact Assessment</h3>
                  <div className="text-sm text-[#6B7280] space-y-1">
                    <p><span className="font-medium">Violation Duration:</span> 1.5 hours</p>
                    <p><span className="font-medium">Peak Temperature:</span> {selectedTemp.maxTemp}°C</p>
                    <p><span className="font-medium">Product Risk:</span> Medium to High</p>
                    <p><span className="font-medium">Recommendation:</span> Reject batch</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            {!selectedTemp?.compliant && (
              <>
                <button
                  onClick={async () => {
                    if (!selectedTemp) return;
                    if (!isValidMongoId(selectedTemp.id)) {
                      toast.error('Invalid record. Cannot approve.');
                      return;
                    }
                    
                    const currentTemps = temps;
                    // Optimistic update - save immediately
                    setTemps(prev => {
                      const updated = prev.map(t => t.id === selectedTemp.id ? { ...t, compliant: true } : t);
                      return updated;
                    });
                    try {
                      await vendorManagementApi.updateTemperatureCompliance(selectedTemp.id, {
                        compliant: true,
                        notes: 'Approved with justification',
                      });
                      toast.success('Batch approved with justification');
                      setShowTempReportModal(false);
                      // Wait a bit to ensure backend has saved, then reload temperature compliance to get updated data
                      await new Promise(resolve => setTimeout(resolve, 500));
                      try {
                        const vendorId = '';
                        if (vendorId) {
                          const tempResp = await vendorManagementApi.getTemperatureCompliance({ vendorId });
                          const tempData = Array.isArray(tempResp.data) ? tempResp.data : (Array.isArray(tempResp) ? tempResp : []);
                          if (tempData.length > 0) {
                            const transformedTemps = tempData.map((t: any) => ({
                              id: t._id?.toString() || t.id,
                              shipmentId: t.shipmentId || 'N/A',
                              product: t.product || t.productName || 'Unknown',
                              vendor: t.vendor || t.vendorName || t.vendorId || 'Unknown',
                              requirement: t.requirement || 'N/A',
                              avgTemp: t.avgTemp || 0,
                              minTemp: t.minTemp || 0,
                              maxTemp: t.maxTemp || 0,
                              compliant: t.compliant !== undefined ? t.compliant : true,
                            }));
                            
                            // Merge with current state to preserve optimistic update
                            const currentTemp = currentTemps.find(t => t.id === selectedTemp.id);
                            const mergedTemps = transformedTemps.map(apiTemp => {
                              if (apiTemp.id === selectedTemp.id && currentTemp && currentTemp.compliant === true) {
                                return currentTemp; // Prefer optimistic update
                              }
                              return apiTemp;
                            });
                            
                            // Add any current temps not in API
                            currentTemps.forEach(currentTemp => {
                              if (!mergedTemps.find(t => t.id === currentTemp.id)) {
                                mergedTemps.push(currentTemp);
                              }
                            });
                            
                            setTemps(mergedTemps);
                          } else {
                            // Backend returned empty - keep optimistic update
                            console.log('Backend returned empty temperature data, keeping optimistic update');
                            const updated = currentTemps.map(t => t.id === selectedTemp.id ? { ...t, compliant: true } : t);
                            setTemps(updated);
                          }
                        } else {
                          // No vendorId - keep optimistic update
                          const updated = currentTemps.map(t => t.id === selectedTemp.id ? { ...t, compliant: true } : t);
                          setTemps(updated);
                        }
                      } catch (reloadErr) {
                        console.error('Failed to reload temperature compliance after approval:', reloadErr);
                        // Keep the optimistic update
                        const updated = currentTemps.map(t => t.id === selectedTemp.id ? { ...t, compliant: true } : t);
                        setTemps(updated);
                      }
                    } catch (err: any) {
                      console.error('Approve temperature compliance error:', err);
                      toast.error(err.message || 'Failed to approve batch');
                    }
                  }}
                  className="px-6 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-md hover:bg-[#059669]"
                >
                  Approve Anyway
                </button>
                <button
                  onClick={async () => {
                    if (!selectedTemp) return;
                    if (!isValidMongoId(selectedTemp.id)) {
                      toast.error('Invalid record. Cannot reject.');
                      return;
                    }
                    
                    const currentTemps = temps;
                    // Optimistic update - save immediately
                    setTemps(prev => {
                      const updated = prev.map(t => t.id === selectedTemp.id ? { ...t, compliant: false } : t);
                      return updated;
                    });
                    try {
                      await vendorManagementApi.updateTemperatureCompliance(selectedTemp.id, {
                        compliant: false,
                        notes: 'Batch rejected due to temperature violation',
                      });
                      toast.success('Batch rejected');
                      setShowTempReportModal(false);
                      // Wait a bit to ensure backend has saved, then reload temperature compliance to get updated data
                      await new Promise(resolve => setTimeout(resolve, 500));
                      try {
                        const vendorId = '';
                        if (vendorId) {
                          const tempResp = await vendorManagementApi.getTemperatureCompliance({ vendorId });
                          const tempData = Array.isArray(tempResp.data) ? tempResp.data : (Array.isArray(tempResp) ? tempResp : []);
                          if (tempData.length > 0) {
                            const transformedTemps = tempData.map((t: any) => ({
                              id: t._id?.toString() || t.id,
                              shipmentId: t.shipmentId || 'N/A',
                              product: t.product || t.productName || 'Unknown',
                              vendor: t.vendor || t.vendorName || t.vendorId || 'Unknown',
                              requirement: t.requirement || 'N/A',
                              avgTemp: t.avgTemp || 0,
                              minTemp: t.minTemp || 0,
                              maxTemp: t.maxTemp || 0,
                              compliant: t.compliant !== undefined ? t.compliant : true,
                            }));
                            
                            // Merge with current state to preserve optimistic update
                            const currentTemp = currentTemps.find(t => t.id === selectedTemp.id);
                            const mergedTemps = transformedTemps.map(apiTemp => {
                              if (apiTemp.id === selectedTemp.id && currentTemp && currentTemp.compliant === false) {
                                return currentTemp; // Prefer optimistic update
                              }
                              return apiTemp;
                            });
                            
                            // Add any current temps not in API
                            currentTemps.forEach(currentTemp => {
                              if (!mergedTemps.find(t => t.id === currentTemp.id)) {
                                mergedTemps.push(currentTemp);
                              }
                            });
                            
                            setTemps(mergedTemps);
                          } else {
                            // Backend returned empty - keep optimistic update
                            console.log('Backend returned empty temperature data, keeping optimistic update');
                            const updated = currentTemps.map(t => t.id === selectedTemp.id ? { ...t, compliant: false } : t);
                            setTemps(updated);
                          }
                        } else {
                          // No vendorId - keep optimistic update
                          const updated = currentTemps.map(t => t.id === selectedTemp.id ? { ...t, compliant: false } : t);
                          setTemps(updated);
                        }
                      } catch (reloadErr) {
                        console.error('Failed to reload temperature compliance after rejection:', reloadErr);
                        // Keep the optimistic update
                        const updated = currentTemps.map(t => t.id === selectedTemp.id ? { ...t, compliant: false } : t);
                        setTemps(updated);
                      }
                    } catch (err: any) {
                      console.error('Reject temperature compliance error:', err);
                      toast.error(err.message || 'Failed to reject batch');
                    }
                  }}
                  className="px-6 py-2.5 bg-[#EF4444] text-white text-sm font-medium rounded-md hover:bg-[#DC2626]"
                >
                  Reject
                </button>
              </>
            )}
            <button
              onClick={exportSampleTestReport}
              className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
            <button
              onClick={() => setShowTempReportModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Quality Rating Details */}
      <Dialog open={showRatingModal} onOpenChange={setShowRatingModal}>
        <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="quality-rating-details-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Quality Rating Details
            </DialogTitle>
            <DialogDescription id="quality-rating-details-description" className="text-sm text-[#6B7280]">
              {selectedRating ? (selectedRating.vendor || 'Quality rating details') : 'Quality rating details'}
            </DialogDescription>
          </DialogHeader>

          {selectedRating && (
            <div className="px-6 py-6 space-y-6">
              {/* Overall Rating */}
              <div className="bg-[#F9FAFB] p-6 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {renderStars(selectedRating.overallRating)}
                </div>
                <p className="text-3xl font-bold mb-1" style={{ color: getRatingColor(selectedRating.overallRating) }}>
                  {selectedRating.overallRating.toFixed(1)}/5
                </p>
                <p className="text-sm text-[#6B7280]">Overall Rating</p>
                <p className="text-xs text-[#9CA3AF]">Based on: Last 6 months (180 days)</p>
              </div>

              {/* Rating Breakdown */}
              <div>
                <h3 className="text-sm font-bold text-[#1F2937] mb-3">Rating Breakdown</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#6B7280]">QC Pass Rate (Weight: 40%)</span>
                      <span className="font-bold text-[#1F2937]">{selectedRating.qcPassRate}%</span>
                    </div>
                    <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${selectedRating.qcPassRate}%`,
                          backgroundColor: selectedRating.qcPassRate >= 95 ? '#10B981' :
                            selectedRating.qcPassRate >= 85 ? '#0EA5E9' :
                            selectedRating.qcPassRate >= 75 ? '#F59E0B' : '#EF4444'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#6B7280]">Compliance Score (Weight: 30%)</span>
                      <span className="font-bold text-[#1F2937]">{selectedRating.complianceScore}/100</span>
                    </div>
                    <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${selectedRating.complianceScore}%`,
                          backgroundColor: selectedRating.complianceScore >= 90 ? '#10B981' :
                            selectedRating.complianceScore >= 80 ? '#0EA5E9' :
                            selectedRating.complianceScore >= 70 ? '#F59E0B' : '#EF4444'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#6B7280]">Audit Score (Weight: 20%)</span>
                      <span className="font-bold text-[#1F2937]">{selectedRating.auditScore}/100</span>
                    </div>
                    <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${selectedRating.auditScore}%`,
                          backgroundColor: selectedRating.auditScore >= 90 ? '#10B981' :
                            selectedRating.auditScore >= 80 ? '#0EA5E9' :
                            selectedRating.auditScore >= 70 ? '#F59E0B' : '#EF4444'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Trend */}
              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <h3 className="text-sm font-bold text-[#1F2937] mb-2">6-Month Trend</h3>
                <div className="flex items-center gap-2">
                  {selectedRating.trend === 'up' && (
                    <>
                      <TrendingUp className="w-5 h-5 text-[#10B981]" />
                      <span className="text-sm font-bold text-[#10B981]">Improving</span>
                      <span className="text-sm text-[#6B7280]">(+0.3 from last month)</span>
                    </>
                  )}
                  {selectedRating.trend === 'down' && (
                    <>
                      <TrendingDown className="w-5 h-5 text-[#EF4444]" />
                      <span className="text-sm font-bold text-[#EF4444]">Declining</span>
                      <span className="text-sm text-[#6B7280]">(-0.5 from last month)</span>
                    </>
                  )}
                  {selectedRating.trend === 'stable' && (
                    <>
                      <Minus className="w-5 h-5 text-[#6B7280]" />
                      <span className="text-sm font-bold text-[#6B7280]">Stable</span>
                      <span className="text-sm text-[#6B7280]">(No change)</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => {
                if (selectedRating) {
                  setShowHistoryModal(true);
                }
              }}
              className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563]"
            >
              View History
            </button>
            <button
              onClick={() => {
                if (selectedRating) {
                  try {
                    const today = new Date().toISOString().split('T')[0];
                    const csvData: (string | number)[][] = [
                      ['Quality Rating Report', `Date: ${today}`],
                      [''],
                      ['Vendor Information'],
                      ['Vendor', selectedRating.vendor],
                      ['Overall Rating', selectedRating.overallRating],
                      ['QC Pass Rate', `${selectedRating.qcPassRate}%`],
                      ['Compliance Score', selectedRating.complianceScore],
                      ['Audit Score', selectedRating.auditScore],
                      ['Trend', selectedRating.trend],
                    ];
                    exportToCSV(csvData, `quality-rating-${selectedRating.vendor.replace(/\s+/g, '-')}-${today}`);
                    toast.success('Quality rating report downloaded');
                  } catch (error) {
                    console.error('Download report error:', error);
                    toast.error('Failed to download report');
                  }
                }
              }}
              className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
            <button
              onClick={() => setShowRatingModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 6: Quality Rating History */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-0" aria-describedby="quality-rating-history-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Quality Rating History
            </DialogTitle>
            <DialogDescription id="quality-rating-history-description" className="text-sm text-[#6B7280]">
              {selectedRating?.vendor}
            </DialogDescription>
          </DialogHeader>

          {selectedRating && (
            <div className="px-6 py-6 space-y-6">
              <div className="bg-[#F9FAFB] p-6 rounded-lg text-center">
                <p className="text-sm text-[#6B7280] mb-2">Overall Rating History</p>
                <p className="text-3xl font-bold mb-1" style={{ color: getRatingColor(selectedRating.overallRating) }}>
                  {selectedRating.overallRating.toFixed(1)}/5
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  {renderStars(selectedRating.overallRating)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#F9FAFB] p-4 rounded-lg">
                  <p className="text-sm text-[#6B7280] mb-1">QC Pass Rate</p>
                  <p className="text-2xl font-bold text-[#1F2937]">{selectedRating.qcPassRate}%</p>
                </div>
                <div className="bg-[#F9FAFB] p-4 rounded-lg">
                  <p className="text-sm text-[#6B7280] mb-1">Compliance Score</p>
                  <p className="text-2xl font-bold text-[#1F2937]">{selectedRating.complianceScore}/100</p>
                </div>
                <div className="bg-[#F9FAFB] p-4 rounded-lg">
                  <p className="text-sm text-[#6B7280] mb-1">Audit Score</p>
                  <p className="text-2xl font-bold text-[#1F2937]">{selectedRating.auditScore}/100</p>
                </div>
                <div className="bg-[#F9FAFB] p-4 rounded-lg">
                  <p className="text-sm text-[#6B7280] mb-1">Trend</p>
                  <p className="text-2xl font-bold text-[#1F2937] capitalize">{selectedRating.trend}</p>
                </div>
              </div>

              <div className="bg-[#FFFBEB] border border-[#FEF3C7] p-4 rounded-lg">
                <p className="text-sm text-[#92400E]">
                  <strong>Note:</strong> Detailed historical data and trend charts will be available in future updates.
                </p>
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
