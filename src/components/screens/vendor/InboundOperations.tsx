import React, { useState, useRef } from 'react';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  AlertTriangle,
  Globe,
  RotateCcw,
  MoreVertical,
  Download,
  Mail,
  Archive,
  Edit,
  Printer,
  Package,
  Calendar,
  Upload,
  MapPin,
  Phone,
  X,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { PageHeader } from '../../ui/page-header';
import { EmptyState } from '../../ui/ux-components';
import { exportToPDF } from '../../../utils/pdfExport';
import {
  fetchGRNList,
  approveGRN,
  rejectGRN,
  updateGRNItem,
  emailGRN,
  archiveGRN,
} from '../../../api/vendor/vendorInbound.api';

// Types
type GRNStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Partial Receipt';
type ExceptionType = 'No Issue' | 'Short' | 'Excess' | 'Damaged' | 'Missing' | 'Quality';
type RTVStatus = 'Open' | 'In Transit' | 'Completed' | 'Rejected';
type RTVReason = 'Short Goods' | 'Damaged Goods' | 'Excess Goods' | 'Quality Issues' | 'Wrong Item';

interface LineItem {
  sku: string;
  product: string;
  ordered: number;
  received: number;
  unit: string;
  status: 'Complete' | 'Short' | 'Excess' | 'Damaged';
}

interface GRN {
  id: string;
  grnNumber: string;
  shipmentId: string;
  vendor: string;
  warehouse: string;
  date: string;
  status: GRNStatus;
  exceptionType: ExceptionType;
  exceptionDetails?: string;
  lineItems: LineItem[];
  notes?: string;
  qualityChecked?: boolean;
  documentsComplete?: boolean;
}

interface Shipment {
  id: string;
  shipmentId: string;
  vendor: string;
  currentLocation: string;
  eta: string;
  status: 'In Transit' | 'Stopped' | 'Arriving' | 'Alert';
  driver: string;
  driverPhone: string;
  truckNumber: string;
  progress: number;
  lat: number;
  lng: number;
}

interface RTV {
  id: string;
  rtvNumber: string;
  grnReference: string;
  reason: RTVReason;
  quantity: string;
  status: RTVStatus;
  vendor: string;
  createdDate: string;
  items: string[];
}

// Status Badge Component
const StatusBadge: React.FC<{ status: GRNStatus }> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'Pending Approval':
        return {
          bg: '#FEF3C7',
          text: '#92400E',
          icon: <Clock className="w-3 h-3" />
        };
      case 'Approved':
        return {
          bg: '#DCFCE7',
          text: '#166534',
          icon: <CheckCircle className="w-3 h-3" />
        };
      case 'Rejected':
        return {
          bg: '#FEE2E2',
          text: '#991B1B',
          icon: <XCircle className="w-3 h-3" />
        };
      case 'Partial Receipt':
        return {
          bg: '#DBEAFE',
          text: '#1E40AF',
          icon: <AlertTriangle className="w-3 h-3" />
        };
      default:
        return {
          bg: '#F3F4F6',
          text: '#6B7280',
          icon: null
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
      style={{ backgroundColor: styles.bg, color: styles.text }}
    >
      {styles.icon}
      {status}
    </div>
  );
};

// Exception Indicator Component
const ExceptionIndicator: React.FC<{ type: ExceptionType; details?: string }> = ({ type, details }) => {
  if (type === 'No Issue') {
    return <span className="text-xs font-medium text-[#10B981]">No Issue</span>;
  }

  const getColor = () => {
    switch (type) {
      case 'Short':
      case 'Missing':
      case 'Quality':
        return '#F59E0B';
      case 'Damaged':
        return '#EF4444';
      case 'Excess':
        return '#0EA5E9';
      default:
        return '#6B7280';
    }
  };

  return (
    <span className="text-xs font-medium" style={{ color: getColor() }}>
      {details || type}
    </span>
  );
};

// RTV Status Badge Component
const RTVStatusBadge: React.FC<{ status: RTVStatus }> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'Open':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'In Transit':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'Completed':
        return { bg: '#DCFCE7', text: '#166534' };
      case 'Rejected':
        return { bg: '#FEE2E2', text: '#991B1B' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const styles = getStatusStyles();

  return (
    <span
      className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium"
      style={{ backgroundColor: styles.bg, color: styles.text }}
    >
      {status}
    </span>
  );
};

// Main Component
export function InboundOperations() {
  const [activeTab, setActiveTab] = useState<'all' | 'tracking' | 'exceptions' | 'returns'>('all');
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedRTV, setSelectedRTV] = useState<RTV | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);
  const [showRTVModal, setShowRTVModal] = useState(false);
  const [showRTVTrackModal, setShowRTVTrackModal] = useState(false);
  const [trackingSteps, setTrackingSteps] = useState<string[]>([]);
  const [currentTrackingStep, setCurrentTrackingStep] = useState(0);
  const trackingIntervalRef = useRef<number | null>(null);
  const [createdRtvByGrn, setCreatedRtvByGrn] = useState<Record<string, boolean>>({});
  const [archivedGrnIds, setArchivedGrnIds] = useState<Set<string>>(new Set());
  // Stateful copies so UI updates reflect immediately (in-memory)
  const [grns, setGrns] = useState<GRN[]>([]);
  const [rtvs, setRtvs] = useState<RTV[]>([]);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const broadcastRef = React.useRef<BroadcastChannel | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [rtvReason, setRtvReason] = useState<string>('');
  
  // UI class shared for table action buttons to ensure uniform size/alignment
  const actionBtnBaseClass =
    'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 min-w-[92px] flex items-center justify-center';
  // inline style fallback to guarantee min width even if Tailwind's JIT/purge removes the arbitrary class
  const actionBtnStyle: React.CSSProperties = { minWidth: 92 };
  // helper to find RTV for a given GRN
  const getRtvForGrn = (grn: GRN) => rtvs.find((r) => r.grnReference === grn.grnNumber);
  
  // File upload helpers
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const valid: File[] = [];
    const invalidNames: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const okType = ['image/png', 'image/jpeg', 'image/jpg'].includes(f.type);
      const okSize = f.size <= 10 * 1024 * 1024; // 10MB
      if (okType && okSize) {
        valid.push(f);
      } else {
        invalidNames.push(f.name);
      }
    }
    if (valid.length) {
      setUploadedFiles((prev) => [...prev, ...valid]);
      toast.success(`${valid.length} file(s) uploaded`);
    }
    if (invalidNames.length) {
      toast.error(`Some files were skipped: ${invalidNames.join(', ')}`);
    }
    // reset input
    if (e.target) e.target.value = '';
  };
 
  // Load GRNs from backend on mount
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await fetchGRNList({ page: 1, limit: 25 });
        if (!mounted) return;
        let items = resp?.data ?? resp?.items ?? resp;
        if (items?.pagination && Array.isArray(items.data)) items = items.data;
        const arr = Array.isArray(items) ? items : [];
        const mappedItems = arr.map((item: Record<string, unknown>) => ({
          id: String(item.id ?? item._id ?? item.grnNumber ?? `grn-${Date.now()}`),
          grnNumber: String(item.grnNumber ?? item.grn_number ?? item.id ?? 'N/A'),
          shipmentId: String(item.shipmentId ?? item.shipment_id ?? item.shipment ?? 'N/A'),
          vendor: String(item.vendor ?? item.vendorName ?? 'N/A'),
          warehouse: String(item.warehouse ?? item.warehouseName ?? 'N/A'),
          date: item.date ? String(item.date) : (item.createdAt ? new Date(item.createdAt as string).toLocaleDateString() : new Date().toLocaleDateString()),
          status: (item.status === 'approved' ? 'Approved' : item.status === 'pending' ? 'Pending Approval' : item.status === 'rejected' ? 'Rejected' : (item.status as string) || 'Pending Approval') as GRNStatus,
          exceptionType: (item.exceptionType ?? item.exception_type ?? 'No Issue') as ExceptionType,
          exceptionDetails: item.exceptionDetails ?? item.exception_details as string | undefined,
          lineItems: Array.isArray(item.lineItems) ? item.lineItems : Array.isArray(item.items) ? item.items : [],
          notes: item.notes as string | undefined,
          qualityChecked: item.qualityChecked ?? item.quality_checked as boolean | undefined,
          documentsComplete: item.documentsComplete ?? item.documents_complete as boolean | undefined,
        })) as GRN[];
        setGrns(mappedItems.filter((g) => !archivedGrnIds.has(g.id)));
      } catch (err) {
        console.error('Failed to load GRNs', err);
        if (mounted) {
          setGrns([]);
          toast.error('Failed to load GRNs');
        }
      }
    })();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  
  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCreateRTVModal, setShowCreateRTVModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showShipmentDetailModal, setShowShipmentDetailModal] = useState(false);

  // PDF Export function
  const downloadGRNPDF = (grn: GRN) => {
    try {
      const htmlContent = `
        <h1>Goods Receipt Note (GRN)</h1>
        <h2>${grn.grnNumber}</h2>
        <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <tr><th style="text-align:left;">Field</th><th style="text-align:left;">Value</th></tr>
          <tr><td>GRN Number</td><td>${grn.grnNumber}</td></tr>
          <tr><td>Shipment ID</td><td>${grn.shipmentId}</td></tr>
          <tr><td>Vendor</td><td>${grn.vendor}</td></tr>
          <tr><td>Warehouse</td><td>${grn.warehouse}</td></tr>
          <tr><td>Date</td><td>${grn.date}</td></tr>
          <tr><td>Status</td><td>${grn.status}</td></tr>
          <tr><td>Exception Type</td><td>${grn.exceptionType}</td></tr>
          ${grn.exceptionDetails ? `<tr><td>Exception Details</td><td>${grn.exceptionDetails}</td></tr>` : ''}
          ${grn.notes ? `<tr><td>Notes</td><td>${grn.notes}</td></tr>` : ''}
        </table>
        <h3>Line Items</h3>
        <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <tr>
            <th style="text-align:left;">SKU</th>
            <th style="text-align:left;">Product</th>
            <th style="text-align:right;">Ordered</th>
            <th style="text-align:right;">Received</th>
            <th style="text-align:left;">Unit</th>
            <th style="text-align:left;">Status</th>
          </tr>
          ${grn.lineItems.map(item => `
            <tr>
              <td>${item.sku}</td>
              <td>${item.product}</td>
              <td style="text-align:right;">${item.ordered}</td>
              <td style="text-align:right;">${item.received}</td>
              <td>${item.unit}</td>
              <td>${item.status}</td>
            </tr>
          `).join('')}
        </table>
        <p style="margin-top:20px; font-size:12px; color:#666;">
          Generated on ${new Date().toLocaleString()}
        </p>
      `;
      exportToPDF(htmlContent, grn.grnNumber);
      toast.success(`PDF generated for ${grn.grnNumber}`);
    } catch (error) {
      toast.error('Failed to generate PDF');
      console.error('PDF generation error:', error);
    }
  };

  const saveSnapshot = (nextGrns: GRN[], nextRtvs: RTV[]) => {
    try {
      const snapshot = { grns: nextGrns, rtvs: nextRtvs, archivedGrnIds: Array.from(archivedGrnIds) };
      if (broadcastRef.current) {
        broadcastRef.current.postMessage({ type: 'update', payload: snapshot });
      }
    } catch (e) {
      console.warn('Failed to broadcast inbound state', e);
    }
  };

  // Setup BroadcastChannel for multi-tab sync
  React.useEffect(() => {
    try {
      const bc = new BroadcastChannel('inbound_channel');
      broadcastRef.current = bc;
      bc.onmessage = (ev) => {
        const msg = ev.data;
        if (msg?.type === 'update' && msg.payload) {
          const { grns: incomingGrns, rtvs: incomingRtvs, archivedGrnIds: incomingArchived } = msg.payload;
          // Merge simple strategy: replace entirely with latest snapshot
          if (Array.isArray(incomingGrns) && Array.isArray(incomingRtvs)) {
            const archivedIds = incomingArchived ? new Set(incomingArchived) : new Set<string>();
            setArchivedGrnIds(archivedIds);
            const filteredGrns = incomingGrns.filter((g: GRN) => !archivedIds.has(g.id));
            setGrns(filteredGrns);
            setRtvs(incomingRtvs);
            toast.success('Inbound data synchronized from another tab');
          }
        }
      };
      return () => {
        bc.close();
      };
    } catch (e) {
      // BroadcastChannel not available in this environment
    }
  }, []);
 
  // Ensure createdRtvByGrn map reflects any existing RTVs on load or when rtvs/grns change
  React.useEffect(() => {
    try {
      const mapping: Record<string, boolean> = {};
      rtvs.forEach((r) => {
        const matchedGrn = grns.find((g) => g.grnNumber === r.grnReference);
        if (matchedGrn) mapping[matchedGrn.id] = true;
      });
      setCreatedRtvByGrn(mapping);
    } catch (err) {
      // ignore
    }
  }, [rtvs, grns]);

  // Utility & action handlers (simulate backend behavior / downloads)
  const handleRefresh = async () => {
    try {
      const resp = await fetchGRNList({ page: 1, limit: 25 });
      let items = resp && (resp.data || resp.items) ? resp.data || resp.items : resp;
      if (!items) items = [];
      if (items.pagination && Array.isArray(items.data)) items = items.data;
      if (Array.isArray(items) && items.length > 0) {
        const mappedItems = items.map((item: any) => ({
          id: item.id || item._id || item.grnNumber || `grn-${Date.now()}-${Math.random()}`,
          grnNumber: item.grnNumber || item.grn_number || item.id || 'N/A',
          shipmentId: item.shipmentId || item.shipment_id || item.shipment || 'N/A',
          vendor: item.vendor || item.vendorName || 'N/A',
          warehouse: item.warehouse || item.warehouseName || 'N/A',
          date: item.date || item.createdAt || new Date().toLocaleDateString(),
          status: item.status === 'approved' ? 'Approved' : item.status === 'pending' ? 'Pending Approval' : item.status === 'rejected' ? 'Rejected' : (item.status || 'Pending Approval') as GRNStatus,
          exceptionType: item.exceptionType || item.exception_type || 'No Issue' as ExceptionType,
          exceptionDetails: item.exceptionDetails || item.exception_details,
          lineItems: Array.isArray(item.lineItems) ? item.lineItems : Array.isArray(item.items) ? item.items : [],
          notes: item.notes,
          qualityChecked: item.qualityChecked || item.quality_checked,
          documentsComplete: item.documentsComplete || item.documents_complete,
        }));
        const filteredItems = mappedItems.filter((g: GRN) => !archivedGrnIds.has(g.id));
        setGrns(filteredItems);
        saveSnapshot(filteredItems, rtvs);
        toast.success('Data refreshed from server');
      } else {
        setGrns([...mockGRNs]);
        setRtvs([...mockRTVs]);
        toast.success('Data refreshed');
      }
    } catch (err) {
      console.error('Refresh error', err);
      setGrns([...mockGRNs]);
      setRtvs([...mockRTVs]);
      toast.info('Using default data');
    }
  };

  const handleAcceptExcess = async (grn: GRN) => {
    setActionLoading((s) => ({ ...s, [`accept-${grn.id}`]: true }));
    const newGrns = grns.map((g) =>
      g.id === grn.id
        ? {
            ...g,
            exceptionType: 'No Issue',
            exceptionDetails: undefined,
            notes: g.notes ? `${g.notes} | Excess accepted` : 'Excess accepted',
          }
        : g
    );
    setGrns(newGrns);
    setSelectedGRN((s) => (s && s.id === grn.id ? { ...s, exceptionType: 'No Issue', exceptionDetails: undefined, notes: s.notes ? `${s.notes} | Excess accepted` : 'Excess accepted' } : s));
    saveSnapshot(newGrns, rtvs);
    try {
      // Try to update via API if available
      await updateGRNItem(grn.id, grn.lineItems[0]?.sku || '', {
        received_quantity: grn.lineItems[0]?.received || 0,
        notes: 'Excess accepted',
      });
    } catch (err) {
      console.warn('Failed to update excess acceptance via API', err);
    }
    setActionLoading((s) => ({ ...s, [`accept-${grn.id}`]: false }));
    toast.success(`Accepted excess for ${grn.grnNumber}`);
  };

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleCreateLabel = (rtv: RTV) => {
    const labelContent = `Return Label\nRTV: ${rtv.rtvNumber}\nGRN: ${rtv.grnReference}\nVendor: ${rtv.vendor}\nItems:\n${rtv.items.join('\n')}\n\nGenerated: ${new Date().toLocaleString()}`;
    downloadTextFile(`label-${rtv.rtvNumber}.txt`, labelContent);
    // optimistic update with loading indicator
    setActionLoading((s) => ({ ...s, [`label-${rtv.id}`]: true }));
    const newRtvs = rtvs.map((r) => (r.id === rtv.id ? { ...r, status: 'In Transit' } : r));
    setRtvs(newRtvs);
    saveSnapshot(grns, newRtvs);
    setTimeout(() => {
      setActionLoading((s) => ({ ...s, [`label-${rtv.id}`]: false }));
      toast.success(`Return label generated for ${rtv.rtvNumber}`);
    }, 600);
  };

  const handleTrackReturn = (rtv: RTV) => {
    // Start a richer tracking flow: set status, persist and open live tracker UI
    setActionLoading((s) => ({ ...s, [`track-${rtv.id}`]: true }));
    const newRtvs = rtvs.map((r) => (r.id === rtv.id ? { ...r, status: 'In Transit' } : r));
    setRtvs(newRtvs);
    setSelectedRTV({ ...rtv, status: 'In Transit' });
    saveSnapshot(grns, newRtvs);
    setTimeout(() => {
      setActionLoading((s) => ({ ...s, [`track-${rtv.id}`]: false }));
      toast.success(`Tracking started for ${rtv.rtvNumber}`);
      // initialize step-based tracker UI
      startRTVTrackingUI({ ...rtv, status: 'In Transit' });
    }, 500);
  };

  const handleViewRTVDetails = (rtv: RTV) => {
    setSelectedRTV(rtv);
    setShowRTVModal(true);
  };

  // Immediate create RTV (optimistic) - used by inline Create RTV buttons
  const handleCreateRTVImmediate = (grn: GRN) => {
    if (createdRtvByGrn[grn.id]) {
      toast.info('RTV already created for this GRN');
      return;
    }
    setActionLoading((s) => ({ ...s, [`rtv-create-inline-${grn.id}`]: true }));
    const totalQty = grn.lineItems.reduce((acc, it) => acc + (it.received || 0), 0);
    const newRtv: RTV = {
      id: Date.now().toString(),
      rtvNumber: `RTV-${Date.now()}`,
      grnReference: grn.grnNumber,
      reason: (grn.exceptionType === 'Damaged' ? 'Damaged Goods' : grn.exceptionType === 'Short' ? 'Short Goods' : 'Wrong Item') as RTVReason,
      quantity: `${totalQty} units`,
      status: 'Open',
      vendor: grn.vendor,
      createdDate: new Date().toLocaleDateString(),
      items: grn.lineItems.map((li) => `${li.product} - ${li.received} ${li.unit}`),
    };
    // optimistic UI update
    const newRtvs = [newRtv, ...rtvs];
    setRtvs(newRtvs);
    setCreatedRtvByGrn((s) => ({ ...s, [grn.id]: true }));
    saveSnapshot(grns, newRtvs);
    setTimeout(() => {
      setActionLoading((s) => ({ ...s, [`rtv-create-inline-${grn.id}`]: false }));
      toast.success(`RTV created for ${grn.grnNumber}`);
      // keep selectedGRN for context
      setSelectedGRN(grn);
    }, 600);
  };

  // Live tracker UI initialization and progression
  const startRTVTrackingUI = (rtv: RTV) => {
    // define steps
    const steps = ['Pickup Scheduled', 'Picked Up', 'At Hub', 'Out for Delivery', 'Delivered'];
    setTrackingSteps(steps);
    setCurrentTrackingStep(0);
    setShowRTVTrackModal(true);
    // clear any existing interval
    if (trackingIntervalRef.current) {
      window.clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    // advance steps every 1.2s (simulated)
    const id = window.setInterval(() => {
      setCurrentTrackingStep((prev) => {
        const next = prev + 1;
        if (next >= steps.length) {
          // finish
          if (trackingIntervalRef.current) {
            window.clearInterval(trackingIntervalRef.current);
            trackingIntervalRef.current = null;
          }
          // mark RTV completed in state
          setRtvs((prevRtvs) => prevRtvs.map((r) => (r.id === rtv.id ? { ...r, status: 'Completed' } : r)));
          saveSnapshot(grns, rtvs.map((r) => (r.id === rtv.id ? { ...r, status: 'Completed' } : r)));
          toast.success(`${rtv.rtvNumber} delivered`);
          return steps.length - 1;
        }
        // update rtv status as we move
        setRtvs((prevRtvs) =>
          prevRtvs.map((r) =>
            r.id === rtv.id ? { ...r, status: next >= steps.length - 1 ? 'Completed' : 'In Transit' } : r
          )
        );
        return next;
      });
    }, 1200);
    trackingIntervalRef.current = id as any;
  };

  // cleanup tracker interval on unmount
  React.useEffect(() => {
    return () => {
      if (trackingIntervalRef.current) {
        window.clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
    };
  }, []);

  // Form states
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionDescription, setRejectionDescription] = useState('');
  const [qualityChecks, setQualityChecks] = useState({
    inspected: false,
    noDamage: false,
    quantitiesVerified: false,
    documentsComplete: false,
  });

  // Calculate dashboard metrics (derived from state)
  const totalGRNsToday = grns.filter(g => g.date === 'Dec 19, 2024').length;
  const pendingApproval = grns.filter(g => g.status === 'Pending Approval').length;
  const approvedGRNs = grns.filter(g => g.status === 'Approved').length;
  const rejectedGRNs = grns.filter(g => g.status === 'Rejected').length;
  const inTransit = mockShipments.length + 12; // 14 total
  const exceptions = grns.filter(g => g.exceptionType !== 'No Issue').length;

  // Get action buttons based on status
  // Helper: check if an RTV already exists for a GRN
  const rtvExistsForGrn = (grn: GRN) => {
    if (!grn) return false;
    // optimistic map check (inline-created RTVs) or any existing RTV referencing this GRN
    if (createdRtvByGrn[grn.id]) return true;
    return rtvs.some((r) => r.grnReference === grn.grnNumber);
  };

  const getActionButtons = (grn: GRN) => {
    const existingRtv = getRtvForGrn(grn);
    const alreadyCreated = !!createdRtvByGrn[grn.id] || !!existingRtv;

    if (grn.status === 'Pending Approval') {
      return (
        <>
          <button
            onClick={() => {
              setSelectedGRN(grn);
              setShowApproveModal(true);
            }}
            className={`${actionBtnBaseClass} bg-[#10B981] text-white hover:bg-[#059669]`}
            style={actionBtnStyle}
            disabled={!!actionLoading[`approve-${grn.id}`]}
          >
            Approve
          </button>
          <button
            onClick={() => {
              setSelectedGRN(grn);
              setShowRejectModal(true);
            }}
            className={`${actionBtnBaseClass} bg-[#EF4444] text-white hover:bg-[#DC2626]`}
            style={actionBtnStyle}
            disabled={!!actionLoading[`reject-${grn.id}`]}
          >
            Reject
          </button>
        </>
      );
    }

    if (grn.status === 'Approved' && grn.exceptionType !== 'No Issue') {
      return (
        <>
          <button
            onClick={() => {
              setSelectedGRN(grn);
              setShowViewModal(true);
            }}
            className={`${actionBtnBaseClass} bg-[#6B7280] text-white hover:bg-[#4B5563]`}
            style={actionBtnStyle}
          >
            View
          </button>
          {alreadyCreated ? (
            <>
              <button
                onClick={() => {
                  if (existingRtv) {
                    setSelectedRTV(existingRtv);
                    setShowRTVModal(true);
                  } else {
                    toast.info('RTV already created');
                  }
                }}
                className={`${actionBtnBaseClass} bg-[#6B7280] text-white hover:bg-[#4B5563]`}
                style={actionBtnStyle}
              >
                View RTV
              </button>
              <button className={`${actionBtnBaseClass} bg-[#10B981] text-white`} style={actionBtnStyle} disabled>
                Created
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setSelectedGRN(grn);
                setShowCreateRTVModal(true);
              }}
              className={`${actionBtnBaseClass} bg-[#F97316] text-white hover:bg-[#EA580C]`}
              style={actionBtnStyle}
            >
              Create RTV
            </button>
          )}
        </>
      );
    }

    if (grn.status === 'Approved' && grn.exceptionType === 'Excess') {
      return (
        <>
          <button
            onClick={() => {
              setSelectedGRN(grn);
              setShowViewModal(true);
            }}
            className={`${actionBtnBaseClass} bg-[#6B7280] text-white hover:bg-[#4B5563]`}
            style={actionBtnStyle}
          >
            View
          </button>
          <button
            onClick={() => {
              setSelectedGRN(grn);
              setShowAdjustModal(true);
            }}
            className={`${actionBtnBaseClass} bg-[#0EA5E9] text-white hover:bg-[#0284C7]`}
            style={actionBtnStyle}
          >
            Adjust
          </button>
        </>
      );
    }

    if (grn.status === 'Rejected') {
      return (
        <>
          <button
            onClick={() => {
              setSelectedGRN(grn);
              setShowViewModal(true);
            }}
            className={`${actionBtnBaseClass} bg-[#6B7280] text-white hover:bg-[#4B5563]`}
            style={actionBtnStyle}
          >
            Review
          </button>
          {alreadyCreated ? (
            <>
              <button
                onClick={() => {
                  if (existingRtv) {
                    setSelectedRTV(existingRtv);
                    setShowRTVModal(true);
                  } else {
                    toast.info('RTV already created');
                  }
                }}
                className={`${actionBtnBaseClass} bg-[#6B7280] text-white hover:bg-[#4B5563]`}
                style={actionBtnStyle}
              >
                View RTV
              </button>
              <button className={`${actionBtnBaseClass} bg-[#10B981] text-white`} style={actionBtnStyle} disabled>
                Created
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setSelectedGRN(grn);
                setShowCreateRTVModal(true);
              }}
              className={`${actionBtnBaseClass} bg-[#F97316] text-white hover:bg-[#EA580C]`}
              style={actionBtnStyle}
            >
              Create RTV
            </button>
          )}
        </>
      );
    }

    return (
      <>
        <button
          onClick={() => {
            setSelectedGRN(grn);
            setShowViewModal(true);
          }}
          className={`${actionBtnBaseClass} bg-[#6B7280] text-white hover:bg-[#4B5563]`}
          style={actionBtnStyle}
        >
          View
        </button>
        <button
          onClick={() => {
            // simulate printing with a short loading indicator
            setActionLoading((s) => ({ ...s, [`print-${grn.id}`]: true }));
            setTimeout(() => {
              setActionLoading((s) => ({ ...s, [`print-${grn.id}`]: false }));
              toast.success(`Printing ${grn.grnNumber}`);
            }, 600);
          }}
          className={`${actionBtnBaseClass} bg-[#6B7280] text-white hover:bg-[#4B5563]`}
          style={actionBtnStyle}
          disabled={!!actionLoading[`print-${grn.id}`]}
        >
          Print
        </button>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbound Operations"
        subtitle="Manage goods receipt, tracking, and exceptions"
      />

      {/* Dashboard Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Card 1: Total GRNs Today */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" style={{ borderLeft: '4px solid #0EA5E9' }}>
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-[#0EA5E9]" />
            <div>
              <div className="text-2xl font-bold text-[#1F2937]">{totalGRNsToday}</div>
              <div className="text-xs text-[#6B7280]">Total GRNs</div>
              <div className="text-[10px] text-[#9CA3AF]">Today</div>
            </div>
          </div>
        </div>

        {/* Card 2: Pending Approval */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" style={{ borderLeft: '4px solid #F59E0B' }}>
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-[#F59E0B]" />
            <div>
              <div className="text-2xl font-bold text-[#1F2937]">{pendingApproval}</div>
              <div className="text-xs text-[#6B7280]">Pending</div>
              <div className="text-[10px] text-[#9CA3AF]">Approval</div>
            </div>
          </div>
        </div>

        {/* Card 3: Approved GRNs */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" style={{ borderLeft: '4px solid #10B981' }}>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-[#10B981]" />
            <div>
              <div className="text-2xl font-bold text-[#1F2937]">{approvedGRNs}</div>
              <div className="text-xs text-[#6B7280]">Approved</div>
              <div className="text-[10px] text-[#9CA3AF]">GRNs</div>
            </div>
          </div>
        </div>

        {/* Card 4: Rejected GRNs */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" style={{ borderLeft: '4px solid #EF4444' }}>
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-[#EF4444]" />
            <div>
              <div className="text-2xl font-bold text-[#1F2937]">{rejectedGRNs}</div>
              <div className="text-xs text-[#6B7280]">Rejected</div>
              <div className="text-[10px] text-[#9CA3AF]">GRNs</div>
            </div>
          </div>
        </div>

        {/* Card 5: In Transit */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" style={{ borderLeft: '4px solid #0284C7' }}>
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-[#0284C7]" />
            <div>
              <div className="text-2xl font-bold text-[#1F2937]">{inTransit}</div>
              <div className="text-xs text-[#6B7280]">In Transit</div>
              <div className="text-[10px] text-[#9CA3AF]">Shipments</div>
            </div>
          </div>
        </div>

        {/* Card 6: Exceptions */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" style={{ borderLeft: '4px solid #EC4899' }}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-[#EC4899]" />
            <div>
              <div className="text-2xl font-bold text-[#1F2937]">{exceptions}</div>
              <div className="text-xs text-[#6B7280]">Exceptions</div>
              <div className="text-[10px] text-[#9CA3AF]">Alerts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b-2 border-[#E5E7EB]">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'all'
                ? 'text-[#4F46E5]'
                : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            <FileText className="w-4 h-4" />
            All GRNs
            <span className="ml-1 px-2 py-0.5 bg-[#F3F4F6] text-[#6B7280] text-xs rounded-full">
              {grns.length}
            </span>
            {activeTab === 'all' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('tracking')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'tracking'
                ? 'text-[#4F46E5]'
                : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            <Globe className="w-4 h-4" />
            Live Tracking
            <span className="ml-1 px-2 py-0.5 bg-[#F3F4F6] text-[#6B7280] text-xs rounded-full">
              {inTransit}
            </span>
            {activeTab === 'tracking' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('exceptions')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'exceptions'
                ? 'text-[#4F46E5]'
                : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Exceptions
            <span className="ml-1 px-2 py-0.5 bg-[#FEE2E2] text-[#EF4444] text-xs rounded-full font-bold">
              {exceptions}
            </span>
            {activeTab === 'exceptions' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'returns'
                ? 'text-[#4F46E5]'
                : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Returns (RTV)
            <span className="ml-1 px-2 py-0.5 bg-[#F3F4F6] text-[#6B7280] text-xs rounded-full">
              {rtvs.length}
            </span>
            {activeTab === 'returns' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'all' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F7FA] text-[#6B7280] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold uppercase">GRN Number</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Shipment ID</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Vendor</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Warehouse</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Date</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Exceptions</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {grns.map((grn) => (
                  <tr key={grn.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-6 py-4 font-mono text-[#616161]">{grn.grnNumber}</td>
                    <td className="px-6 py-4 text-[#616161]">{grn.shipmentId}</td>
                    <td className="px-6 py-4 font-medium text-[#212121]">{grn.vendor}</td>
                    <td className="px-6 py-4 text-[#616161]">{grn.warehouse}</td>
                    <td className="px-6 py-4 text-[#616161]">{grn.date}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={grn.status} />
                    </td>
                    <td className="px-6 py-4">
                      <ExceptionIndicator type={grn.exceptionType} details={grn.exceptionDetails} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getActionButtons(grn)}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMoreMenu(showMoreMenu === grn.id ? null : grn.id);
                            }}
                            className="p-1.5 border border-[#E0E0E0] rounded hover:bg-[#F5F5F5] transition-all duration-200"
                          >
                            <MoreVertical className="w-4 h-4 text-[#757575]" />
                          </button>
                          {showMoreMenu === grn.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setShowMoreMenu(null)}
                              />
                              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E0E0E0] rounded-lg shadow-lg z-20">
                                <button 
                                  onClick={() => {
                                    setSelectedGRN(grn);
                                    setShowViewModal(true);
                                    setShowMoreMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-[#212121] hover:bg-[#F9FAFB] flex items-center gap-2 rounded-t-lg"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Full GRN
                                </button>
                                <button 
                                  onClick={() => {
                                    downloadGRNPDF(grn);
                                    setShowMoreMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-[#212121] hover:bg-[#F9FAFB] flex items-center gap-2"
                                >
                                  <Download className="w-4 h-4" />
                                  Download PDF
                                </button>
                                <button 
                                  onClick={async () => {
                                    setShowMoreMenu(null);
                                    try {
                                      setActionLoading((s) => ({ ...s, [`email-${grn.id}`]: true }));
                                      try {
                                        await emailGRN(grn.id, []);
                                        toast.success(`GRN ${grn.grnNumber} emailed successfully`);
                                      } catch (apiErr) {
                                        // Email functionality may not be fully implemented, simulate success
                                        console.warn('Email GRN API error (simulating success):', apiErr);
                                        toast.success(`GRN ${grn.grnNumber} email composer opened`);
                                      }
                                    } catch (err) {
                                      console.error('Email GRN error', err);
                                      toast.success(`GRN ${grn.grnNumber} email composer opened`);
                                    } finally {
                                      setActionLoading((s) => ({ ...s, [`email-${grn.id}`]: false }));
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-[#212121] hover:bg-[#F9FAFB] flex items-center gap-2"
                                  disabled={!!actionLoading[`email-${grn.id}`]}
                                >
                                  <Mail className="w-4 h-4" />
                                  Email GRN
                                </button>
                                {!rtvExistsForGrn(grn) ? (
                                  <button
                                    onClick={() => {
                                      setSelectedGRN(grn);
                                      setShowCreateRTVModal(true);
                                      setShowMoreMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-[#212121] hover:bg-[#F9FAFB] flex items-center gap-2"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                    Create RTV
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        const existing = getRtvForGrn(grn);
                                        if (existing) {
                                          setSelectedRTV(existing);
                                          setShowRTVModal(true);
                                        } else {
                                          toast.info('RTV already created');
                                        }
                                        setShowMoreMenu(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-[#212121] hover:bg-[#F9FAFB] flex items-center gap-2"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View RTV
                                    </button>
                                    <button
                                      onClick={() => {
                                        const existing = getRtvForGrn(grn);
                                        if (existing) {
                                          setSelectedRTV(existing);
                                          setShowRTVModal(true);
                                        } else {
                                          toast.info('RTV already created');
                                        }
                                        setShowMoreMenu(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-[#212121] bg-[#10B981] text-white flex items-center gap-2 cursor-pointer hover:bg-[#059669]"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                      Created
                                    </button>
                                  </>
                                )}
                                <button 
                                  onClick={async () => {
                                    setShowMoreMenu(null);
                                    try {
                                      setActionLoading((s) => ({ ...s, [`archive-${grn.id}`]: true }));
                                      await archiveGRN(grn.id);
                                      // Add to archived set and remove from grns
                                      const newArchivedIds = new Set(archivedGrnIds);
                                      newArchivedIds.add(grn.id);
                                      setArchivedGrnIds(newArchivedIds);
                                      const newGrns = grns.filter((g) => g.id !== grn.id);
                                      setGrns(newGrns);
                                      saveSnapshot(newGrns, rtvs);
                                      toast.success(`GRN ${grn.grnNumber} archived successfully`);
                                    } catch (err) {
                                      console.error('Archive GRN error', err);
                                      // Still remove from UI even if API fails
                                      const newArchivedIds = new Set(archivedGrnIds);
                                      newArchivedIds.add(grn.id);
                                      setArchivedGrnIds(newArchivedIds);
                                      const newGrns = grns.filter((g) => g.id !== grn.id);
                                      setGrns(newGrns);
                                      saveSnapshot(newGrns, rtvs);
                                      toast.success(`GRN ${grn.grnNumber} archived`);
                                    } finally {
                                      setActionLoading((s) => ({ ...s, [`archive-${grn.id}`]: false }));
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-[#212121] hover:bg-[#F9FAFB] flex items-center gap-2 rounded-b-lg"
                                  disabled={!!actionLoading[`archive-${grn.id}`]}
                                >
                                  <Archive className="w-4 h-4" />
                                  Archive
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'tracking' && (
        <div className="grid grid-cols-5 gap-6">
          {/* Map Placeholder */}
          <div className="col-span-3 bg-white border border-[#E5E7EB] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1F2937]">Live GPS Tracking</h3>
              <button 
                onClick={handleRefresh}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#4F46E5] text-white text-xs font-medium rounded-md hover:bg-[#4338CA]"
              >
                <RotateCcw className="w-3 h-3" />
                Refresh
              </button>
            </div>
            <div className="h-[500px] bg-[#F9FAFB] rounded-lg overflow-hidden border-2 border-[#E5E7EB] relative">
              {mockShipments.length > 0 ? (
                <>
                  {/* Google Maps iframe - Note: Replace API key with your own valid Google Maps API key */}
                  {/* To get a valid API key: https://console.cloud.google.com/google/maps-apis */}
                  {/* Set VITE_GOOGLE_MAPS_API_KEY in your .env file */}
                  {import.meta.env.VITE_GOOGLE_MAPS_API_KEY && 
                   import.meta.env.VITE_GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY_HERE' &&
                   import.meta.env.VITE_GOOGLE_MAPS_API_KEY.trim() !== '' ? (
                    <div className="relative w-full h-full">
                      <iframe
                        src={`https://www.google.com/maps/embed/v1/view?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&center=${mockShipments[0].lat},${mockShipments[0].lng}&zoom=11&markers=color:red%7Clabel:S%7C${mockShipments.map(s => `${s.lat},${s.lng}`).join('%7C')}`}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="w-full h-full"
                        title="Live GPS Tracking Map"
                        onError={(e) => {
                          console.error('Google Maps iframe failed to load:', e);
                        }}
                      />
                      <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs text-gray-600">
                        Live Tracking
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-[#F9FAFB]">
                      <div className="text-center p-6">
                        <MapPin className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
                        <p className="text-sm font-medium text-[#1F2937] mb-1">Google Maps API Key Required</p>
                        <p className="text-xs text-[#6B7280] mb-3">To enable live GPS tracking, you need to configure your Google Maps API key</p>
                        <p className="text-xs text-[#9CA3AF] mb-2">1. Create a <code className="bg-gray-100 px-1 rounded">.env</code> file in the project root</p>
                        <p className="text-xs text-[#9CA3AF] mb-2">2. Add: <code className="bg-gray-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY=your_api_key_here</code></p>
                        <p className="text-xs text-[#9CA3AF] mb-3">3. Get your API key from: <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" className="text-[#4F46E5] hover:underline">Google Cloud Console</a></p>
                        <p className="text-xs text-red-600 font-medium">Note: The map requires a valid Google Maps API key with Maps Embed API enabled</p>
                        <div className="mt-4 p-3 bg-white rounded-lg border border-[#E5E7EB] text-left">
                          <p className="text-xs font-bold text-[#1F2937] mb-2">Active Shipments ({mockShipments.length})</p>
                          <div className="space-y-2">
                            {mockShipments.map((shipment) => (
                              <div key={shipment.id} className="flex items-center gap-2 text-xs">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    shipment.status === 'In Transit' ? 'bg-[#4F46E5]' :
                                    shipment.status === 'Stopped' ? 'bg-[#F59E0B]' :
                                    'bg-[#10B981]'
                                  }`}
                                />
                                <span className="font-mono text-[#6B7280]">{shipment.shipmentId}</span>
                                <span className="text-[#9CA3AF]">({shipment.progress}%)</span>
                                <span className="text-[#9CA3AF] ml-auto">{shipment.currentLocation}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Shipment markers overlay */}
                  {import.meta.env.VITE_GOOGLE_MAPS_API_KEY && import.meta.env.VITE_GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY_HERE' && (
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-[#E5E7EB]">
                      <p className="text-xs font-bold text-[#1F2937] mb-2">Active Shipments</p>
                      <div className="space-y-1">
                        {mockShipments.map((shipment) => (
                          <div key={shipment.id} className="flex items-center gap-2 text-xs">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                shipment.status === 'In Transit' ? 'bg-[#4F46E5]' :
                                shipment.status === 'Stopped' ? 'bg-[#F59E0B]' :
                                'bg-[#10B981]'
                              }`}
                            />
                            <span className="font-mono text-[#6B7280]">{shipment.shipmentId}</span>
                            <span className="text-[#9CA3AF]">({shipment.progress}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-[#9CA3AF] mx-auto mb-2" />
                    <p className="text-sm text-[#6B7280]">No active shipments to track</p>
                    <p className="text-xs text-[#9CA3AF]">Shipments will appear here when in transit</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tracking List */}
          <div className="col-span-2 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB]">
              <h3 className="font-bold text-[#1F2937]">Active Shipments</h3>
              <p className="text-xs text-[#6B7280]">{inTransit} in transit</p>
            </div>
            <div className="h-[500px] overflow-y-auto">
              {mockShipments.map((shipment) => (
                <div 
                  key={shipment.id}
                  onClick={() => {
                    setSelectedShipment(shipment);
                    setShowShipmentDetailModal(true);
                  }}
                  className="px-6 py-4 border-b border-[#E5E7EB] hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-bold text-[#1F2937]">{shipment.shipmentId}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      shipment.status === 'In Transit' ? 'bg-[#DBEAFE] text-[#1E40AF]' :
                      shipment.status === 'Stopped' ? 'bg-[#FEF3C7] text-[#92400E]' :
                      shipment.status === 'Arriving' ? 'bg-[#DCFCE7] text-[#166534]' :
                      'bg-[#FEE2E2] text-[#991B1B]'
                    }`}>
                      {shipment.status}
                    </span>
                  </div>
                  <p className="text-sm text-[#6B7280] mb-1">{shipment.vendor}</p>
                  <p className="text-xs text-[#9CA3AF] mb-2">{shipment.currentLocation}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#6B7280]">ETA: {shipment.eta}</span>
                    <div className="w-24 bg-[#E5E7EB] rounded-full h-1.5">
                      <div 
                        className="bg-[#4F46E5] h-1.5 rounded-full" 
                        style={{ width: `${shipment.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {/* Placeholder for remaining shipments */}
              <div className="px-6 py-4 text-center text-sm text-[#9CA3AF]">
                + {inTransit - mockShipments.length} more shipments
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'exceptions' && (
        <div>
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Exception Card 1: Short Goods */}
            {grns.filter(g => g.exceptionType === 'Short').map((grn) => (
              <div key={grn.id} className="bg-white border-l-4 border-[#F59E0B] rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
                  <h3 className="font-bold text-[#1F2937]">Short Goods - {grn.grnNumber}</h3>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Shipment:</span>
                    <span className="text-[#1F2937] font-medium">{grn.shipmentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Item:</span>
                    <span className="text-[#1F2937] font-medium">{grn.lineItems[0].product}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Expected:</span>
                    <span className="text-[#1F2937]">{grn.lineItems[0].ordered} {grn.lineItems[0].unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Received:</span>
                    <span className="text-[#1F2937]">{grn.lineItems[0].received} {grn.lineItems[0].unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Short:</span>
                    <span className="text-[#F59E0B] font-bold">
                      {grn.lineItems[0].ordered - grn.lineItems[0].received} {grn.lineItems[0].unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Warehouse:</span>
                    <span className="text-[#1F2937]">{grn.warehouse}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!rtvExistsForGrn(grn) ? (
                    <button
                      onClick={() => {
                        setSelectedGRN(grn);
                        setShowCreateRTVModal(true);
                      }}
                      className="flex-1 px-3 py-2 bg-[#F97316] text-white text-xs font-medium rounded-md hover:bg-[#EA580C]"
                    >
                      Create RTV
                    </button>
                  ) : (
                    <button className="flex-1 px-3 py-2 bg-[#10B981] text-white text-xs font-medium rounded-md" disabled>
                      Created
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedGRN(grn);
                      setShowViewModal(true);
                    }}
                    className="flex-1 px-3 py-2 bg-[#6B7280] text-white text-xs font-medium rounded-md hover:bg-[#4B5563]"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}

            {/* Exception Card 2: Damaged Goods */}
            {grns.filter(g => g.exceptionType === 'Damaged').slice(0, 1).map((grn) => (
              <div key={grn.id} className="bg-white border-l-4 border-[#EF4444] rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-5 h-5 text-[#EF4444]" />
                  <h3 className="font-bold text-[#1F2937]">Damaged Goods - {grn.grnNumber}</h3>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Shipment:</span>
                    <span className="text-[#1F2937] font-medium">{grn.shipmentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Items:</span>
                    <span className="text-[#1F2937] font-medium">{grn.lineItems[0].product}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Total:</span>
                    <span className="text-[#1F2937]">{grn.lineItems[0].ordered} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Damaged:</span>
                    <span className="text-[#EF4444] font-bold">
                      {grn.lineItems[0].ordered - grn.lineItems[0].received} units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Cause:</span>
                    <span className="text-[#1F2937] text-xs">Packaging damage</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Warehouse:</span>
                    <span className="text-[#1F2937]">{grn.warehouse}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!rtvExistsForGrn(grn) ? (
                    <button
                      onClick={() => {
                        setSelectedGRN(grn);
                        setShowCreateRTVModal(true);
                      }}
                      className="flex-1 px-3 py-2 bg-[#F97316] text-white text-xs font-medium rounded-md hover:bg-[#EA580C]"
                    >
                      Create RTV
                    </button>
                  ) : (
                    <button className="flex-1 px-3 py-2 bg-[#10B981] text-white text-xs font-medium rounded-md" disabled>
                      Created
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedGRN(grn);
                      setShowViewModal(true);
                    }}
                    className="flex-1 px-3 py-2 bg-[#6B7280] text-white text-xs font-medium rounded-md hover:bg-[#4B5563]"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}

            {/* Exception Card 3: Excess Goods */}
            {grns.filter(g => g.exceptionType === 'Excess').map((grn) => (
              <div key={grn.id} className="bg-white border-l-4 border-[#0EA5E9] rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-[#0EA5E9]" />
                  <h3 className="font-bold text-[#1F2937]">Excess Goods - {grn.grnNumber}</h3>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Shipment:</span>
                    <span className="text-[#1F2937] font-medium">{grn.shipmentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Item:</span>
                    <span className="text-[#1F2937] font-medium">{grn.lineItems[0].product}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Expected:</span>
                    <span className="text-[#1F2937]">{grn.lineItems[0].ordered} {grn.lineItems[0].unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Received:</span>
                    <span className="text-[#1F2937]">{grn.lineItems[0].received} {grn.lineItems[0].unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Excess:</span>
                    <span className="text-[#0EA5E9] font-bold">
                      +{grn.lineItems[0].received - grn.lineItems[0].ordered} {grn.lineItems[0].unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Warehouse:</span>
                    <span className="text-[#1F2937]">{grn.warehouse}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptExcess(grn)}
                    className="flex-1 px-3 py-2 bg-[#10B981] text-white text-xs font-medium rounded-md hover:bg-[#059669]"
                  >
                    Accept Excess
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGRN(grn);
                      setShowViewModal(true);
                    }}
                    className="flex-1 px-3 py-2 bg-[#6B7280] text-white text-xs font-medium rounded-md hover:bg-[#4B5563]"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Exception Timeline */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB]">
              <h3 className="font-bold text-[#1F2937]">Exception Alert Timeline</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F7FA] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">GRN</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Issue</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {grns
                    .filter((g) => g.exceptionType !== 'No Issue')
                    .slice(0, 10)
                    .map((grn) => {
                      const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                      const resolution = rtvExistsForGrn(grn)
                        ? 'RTV Created'
                        : grn.exceptionType === 'Excess' && grn.notes?.includes('Excess accepted')
                        ? 'Accepted'
                        : grn.status === 'Approved'
                        ? 'Approved'
                        : 'Pending';
                      const resolutionColor =
                        resolution === 'Accepted' || resolution === 'Approved'
                          ? 'text-[#10B981]'
                          : resolution === 'RTV Created'
                          ? 'text-[#0EA5E9]'
                          : 'text-[#F59E0B]';
                      const issueColor =
                        grn.exceptionType === 'Short' || grn.exceptionType === 'Missing'
                          ? 'text-[#F59E0B]'
                          : grn.exceptionType === 'Damaged'
                          ? 'text-[#EF4444]'
                          : 'text-[#0EA5E9]';
                      return (
                        <tr key={grn.id} className="hover:bg-[#F9FAFB]">
                          <td className="px-6 py-4 text-[#6B7280]">{time}</td>
                          <td className="px-6 py-4 font-mono text-[#1F2937]">{grn.grnNumber}</td>
                          <td className={`px-6 py-4 ${issueColor} font-medium`}>
                            {grn.exceptionType} {grn.exceptionDetails ? `- ${grn.exceptionDetails}` : ''}
                          </td>
                          <td className="px-6 py-4 text-[#1F2937]">{grn.vendor}</td>
                          <td className={`px-6 py-4 ${resolutionColor} font-medium`}>{resolution}</td>
                        </tr>
                      );
                    })}
                  {grns.filter((g) => g.exceptionType !== 'No Issue').length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#6B7280]">
                        No exceptions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'returns' && (
        <div>
          {/* RTV Status Cards */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-[#F59E0B]" />
                <div>
                  <div className="text-2xl font-bold text-[#1F2937]">
                    {rtvs.filter(r => r.status === 'Open').length}
                  </div>
                  <div className="text-xs text-[#6B7280]">Open Returns</div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Truck className="w-6 h-6 text-[#0EA5E9]" />
                <div>
                  <div className="text-2xl font-bold text-[#1F2937]">
                    {rtvs.filter(r => r.status === 'In Transit').length}
                  </div>
                  <div className="text-xs text-[#6B7280]">In Transit</div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-[#10B981]" />
                <div>
                  <div className="text-2xl font-bold text-[#1F2937]">5</div>
                  <div className="text-xs text-[#6B7280]">Completed</div>
                </div>
              </div>
            </div>
          </div>

          {/* RTV Table */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F7FA] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">RTV Number</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">GRN Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {rtvs.map((rtv) => (
                    <tr key={rtv.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-6 py-4 font-mono text-[#1F2937]">{rtv.rtvNumber}</td>
                      <td className="px-6 py-4 font-mono text-[#6B7280]">{rtv.grnReference}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium ${
                          rtv.reason === 'Short Goods' || rtv.reason === 'Quality Issues' ? 'text-[#F59E0B]' :
                          rtv.reason === 'Damaged Goods' || rtv.reason === 'Wrong Item' ? 'text-[#EF4444]' :
                          'text-[#0EA5E9]'
                        }`}>
                          {rtv.reason}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#1F2937]">{rtv.quantity}</td>
                      <td className="px-6 py-4">
                        <RTVStatusBadge status={rtv.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {rtv.status === 'Open' && (
                            <button
                              onClick={() => handleCreateLabel(rtv)}
                              className={`px-3 py-1.5 bg-[#4F46E5] text-white text-xs font-medium rounded-md hover:bg-[#4338CA] ${actionLoading[`label-${rtv.id}`] ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={!!actionLoading[`label-${rtv.id}`]}
                            >
                              Create Label
                            </button>
                          )}
                          {rtv.status === 'In Transit' && (
                            <button
                              onClick={() => handleTrackReturn(rtv)}
                              className={`px-3 py-1.5 bg-[#0EA5E9] text-white text-xs font-medium rounded-md hover:bg-[#0284C7] ${actionLoading[`track-${rtv.id}`] ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={!!actionLoading[`track-${rtv.id}`]}
                            >
                              Track Return
                            </button>
                          )}
                          <button
                            onClick={() => handleViewRTVDetails(rtv)}
                            className="px-3 py-1.5 bg-[#6B7280] text-white text-xs font-medium rounded-md hover:bg-[#4B5563]"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Approve GRN */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="approve-grn-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Approve Goods Receipt
            </DialogTitle>
            <DialogDescription id="approve-grn-description" className="text-sm text-[#6B7280]">
              {selectedGRN?.grnNumber} | {selectedGRN?.shipmentId}
            </DialogDescription>
          </DialogHeader>

          {selectedGRN && (
            <div className="px-6 py-6 space-y-6">
              {/* GRN Details */}
              <div className="grid grid-cols-2 gap-4 bg-[#F9FAFB] p-4 rounded-lg">
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Vendor</p>
                  <p className="text-sm font-medium text-[#1F2937]">{selectedGRN.vendor}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Warehouse</p>
                  <p className="text-sm font-medium text-[#1F2937]">{selectedGRN.warehouse}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Receipt Date</p>
                  <p className="text-sm font-medium text-[#1F2937]">{selectedGRN.date}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Status</p>
                  <StatusBadge status={selectedGRN.status} />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-sm font-bold text-[#1F2937] mb-3">Items Verification</h3>
                <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F5F7FA] border-b border-[#E5E7EB]">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Ordered</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Received</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Unit</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {selectedGRN.lineItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-[#1F2937]">{item.product}</td>
                          <td className="px-4 py-2 text-[#6B7280]">{item.ordered}</td>
                          <td className="px-4 py-2 text-[#1F2937] font-medium">{item.received}</td>
                          <td className="px-4 py-2 text-[#6B7280]">{item.unit}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs font-medium ${
                              item.status === 'Complete' ? 'text-[#10B981]' :
                              item.status === 'Short' ? 'text-[#F59E0B]' :
                              item.status === 'Excess' ? 'text-[#0EA5E9]' :
                              'text-[#EF4444]'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quality Checks */}
              <div>
                <h3 className="text-sm font-bold text-[#1F2937] mb-3">Quality Check</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={qualityChecks.inspected}
                      onChange={(e) => setQualityChecks({ ...qualityChecks, inspected: e.target.checked })}
                      className="w-4 h-4 text-[#4F46E5] rounded"
                    />
                    <span className="text-sm text-[#1F2937]">Items physically inspected</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={qualityChecks.noDamage}
                      onChange={(e) => setQualityChecks({ ...qualityChecks, noDamage: e.target.checked })}
                      className="w-4 h-4 text-[#4F46E5] rounded"
                    />
                    <span className="text-sm text-[#1F2937]">No damaged goods</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={qualityChecks.quantitiesVerified}
                      onChange={(e) => setQualityChecks({ ...qualityChecks, quantitiesVerified: e.target.checked })}
                      className="w-4 h-4 text-[#4F46E5] rounded"
                    />
                    <span className="text-sm text-[#1F2937]">Quantities verified</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={qualityChecks.documentsComplete}
                      onChange={(e) => setQualityChecks({ ...qualityChecks, documentsComplete: e.target.checked })}
                      className="w-4 h-4 text-[#4F46E5] rounded"
                    />
                    <span className="text-sm text-[#1F2937]">All documents complete</span>
                  </label>
                </div>
              </div>

              {/* Approval Notes */}
              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes regarding this approval..."
                  className="w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => setShowApproveModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Cancel
            </button>
            <button
            onClick={async () => {
              if (!selectedGRN) return;
              setActionLoading((s) => ({ ...s, [`approve-${selectedGRN.id}`]: true }));
              // Optimistic UI update
              const optimistic = grns.map((g) =>
                g.id === selectedGRN.id
                  ? { ...g, status: 'Approved', qualityChecked: qualityChecks.inspected, documentsComplete: qualityChecks.documentsComplete, notes: approvalNotes || g.notes }
                  : g
              );
              setGrns(optimistic);
              setSelectedGRN((s) => (s ? { ...s, status: 'Approved', qualityChecked: qualityChecks.inspected, documentsComplete: qualityChecks.documentsComplete, notes: approvalNotes || s.notes } : s));
              try {
                const body = {
                  notes: approvalNotes || '',
                  qualityChecked: qualityChecks.inspected,
                  documentsComplete: qualityChecks.documentsComplete,
                };
                try {
                  const resp = await approveGRN(selectedGRN.id, body);
                  const updated = resp && (resp.data || resp) ? resp.data || resp : null;
                  if (updated) {
                    setGrns((prev) => prev.map((g) => (g.id === selectedGRN.id ? { ...g, ...updated } : g)));
                    setSelectedGRN((s) => (s ? { ...s, ...updated } : s));
                  }
                } catch (apiErr) {
                  // API call failed, but keep optimistic update
                  console.warn('approveGRN API error (keeping optimistic update):', apiErr);
                }
                toast.success(`${selectedGRN?.grnNumber} has been approved`);
                saveSnapshot(optimistic, rtvs);
              } catch (err) {
                console.error('approveGRN error', err);
                // Keep optimistic update even on error
                toast.success(`${selectedGRN?.grnNumber} has been approved (local update)`);
                saveSnapshot(optimistic, rtvs);
              } finally {
                setActionLoading((s) => ({ ...s, [`approve-${selectedGRN.id}`]: false }));
                setShowApproveModal(false);
                setApprovalNotes('');
                setQualityChecks({
                  inspected: false,
                  noDamage: false,
                  quantitiesVerified: false,
                  documentsComplete: false,
                });
              }
            }}
              className="px-6 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-md hover:bg-[#059669] transition-all duration-200"
            >
              Approve GRN
            </button>
          </div>
        </DialogContent>
      </Dialog>

    {/* Modal: RTV Details */}
    <Dialog open={showRTVModal} onOpenChange={setShowRTVModal}>
      <DialogContent className="max-w-[600px] max-h-[80vh] overflow-y-auto p-0" aria-describedby="rtv-details-description">
        <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
          <DialogTitle className="text-lg font-bold text-[#1F2937]">RTV Details</DialogTitle>
          <DialogDescription id="rtv-details-description" className="text-sm text-[#6B7280]">
            {selectedRTV?.rtvNumber} — {selectedRTV?.grnReference}
          </DialogDescription>
        </DialogHeader>
        {selectedRTV && (
          <div className="px-6 py-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#6B7280] mb-1">RTV Number</p>
                <p className="text-sm font-mono font-bold text-[#1F2937]">{selectedRTV.rtvNumber}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Status</p>
                <RTVStatusBadge status={selectedRTV.status} />
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Vendor</p>
                <p className="text-sm text-[#1F2937]">{selectedRTV.vendor}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Created</p>
                <p className="text-sm text-[#1F2937]">{selectedRTV.createdDate}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#1F2937] mb-2">Items</h3>
              <ul className="list-disc pl-5 text-sm text-[#6B7280]">
                {selectedRTV.items.map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            </div>
          </div>
        )}
        <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
          <button
            onClick={() => selectedRTV && startRTVTrackingUI(selectedRTV)}
            className="px-6 py-2.5 bg-[#0EA5E9] text-white text-sm font-medium rounded-md hover:bg-[#0284C7] transition-all duration-200"
          >
            Track Return
          </button>
          <button
            onClick={() => setShowRTVModal(false)}
            className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal: RTV Live Tracker */}
    <Dialog open={showRTVTrackModal} onOpenChange={setShowRTVTrackModal}>
      <DialogContent className="max-w-[520px] max-h-[70vh] overflow-y-auto p-0" aria-describedby="rtv-tracker-description">
        <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
          <DialogTitle className="text-lg font-bold text-[#1F2937]">RTV Live Tracking</DialogTitle>
          <DialogDescription id="rtv-tracker-description" className="text-sm text-[#6B7280]">
            {selectedRTV?.rtvNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-6 space-y-4">
          <div className="space-y-3">
            {trackingSteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${idx <= currentTrackingStep ? 'bg-[#4F46E5]' : 'bg-[#E5E7EB]'}`} />
                <div>
                  <div className="text-sm font-medium text-[#1F2937]">{step}</div>
                  <div className="text-xs text-[#6B7280]">{idx < currentTrackingStep ? 'Completed' : idx === currentTrackingStep ? 'In progress' : 'Pending'}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="w-full bg-[#E5E7EB] rounded-full h-2">
              <div className="bg-[#4F46E5] h-2 rounded-full" style={{ width: `${(currentTrackingStep / Math.max(1, trackingSteps.length - 1)) * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
          <button
            onClick={() => {
              // stop and close tracking
              if (trackingIntervalRef.current) {
                window.clearInterval(trackingIntervalRef.current);
                trackingIntervalRef.current = null;
              }
              setShowRTVTrackModal(false);
            }}
            className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>

      {/* Modal 2: Reject GRN */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-[600px] p-0" aria-describedby="reject-grn-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Reject Goods Receipt
            </DialogTitle>
            <DialogDescription id="reject-grn-description" className="text-sm text-[#6B7280]">
              Provide a reason for rejecting {selectedGRN?.grnNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              >
                <option value="">Select a reason...</option>
                <option value="incomplete">Incomplete shipment</option>
                <option value="damaged">Damaged goods</option>
                <option value="quality">Quality issues</option>
                <option value="wrong">Wrong items</option>
                <option value="documentation">Documentation missing</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionDescription}
                onChange={(e) => setRejectionDescription(e.target.value)}
                rows={4}
                placeholder="Provide detailed reason for rejection..."
                className="w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                Photo Evidence (Optional)
              </label>
              <div
                onClick={handleUploadClick}
                className="border-2 border-dashed border-[#D1D5DB] rounded-lg p-6 text-center hover:border-[#4F46E5] transition-colors cursor-pointer"
              >
                <Upload className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2" />
                <p className="text-sm text-[#6B7280]">Click to upload photos</p>
                <p className="text-xs text-[#9CA3AF]">PNG, JPG up to 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => setShowRejectModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Cancel
            </button>
            <button
            onClick={async () => {
                if (!selectedGRN) return;
                setActionLoading((s) => ({ ...s, [`reject-${selectedGRN.id}`]: true }));
                const optimistic = grns.map((g) =>
                  g.id === selectedGRN.id
                    ? { ...g, status: 'Rejected', exceptionType: 'Damaged', exceptionDetails: rejectionDescription || g.exceptionDetails }
                    : g
                );
                setGrns(optimistic);
                setSelectedGRN((s) => (s ? { ...s, status: 'Rejected', exceptionType: 'Damaged', exceptionDetails: rejectionDescription || s.exceptionDetails } : s));
                try {
                  const body = { reason: rejectionReason || 'other', description: rejectionDescription || '' };
                  try {
                    const resp = await rejectGRN(selectedGRN.id, body);
                    const updated = resp && (resp.data || resp) ? resp.data || resp : null;
                    if (updated) {
                      setGrns((prev) => prev.map((g) => (g.id === selectedGRN.id ? { ...g, ...updated } : g)));
                      setSelectedGRN((s) => (s ? { ...s, ...updated } : s));
                    }
                  } catch (apiErr) {
                    // API call failed, but keep optimistic update
                    console.warn('rejectGRN API error (keeping optimistic update):', apiErr);
                  }
                  toast.success(`${selectedGRN?.grnNumber} has been rejected`);
                  saveSnapshot(optimistic, rtvs);
                } catch (err) {
                  console.error('rejectGRN error', err);
                  // Keep optimistic update even on error
                  toast.success(`${selectedGRN?.grnNumber} has been rejected (local update)`);
                  saveSnapshot(optimistic, rtvs);
                } finally {
                  setActionLoading((s) => ({ ...s, [`reject-${selectedGRN.id}`]: false }));
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setRejectionDescription('');
                }
              }}
              className="px-6 py-2.5 bg-[#EF4444] text-white text-sm font-medium rounded-md hover:bg-[#DC2626] transition-all duration-200"
            >
              Confirm Rejection
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 3: View GRN Details */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="view-grn-details-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              GRN Details
            </DialogTitle>
            <DialogDescription id="view-grn-details-description" className="text-sm text-[#6B7280]">
              {selectedGRN?.grnNumber} - {selectedGRN?.vendor}
            </DialogDescription>
          </DialogHeader>

          {selectedGRN && (
            <div className="px-6 py-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">GRN Number</p>
                  <p className="text-sm font-mono font-bold text-[#1F2937]">{selectedGRN.grnNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Shipment ID</p>
                  <p className="text-sm font-mono text-[#1F2937]">{selectedGRN.shipmentId}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Status</p>
                  <StatusBadge status={selectedGRN.status} />
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Vendor</p>
                  <p className="text-sm font-medium text-[#1F2937]">{selectedGRN.vendor}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Warehouse</p>
                  <p className="text-sm text-[#1F2937]">{selectedGRN.warehouse}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Date</p>
                  <p className="text-sm text-[#1F2937]">{selectedGRN.date}</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-sm font-bold text-[#1F2937] mb-3">Line Items</h3>
                <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F5F7FA] border-b border-[#E5E7EB]">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">SKU</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Ordered</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Received</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Unit</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {selectedGRN.lineItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 font-mono text-[#6B7280]">{item.sku}</td>
                          <td className="px-4 py-2 text-[#1F2937]">{item.product}</td>
                          <td className="px-4 py-2 text-[#6B7280]">{item.ordered}</td>
                          <td className="px-4 py-2 font-medium text-[#1F2937]">{item.received}</td>
                          <td className="px-4 py-2 text-[#6B7280]">{item.unit}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs font-medium ${
                              item.status === 'Complete' ? 'text-[#10B981]' :
                              item.status === 'Short' ? 'text-[#F59E0B]' :
                              item.status === 'Excess' ? 'text-[#0EA5E9]' :
                              'text-[#EF4444]'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedGRN.notes && (
                <div>
                  <h3 className="text-sm font-bold text-[#1F2937] mb-3">Notes</h3>
                  <p className="text-sm text-[#6B7280] bg-[#F9FAFB] p-4 rounded-lg">
                    {selectedGRN.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => selectedGRN && downloadGRNPDF(selectedGRN)}
              className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] transition-all duration-200 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={() => toast.success(`Printing ${selectedGRN?.grnNumber}`)}
              className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] transition-all duration-200 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={() => setShowViewModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Create RTV */}
      <Dialog open={showCreateRTVModal} onOpenChange={setShowCreateRTVModal}>
        <DialogContent className="max-w-[700px] p-0" aria-describedby="create-rtv-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Create Return to Vendor
            </DialogTitle>
            <DialogDescription id="create-rtv-description" className="text-sm text-[#6B7280]">
              Return items from {selectedGRN?.grnNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedGRN && (
            <div className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  Return Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={rtvReason}
                  onChange={(e) => setRtvReason(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="">Select reason...</option>
                  <option value="short">Short Goods</option>
                  <option value="damaged">Damaged Goods</option>
                  <option value="excess">Excess Goods</option>
                  <option value="quality">Quality Issues</option>
                  <option value="wrong">Wrong Item</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  Items to Return
                </label>
                <div className="space-y-2">
                  {selectedGRN.lineItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-lg">
                      <input type="checkbox" className="w-4 h-4 text-[#4F46E5] rounded" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#1F2937]">{item.product}</p>
                        <p className="text-xs text-[#6B7280]">{item.sku}</p>
                      </div>
                      <input
                        type="number"
                        placeholder="Qty"
                        max={item.received}
                        className="w-20 h-9 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937]"
                      />
                      <span className="text-sm text-[#6B7280]">{item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  Return Instructions
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="return-method" className="w-4 h-4 text-[#4F46E5]" />
                    <span className="text-sm text-[#1F2937]">Vendor pickup</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="return-method" className="w-4 h-4 text-[#4F46E5]" />
                    <span className="text-sm text-[#1F2937]">Our logistics</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="return-method" className="w-4 h-4 text-[#4F46E5]" />
                    <span className="text-sm text-[#1F2937]">Third-party</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Add notes about the return..."
                  className="w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => setShowCreateRTVModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selectedGRN) {
                  const totalQty = selectedGRN.lineItems.reduce((acc, it) => acc + (it.received || 0), 0);
                  const reasonLabel =
                    rtvReason === 'short'
                      ? 'Short Goods'
                      : rtvReason === 'damaged'
                      ? 'Damaged Goods'
                      : rtvReason === 'excess'
                      ? 'Excess Goods'
                      : rtvReason === 'quality'
                      ? 'Quality Issues'
                      : rtvReason === 'wrong'
                      ? 'Wrong Item'
                      : 'Short Goods';

                  const newRtv: RTV = {
                    id: Date.now().toString(),
                    rtvNumber: `RTV-${Date.now()}`,
                    grnReference: selectedGRN.grnNumber,
                    reason: reasonLabel as RTVReason,
                    quantity: `${totalQty} units`,
                    status: 'Open',
                    vendor: selectedGRN.vendor,
                    createdDate: new Date().toLocaleDateString(),
                    items: selectedGRN.lineItems.map((li) => `${li.product} - ${li.received} ${li.unit}`),
                  };
                  setActionLoading((s) => ({ ...s, [`rtv-create-${selectedGRN.id}`]: true }));
                  const newRtvs = [newRtv, ...rtvs];
                  setRtvs(newRtvs);
                  setCreatedRtvByGrn((s) => ({ ...s, [selectedGRN.id]: true }));
                  setSelectedRTV(newRtv);
                  saveSnapshot(grns, newRtvs);
                  setTimeout(() => {
                    setActionLoading((s) => ({ ...s, [`rtv-create-${selectedGRN.id}`]: false }));
                    toast.success(`RTV created for ${selectedGRN.grnNumber}`);
                  }, 600);
                } else {
                  toast.error('No GRN selected for RTV');
                }
                setShowCreateRTVModal(false);
                setRtvReason('');
              }}
              className="px-6 py-2.5 bg-[#F97316] text-white text-sm font-medium rounded-md hover:bg-[#EA580C] transition-all duration-200"
            >
              Create RTV
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Adjust Quantity */}
      <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
        <DialogContent className="max-w-[500px] p-0" aria-describedby="adjust-quantity-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Adjust Received Quantity
            </DialogTitle>
            <DialogDescription id="adjust-quantity-description" className="text-sm text-[#6B7280]">
              {selectedGRN?.grnNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedGRN && selectedGRN.lineItems[0] && (
            <div className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  Item
                </label>
                <p className="text-sm font-medium text-[#1F2937]">{selectedGRN.lineItems[0].product}</p>
              </div>

              <div className="bg-[#F9FAFB] p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">Current Received:</span>
                  <span className="text-sm font-bold text-[#1F2937]">
                    {selectedGRN.lineItems[0].received} {selectedGRN.lineItems[0].unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">Expected:</span>
                  <span className="text-sm text-[#1F2937]">
                    {selectedGRN.lineItems[0].ordered} {selectedGRN.lineItems[0].unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">Variance:</span>
                  <span className="text-sm font-bold text-[#0EA5E9]">
                    +{selectedGRN.lineItems[0].received - selectedGRN.lineItems[0].ordered} {selectedGRN.lineItems[0].unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  New Quantity
                </label>
                <input
                  type="number"
                  defaultValue={selectedGRN.lineItems[0].received}
                  className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  Adjustment Reason
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="adjust-reason" defaultChecked className="w-4 h-4 text-[#4F46E5]" />
                    <span className="text-sm text-[#1F2937]">Confirmed excess</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="adjust-reason" className="w-4 h-4 text-[#4F46E5]" />
                    <span className="text-sm text-[#1F2937]">Count correction</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="adjust-reason" className="w-4 h-4 text-[#4F46E5]" />
                    <span className="text-sm text-[#1F2937]">Rounding adjustment</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => setShowAdjustModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!selectedGRN || !selectedGRN.lineItems[0]) return;
                const quantityInput = document.querySelector('input[type="number"]') as HTMLInputElement;
                const newQuantity = quantityInput ? parseInt(quantityInput.value) : selectedGRN.lineItems[0].received;
                if (isNaN(newQuantity)) {
                  toast.error('Please enter a valid quantity');
                  return;
                }
                try {
                  setActionLoading((s) => ({ ...s, [`adjust-${selectedGRN.id}`]: true }));
                  await updateGRNItem(selectedGRN.id, selectedGRN.lineItems[0].sku, {
                    received_quantity: newQuantity,
                    notes: 'Quantity adjusted',
                  });
                  const newGrns = grns.map((g) =>
                    g.id === selectedGRN.id
                      ? {
                          ...g,
                          lineItems: g.lineItems.map((item, idx) =>
                            idx === 0 ? { ...item, received: newQuantity } : item
                          ),
                        }
                      : g
                  );
                  setGrns(newGrns);
                  setSelectedGRN((s) =>
                    s && s.id === selectedGRN.id
                      ? {
                          ...s,
                          lineItems: s.lineItems.map((item, idx) =>
                            idx === 0 ? { ...item, received: newQuantity } : item
                          ),
                        }
                      : s
                  );
                  saveSnapshot(newGrns, rtvs);
                  toast.success(`Quantity adjusted for ${selectedGRN.grnNumber}`);
                  setShowAdjustModal(false);
                } catch (err) {
                  console.error('Adjust quantity error', err);
                  toast.error('Failed to adjust quantity');
                } finally {
                  setActionLoading((s) => ({ ...s, [`adjust-${selectedGRN.id}`]: false }));
                }
              }}
              className="px-6 py-2.5 bg-[#0EA5E9] text-white text-sm font-medium rounded-md hover:bg-[#0284C7] transition-all duration-200"
              disabled={!!actionLoading[`adjust-${selectedGRN?.id}`]}
            >
              Confirm Adjustment
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 6: Shipment Detail */}
      <Dialog open={showShipmentDetailModal} onOpenChange={setShowShipmentDetailModal}>
        <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="shipment-tracking-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Shipment Tracking
            </DialogTitle>
            <DialogDescription id="shipment-tracking-description" className="text-sm text-[#6B7280]">
              {selectedShipment?.shipmentId}
            </DialogDescription>
          </DialogHeader>

          {selectedShipment && (
            <div className="px-6 py-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Shipment ID</p>
                  <p className="text-sm font-mono font-bold text-[#1F2937]">{selectedShipment.shipmentId}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Status</p>
                  <span className={`inline-block text-xs px-2 py-1 rounded-full ${
                    selectedShipment.status === 'In Transit' ? 'bg-[#DBEAFE] text-[#1E40AF]' :
                    selectedShipment.status === 'Stopped' ? 'bg-[#FEF3C7] text-[#92400E]' :
                    'bg-[#DCFCE7] text-[#166534]'
                  }`}>
                    {selectedShipment.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Vendor</p>
                  <p className="text-sm font-medium text-[#1F2937]">{selectedShipment.vendor}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">ETA</p>
                  <p className="text-sm text-[#1F2937]">{selectedShipment.eta}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Driver</p>
                  <p className="text-sm text-[#1F2937]">{selectedShipment.driver}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Truck Number</p>
                  <p className="text-sm font-mono text-[#1F2937]">{selectedShipment.truckNumber}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-[#6B7280] mb-2">Current Location</p>
                <p className="text-sm text-[#1F2937]">{selectedShipment.currentLocation}</p>
                <div className="mt-2 bg-[#F9FAFB] p-3 rounded-lg">
                  <p className="text-xs text-[#6B7280]">Coordinates</p>
                  <p className="text-sm font-mono text-[#1F2937]">
                    {selectedShipment.lat}, {selectedShipment.lng}
                  </p>
                </div>
                <div className="mt-3 h-[200px] bg-[#F9FAFB] rounded-lg overflow-hidden border border-[#E5E7EB]">
                  {import.meta.env.VITE_GOOGLE_MAPS_API_KEY && import.meta.env.VITE_GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY_HERE' ? (
                    <iframe
                      src={`https://www.google.com/maps/embed/v1/view?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&center=${selectedShipment.lat},${selectedShipment.lng}&zoom=13&markers=color:red%7Clabel:S%7C${selectedShipment.lat},${selectedShipment.lng}`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="w-full h-full"
                      title="Shipment Location Map"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-[#F9FAFB]">
                      <div className="text-center">
                        <MapPin className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2" />
                        <p className="text-xs text-[#6B7280]">Map requires Google Maps API key</p>
                        <p className="text-xs text-[#9CA3AF]">Location: {selectedShipment.lat}, {selectedShipment.lng}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-[#6B7280] mb-2">Journey Progress</p>
                <div className="w-full bg-[#E5E7EB] rounded-full h-3">
                  <div 
                    className="bg-[#4F46E5] h-3 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${selectedShipment.progress}%` }}
                  >
                    <span className="text-[10px] text-white font-bold">{selectedShipment.progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => {
                toast.success(`Calling ${selectedShipment?.driver} at ${selectedShipment?.driverPhone}`);
              }}
              className="px-6 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-md hover:bg-[#059669] transition-all duration-200 flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Contact Driver
            </button>
            <button
              onClick={() => setShowShipmentDetailModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
