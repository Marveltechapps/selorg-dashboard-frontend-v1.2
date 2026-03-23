import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, Download, Upload, X, 
  MoreVertical, Eye, Edit, FileText, MessageSquare,
  BarChart3, Pause, PlayCircle, XCircle, Trash2, CheckCircle,
  AlertTriangle, MapPin, Send, Loader2, ChevronRight
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { VendorProfile } from './VendorProfile';
import { AddVendorModal, VENDOR_PAYMENT_TERMS, type VendorCreatePayload } from './AddVendorModal';
import { PerformanceReportModal } from './PerformanceReportModal';
import * as vendorApi from '../../../api/vendor/vendorManagement.api';
import { useOnDashboardRefresh, DASHBOARD_TOPICS } from '../../../hooks/useDashboardRefresh';
interface Vendor {
  id: string;
  code: string;
  name: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  complianceStatus: 'Compliant' | 'Pending' | 'Non-Compliant';
  status: 'Active' | 'Inactive' | 'Suspended' | 'Under Review';
  statusColor: string;
}

/** Portaled row action menu width (matches `w-56`). */
const VENDOR_ACTION_MENU_WIDTH = 224;

/** Rough height for full menu (~10 items + dividers); used to choose above vs below. */
const VENDOR_ACTION_MENU_ESTIMATED_HEIGHT = 360;

type VendorActionMenuPosition = {
  left: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

/**
 * Viewport-fixed position for the portaled menu. Flips above the ⋮ when there is not
 * enough space below so the panel is not clipped by the window (or visually by the card edge).
 */
function computeVendorActionMenuPosition(anchorEl: HTMLElement): VendorActionMenuPosition {
  const rect = anchorEl.getBoundingClientRect();
  const gap = 6;
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = rect.right - VENDOR_ACTION_MENU_WIDTH;
  if (left < margin) left = margin;
  if (left + VENDOR_ACTION_MENU_WIDTH > vw - margin) {
    left = Math.max(margin, vw - VENDOR_ACTION_MENU_WIDTH - margin);
  }

  const spaceBelow = vh - rect.bottom - gap - margin;
  const spaceAbove = rect.top - gap - margin;
  const cap = Math.min(vh * 0.85, 520);
  const needBelow = Math.min(VENDOR_ACTION_MENU_ESTIMATED_HEIGHT, cap);
  const openBelow = spaceBelow >= needBelow || spaceBelow >= spaceAbove;

  if (openBelow) {
    const top = rect.bottom + gap;
    const maxHeight = Math.min(cap, Math.max(180, spaceBelow));
    return { left, top, maxHeight };
  }

  const maxHeight = Math.min(cap, Math.max(180, spaceAbove));
  const bottom = vh - rect.top + gap;
  return { left, bottom, maxHeight };
}

/** Expected bulk-import columns (UTF-8 CSV, header row required). line2/line3 may be empty. */
const VENDOR_BULK_IMPORT_CSV_HEADER =
  'vendorCode,vendorName,gstin,paymentTerms,currencyCode,line1,line2,line3,city,state,country,zipCode,contactName,contactPhone,contactEmail';

type FlatVendorCsvRow = {
  vendorCode: string;
  vendorName: string;
  gstin: string;
  paymentTerms: string;
  currencyCode: string;
  line1: string;
  line2: string;
  line3: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

const CSV_HEADER_MAP: Record<string, keyof FlatVendorCsvRow> = {
  vendorcode: 'vendorCode',
  code: 'vendorCode',
  vendorname: 'vendorName',
  name: 'vendorName',
  gstin: 'gstin',
  paymentterms: 'paymentTerms',
  currencycode: 'currencyCode',
  line1: 'line1',
  addressline1: 'line1',
  line2: 'line2',
  addressline2: 'line2',
  line3: 'line3',
  addressline3: 'line3',
  city: 'city',
  state: 'state',
  country: 'country',
  zipcode: 'zipCode',
  pincode: 'zipCode',
  postalcode: 'zipCode',
  contactname: 'contactName',
  contactphone: 'contactPhone',
  phone: 'contactPhone',
  contactemail: 'contactEmail',
};

function parseCsvRows(content: string): string[][] {
  const s = content.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let i = 0;
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    if (row.some((c) => c.trim() !== '')) {
      rows.push(row.map((c) => c.trim()));
    }
    row = [];
  };

  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      pushField();
      i++;
      continue;
    }
    if (c === '\n') {
      pushField();
      pushRow();
      i++;
      continue;
    }
    if (c === '\r') {
      if (s[i + 1] === '\n') {
        pushField();
        pushRow();
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    field += c;
    i++;
  }
  pushField();
  if (row.length) pushRow();
  return rows;
}

function mapCsvHeaderToKeys(headers: string[]): (keyof FlatVendorCsvRow | null)[] {
  return headers.map((h) => {
    const compact = h.trim().toLowerCase().replace(/[\s_-]+/g, '');
    return CSV_HEADER_MAP[compact] ?? null;
  });
}

function cellsToFlatRow(
  keys: (keyof FlatVendorCsvRow | null)[],
  cells: string[],
): FlatVendorCsvRow {
  const out: Record<string, string> = {
    vendorCode: '',
    vendorName: '',
    gstin: '',
    paymentTerms: '',
    currencyCode: '',
    line1: '',
    line2: '',
    line3: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
  };
  keys.forEach((key, idx) => {
    if (!key) return;
    out[key] = (cells[idx] ?? '').trim();
  });
  return out as FlatVendorCsvRow;
}

function flatRowToCreatePayload(row: FlatVendorCsvRow): VendorCreatePayload | { error: string } {
  const paymentTermsRaw = row.paymentTerms.trim();
  const allowedTerms = VENDOR_PAYMENT_TERMS as readonly string[];
  if (!allowedTerms.includes(paymentTermsRaw)) {
    return {
      error: `Row "${row.vendorCode || row.vendorName}": paymentTerms must be one of: ${VENDOR_PAYMENT_TERMS.join(', ')}`,
    };
  }
  const paymentTerms = paymentTermsRaw as VendorCreatePayload['paymentTerms'];
  if (!row.vendorCode || !row.vendorName || !row.gstin) {
    return { error: 'Each data row needs vendorCode, vendorName, and gstin.' };
  }
  if (!row.line1 || !row.city || !row.state || !row.zipCode) {
    return { error: `Row "${row.vendorCode}": line1, city, state, and zipCode are required.` };
  }
  if (!row.contactName || !row.contactPhone || !row.contactEmail) {
    return { error: `Row "${row.vendorCode}": contactName, contactPhone, and contactEmail are required.` };
  }
  const country = row.country.trim() || 'India';
  const currencyCode = (row.currencyCode.trim().toUpperCase() || 'INR').slice(0, 3);
  return {
    vendorCode: row.vendorCode.trim(),
    vendorName: row.vendorName.trim(),
    taxInfo: { gstin: row.gstin.trim() },
    paymentTerms,
    address: {
      line1: row.line1.trim(),
      line2: row.line2.trim() || null,
      line3: row.line3.trim() || null,
      city: row.city.trim(),
      state: row.state.trim(),
      country,
      zipCode: row.zipCode.trim(),
    },
    contact: {
      name: row.contactName.trim(),
      phone: row.contactPhone.trim(),
      email: row.contactEmail.trim().toLowerCase(),
    },
    currencyCode,
    status: 'pending',
  };
}

type VendorActionMenuState = { vendorId: string } & VendorActionMenuPosition;

type VendorListProps = {
  /** Navigate vendor app tabs (e.g. breadcrumb → Vendor Overview). */
  onNavigateTab?: (tab: string) => void;
};

function VendorListBreadcrumbSeparator() {
  return (
    <li aria-hidden className="flex items-center text-[#D1D5DB]">
      <ChevronRight className="h-4 w-4 shrink-0" />
    </li>
  );
}

export function VendorList(props: VendorListProps = {}) {
  const { onNavigateTab } = props;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionMenuAnchorRef = useRef<HTMLElement | null>(null);
  const actionMenuPanelRef = useRef<HTMLDivElement | null>(null);
  
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  /** When true, suspend dialog reactivates a suspended vendor instead. */
  const [suspendIsReactivate, setSuspendIsReactivate] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isPerformanceReportOpen, setIsPerformanceReportOpen] = useState(false);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  /** Single state so the portal never opens with a stale (top,left) from a previous menu. */
  const [actionMenu, setActionMenu] = useState<VendorActionMenuState | null>(null);

  const closeActionMenu = useCallback(() => {
    actionMenuAnchorRef.current = null;
    setActionMenu(null);
  }, []);

  const openActionMenuForVendor = useCallback((vendorId: string, anchorEl: HTMLElement) => {
    actionMenuAnchorRef.current = anchorEl;
    setActionMenu({ vendorId, ...computeVendorActionMenuPosition(anchorEl) });
  }, []);

  useLayoutEffect(() => {
    const vendorId = actionMenu?.vendorId;
    if (!vendorId) return;
    const el = actionMenuAnchorRef.current;
    if (!el) return;
    const next = computeVendorActionMenuPosition(el);
    setActionMenu((prev) => {
      if (!prev || prev.vendorId !== vendorId) return prev;
      const same =
        prev.left === next.left &&
        prev.maxHeight === next.maxHeight &&
        (prev.top ?? null) === (next.top ?? null) &&
        (prev.bottom ?? null) === (next.bottom ?? null);
      if (same) return prev;
      return { vendorId: prev.vendorId, ...next };
    });
  }, [actionMenu?.vendorId]);

  useEffect(() => {
    if (!actionMenu) return;
    const onScrollOrResize = () => closeActionMenu();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [actionMenu, closeActionMenu]);

  /** Close on outside click / Escape — avoids a full-viewport transparent button blocking the page. */
  useEffect(() => {
    if (!actionMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (actionMenuPanelRef.current?.contains(t)) return;
      if (actionMenuAnchorRef.current?.contains(t)) return;
      closeActionMenu();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeActionMenu();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [actionMenu, closeActionMenu]);

  useEffect(() => {
    if (!actionMenu) return;
    if (!vendors.some((v) => v.id === actionMenu.vendorId)) {
      closeActionMenu();
    }
  }, [actionMenu, vendors, closeActionMenu]);

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const goToVendorOverview = useCallback(() => {
    setIsViewDetailsOpen(false);
    setSelectedVendor(null);
    onNavigateTab?.('overview');
  }, [onNavigateTab]);

  const goToVendorListRoot = useCallback(() => {
    setIsViewDetailsOpen(false);
    setSelectedVendor(null);
  }, []);

  const [documentTab, setDocumentTab] = useState<'verified' | 'pending' | 'rejected' | 'upload'>('verified');
  
  // Form states
  const [messageForm, setMessageForm] = useState({ subject: '', message: '' });
  const [suspendReason, setSuspendReason] = useState('');
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const [editModalPayload, setEditModalPayload] = useState<VendorCreatePayload | null>(null);

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Helper function to format address from object or string
  const formatAddress = (address: any): string => {
    if (!address) return 'Address not provided';
    
    // If address is already a string, return it
    if (typeof address === 'string') {
      return address;
    }
    
    // If address is an object, format it
    if (typeof address === 'object') {
      const parts: string[] = [];
      
      if (address.line1) parts.push(address.line1);
      if (address.line2) parts.push(address.line2);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      if (address.pincode) parts.push(address.pincode);
      if (address.zipCode) parts.push(address.zipCode);
      if (address.postalCode) parts.push(address.postalCode);
      
      return parts.length > 0 ? parts.join(', ') : 'Address not provided';
    }
    
    return 'Address not provided';
  };

  /** Maps GET /vendor/vendors/:id (or list item) into the same shape used by Add vendor / PUT update. */
  const apiVendorRecordToCreatePayload = (api: any): VendorCreatePayload => {
    const addr = api.address || {};
    const termsRaw = String(api.paymentTerms || '').trim();
    const paymentTerms = (VENDOR_PAYMENT_TERMS as readonly string[]).includes(termsRaw)
      ? (termsRaw as (typeof VENDOR_PAYMENT_TERMS)[number])
      : '30 days';
    const catRaw = String(api.metadata?.category ?? api.category ?? '').trim();
    const cat = catRaw === '—' ? '' : catRaw;
    const gstin = String(api.taxInfo?.gstin ?? api.metadata?.gstNumber ?? '').trim();

    return {
      vendorCode: String(api.vendorCode ?? api.code ?? '').trim(),
      vendorName: String(api.vendorName ?? api.name ?? '').trim(),
      taxInfo: { gstin },
      paymentTerms,
      address: {
        line1: String(addr.line1 ?? '').trim(),
        line2: addr.line2 != null && String(addr.line2).trim() !== '' ? String(addr.line2).trim() : null,
        line3: addr.line3 != null && String(addr.line3).trim() !== '' ? String(addr.line3).trim() : null,
        city: String(addr.city ?? '').trim(),
        state: String(addr.state ?? '').trim(),
        country: String(addr.country ?? 'India').trim() || 'India',
        zipCode: String(addr.zipCode ?? addr.pincode ?? '').trim(),
      },
      contact: {
        name: String(api.contact?.name ?? api.contactName ?? api.vendorName ?? api.name ?? '').trim(),
        phone: String(api.contact?.phone ?? api.contactPhone ?? '').trim(),
        email: String(api.contact?.email ?? api.contactEmail ?? '').trim().toLowerCase(),
      },
      currencyCode: (String(api.currencyCode ?? 'INR').trim().toUpperCase() || 'INR').slice(0, 3),
      status: typeof api.status === 'string' ? api.status : undefined,
      ...(cat ? { metadata: { category: cat } } : {}),
    };
  };

  // Helper function to map API vendor to local Vendor format
  const mapApiVendorToLocal = (apiVendor: any): Vendor => {
    // Normalize status - backend uses lowercase, frontend uses title case
    let status = apiVendor.status || 'pending';
    if (typeof status === 'string') {
      const statusLower = status.toLowerCase();
      // Map backend statuses to frontend statuses
      if (statusLower === 'pending') {
        status = 'Under Review';
      } else if (statusLower === 'active') {
        status = 'Active';
      } else if (statusLower === 'inactive') {
        status = 'Inactive';
      } else if (statusLower === 'suspended') {
        status = 'Suspended';
      } else {
        // Capitalize first letter for other statuses
        status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      }
    }
    
    const statusColor = 
      status === 'Active' ? 'green' :
      status === 'Suspended' ? 'yellow' :
      status === 'Inactive' ? 'red' :
      'purple';
    
    // Handle address - could be string, object, or in metadata
    let addressValue = 'Address not provided';
    if (apiVendor.address) {
      addressValue = formatAddress(apiVendor.address);
    } else if (apiVendor.metadata?.address) {
      addressValue = formatAddress(apiVendor.metadata.address);
    } else if (apiVendor.contact?.address) {
      addressValue = formatAddress(apiVendor.contact.address);
    }
    
    const displayName =
      (typeof apiVendor.vendorName === 'string' && apiVendor.vendorName.trim()) ||
      (typeof apiVendor.name === 'string' && apiVendor.name.trim()) ||
      'Unknown Vendor';
    const displayCode =
      (typeof apiVendor.vendorCode === 'string' && apiVendor.vendorCode.trim()) ||
      (typeof apiVendor.code === 'string' && apiVendor.code.trim()) ||
      '';

    return {
      id: String(apiVendor.id || apiVendor._id || ''),
      code: displayCode,
      name: displayName,
      category: apiVendor.category || apiVendor.metadata?.category || '—',
      phone: apiVendor.contactPhone || apiVendor.contact?.phone || apiVendor.phone || 'N/A',
      email: apiVendor.contactEmail || apiVendor.contact?.email || apiVendor.email || 'N/A',
      address: addressValue,
      complianceStatus: apiVendor.complianceStatus || (apiVendor.compliance?.status || 'Pending'),
      status: status as Vendor['status'],
      statusColor
    };
  };

  // Load vendors from API
  const loadVendors = async () => {
    try {
      setIsLoading(true);
      const response = await vendorApi.listVendors({ page: 1, pageSize: 100 });
      
      // Handle different response formats
      let vendorList: any[] = [];
      if (Array.isArray(response)) {
        vendorList = response;
      } else if (response?.data && Array.isArray(response.data)) {
        vendorList = response.data;
      } else if (response?.items && Array.isArray(response.items)) {
        vendorList = response.items;
      } else if (response?.vendors && Array.isArray(response.vendors)) {
        vendorList = response.vendors;
      }
      
      // Filter out deleted vendors (vendors with metadata.deleted === true)
      const activeVendors = vendorList.filter((v: any) => {
        // Exclude vendors that are marked as deleted
        if (v.metadata?.deleted === true) {
          return false;
        }
        // Also exclude if status is inactive and has deleteReason (soft deleted)
        if (v.status === 'inactive' && v.metadata?.deleteReason) {
          return false;
        }
        return true;
      });
      
      const mappedVendors = activeVendors.map(mapApiVendorToLocal);
      setVendors(mappedVendors);
    } catch (error: any) {
      console.error('Failed to load vendors:', error);
      sonnerToast.error(error?.message || 'Failed to load vendors. Please try again.');
      setVendors([]);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  };

  // Load vendors on mount
  useEffect(() => {
    loadVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useOnDashboardRefresh(DASHBOARD_TOPICS.vendor, () => {
    void loadVendors();
  });

  const syncSelectedVendorAfterMutation = async (vendorId: string) => {
    try {
      const raw = await vendorApi.getVendorById(vendorId);
      setSelectedVendor(mapApiVendorToLocal(raw));
    } catch {
      setIsViewDetailsOpen(false);
      setSelectedVendor(null);
    }
  };

  const handleActionClick = (action: string, vendor: Vendor) => {
    setSelectedVendor(vendor);
    closeActionMenu();
    
    switch(action) {
      case 'edit':
        void (async () => {
          try {
            setIsLoading(true);
            const raw = await vendorApi.getVendorById(vendor.id);
            setEditModalPayload(apiVendorRecordToCreatePayload(raw));
            setIsEditModalOpen(true);
          } catch (error: any) {
            console.error('Failed to load vendor for edit:', error);
            sonnerToast.error(error?.message || 'Failed to load vendor details');
          } finally {
            setIsLoading(false);
          }
        })();
        break;
      case 'documents':
        setDocumentTab('verified');
        setIsDocumentsModalOpen(true);
        break;
      case 'message':
        setMessageForm({ subject: '', message: '' });
        setIsMessageModalOpen(true);
        break;
      case 'unsuspend':
        setSuspendReason('');
        setSuspendIsReactivate(true);
        setIsSuspendDialogOpen(true);
        break;
      case 'suspend':
        setSuspendReason('');
        setSuspendIsReactivate(false);
        setIsSuspendDialogOpen(true);
        break;
      case 'activate':
        setIsActivateDialogOpen(true);
        break;
      case 'deactivate':
        setDeactivateReason('');
        setIsDeactivateDialogOpen(true);
        break;
      case 'delete':
        setDeleteReason('');
        setDeleteConfirmation('');
        setIsDeleteDialogOpen(true);
        break;
      case 'view':
        setIsViewDetailsOpen(true);
        break;
      case 'performance':
        setIsPerformanceReportOpen(true);
        break;
    }
  };

  const handleEditVendorSubmit = async (vendorId: string, payload: VendorCreatePayload) => {
    try {
      setIsLoading(true);
      const updatePayload: Record<string, unknown> = {
        vendorName: payload.vendorName,
        name: payload.vendorName,
        vendorCode: payload.vendorCode,
        code: payload.vendorCode,
        taxInfo: payload.taxInfo,
        paymentTerms: payload.paymentTerms,
        currencyCode: payload.currencyCode,
        address: payload.address,
        contact: {
          name: payload.contact.name,
          phone: payload.contact.phone,
          email: payload.contact.email,
        },
      };
      if (payload.status !== undefined && payload.status !== '') {
        updatePayload.status = payload.status;
      }
      if (payload.metadata && Object.keys(payload.metadata).length > 0) {
        updatePayload.metadata = payload.metadata;
      }
      await vendorApi.updateVendor(vendorId, updatePayload);
      await loadVendors();
      setIsEditModalOpen(false);
      setEditModalPayload(null);
      if (isViewDetailsOpen) {
        await syncSelectedVendorAfterMutation(vendorId);
      } else {
        setSelectedVendor(null);
      }
      sonnerToast.success(`Changes saved successfully. "${payload.vendorName}" has been updated.`);
    } catch (error: any) {
      console.error('Failed to update vendor:', error);
      sonnerToast.error(error.message || 'Failed to update vendor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor || !messageForm.subject.trim() || !messageForm.message.trim()) {
      sonnerToast.error('Please fill in both subject and message');
      return;
    }

    try {
      setIsLoading(true);
      const res = (await vendorApi.vendorAction(selectedVendor.id, 'send_message', {
        subject: messageForm.subject.trim(),
        message: messageForm.message.trim(),
      })) as {
        message?: string;
        emailSent?: boolean;
        emailTo?: string;
      };

      setIsMessageModalOpen(false);
      const base =
        typeof res?.message === 'string' && res.message.trim()
          ? res.message
          : `Message saved for "${selectedVendor.name}".`;
      if (res?.emailSent === true) {
        sonnerToast.success(
          res.emailTo ? `${base} Email sent to ${res.emailTo}.` : `${base} Email sent.`,
        );
      } else if (res?.emailSent === false) {
        sonnerToast.warning(
          `${base}${res.emailTo ? ` Email could not be sent (saved on record). Intended: ${res.emailTo}.` : ' Email could not be sent (saved on record).'}`,
          { duration: 6000 },
        );
      } else {
        sonnerToast.success(base);
      }
      setMessageForm({ subject: '', message: '' });
      await loadVendors();
    } catch (error: any) {
      console.error('Failed to send message:', error);
      sonnerToast.error(error.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedVendor) return;

    const vendorId = selectedVendor.id;
    const vendorName = selectedVendor.name;
    const keepDetail = isViewDetailsOpen;

    try {
      setIsLoading(true);
      if (suspendIsReactivate) {
        await vendorApi.updateVendor(vendorId, {
          status: 'active',
          metadata: {
            unsuspendedAt: new Date().toISOString(),
            unsuspendNote: suspendReason.trim() || undefined,
          },
        });
        await loadVendors();
        setIsSuspendDialogOpen(false);
        setSuspendIsReactivate(false);
        sonnerToast.success(`"${vendorName}" is active again.`);
      } else {
        await vendorApi.updateVendor(vendorId, {
          status: 'suspended',
          metadata: {
            suspendReason: suspendReason,
            suspendedAt: new Date().toISOString(),
          },
        });
        await loadVendors();
        setIsSuspendDialogOpen(false);
        sonnerToast.success(`Vendor suspended. "${vendorName}" no longer receives new orders.`);
      }
      setSuspendReason('');
      if (keepDetail) {
        await syncSelectedVendorAfterMutation(vendorId);
      } else {
        setSelectedVendor(null);
      }
    } catch (error: any) {
      console.error('Failed to update vendor status:', error);
      sonnerToast.error(error.message || 'Failed to update vendor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateVendor = async () => {
    if (!selectedVendor) return;
    const vendorId = selectedVendor.id;
    const vendorName = selectedVendor.name;
    const keepDetail = isViewDetailsOpen;
    try {
      setIsLoading(true);
      await vendorApi.updateVendor(vendorId, {
        status: 'active',
        metadata: {
          reactivatedAt: new Date().toISOString(),
        },
      });
      await loadVendors();
      setIsActivateDialogOpen(false);
      sonnerToast.success(`"${vendorName}" has been activated.`);
      if (keepDetail) {
        await syncSelectedVendorAfterMutation(vendorId);
      } else {
        setSelectedVendor(null);
      }
    } catch (error: any) {
      console.error('Failed to activate vendor:', error);
      sonnerToast.error(error.message || 'Failed to activate vendor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedVendor) return;
    const vendorId = selectedVendor.id;
    const vendorName = selectedVendor.name;
    const keepDetail = isViewDetailsOpen;

    try {
      setIsLoading(true);
      await vendorApi.updateVendor(vendorId, { 
        status: 'inactive',
        metadata: {
          deactivateReason: deactivateReason,
          deactivatedAt: new Date().toISOString()
        }
      });
      
      await loadVendors();
      setIsDeactivateDialogOpen(false);
      sonnerToast.success(`Vendor deactivated. "${vendorName}" is now inactive.`);
      setDeactivateReason('');
      if (keepDetail) {
        await syncSelectedVendorAfterMutation(vendorId);
      } else {
        setSelectedVendor(null);
      }
    } catch (error: any) {
      console.error('Failed to deactivate vendor:', error);
      sonnerToast.error(error.message || 'Failed to deactivate vendor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedVendor || deleteConfirmation !== selectedVendor.name || !deleteReason.trim()) {
      return;
    }
    
    try {
      setIsLoading(true);
      const vendorId = selectedVendor.id;
      const vendorName = selectedVendor.name;
      
      // Try DELETE first, but expect it might not be available (404)
      let deleteSuccessful = false;
      try {
        await vendorApi.deleteVendor(vendorId);
        deleteSuccessful = true;
        sonnerToast.success(`Vendor "${vendorName}" deleted successfully`);
        // Immediately remove from local state to provide instant feedback
        setVendors(prev => prev.filter(v => v.id !== vendorId));
      } catch (deleteError: any) {
        // Check error status - the API now includes status in the error object
        const errorStatus = deleteError.status || (deleteError.message?.includes('404') ? 404 : deleteError.message?.includes('405') ? 405 : null);
        const errorMessage = deleteError.message || '';
        
        // If DELETE endpoint doesn't exist (404) or method not allowed (405), use PATCH for soft delete
        if (errorStatus === 404 || errorStatus === 405 || errorMessage.includes('404') || errorMessage.includes('405') || errorMessage.includes('Method not allowed')) {
          console.log('DELETE endpoint not available (404/405), using PATCH to mark vendor as deleted');
          try {
            await vendorApi.updateVendor(vendorId, {
              status: 'inactive',
              metadata: {
                deleted: true,
                deletedAt: new Date().toISOString(),
                deleteReason: deleteReason
              }
            });
            deleteSuccessful = true;
            sonnerToast.success(`Vendor "${vendorName}" deleted successfully`);
            
            // Immediately remove from local state to provide instant feedback
            setVendors(prev => prev.filter(v => v.id !== vendorId));
          } catch (updateError: any) {
            console.error('Failed to update vendor status:', updateError);
            throw new Error(updateError.message || 'Failed to delete vendor. Please try again.');
          }
        } else {
          // For other errors, re-throw to be handled by outer catch
          throw deleteError;
        }
      }
      
      // Only proceed with cleanup if delete was successful
      if (deleteSuccessful) {
        // Reload vendors list to ensure consistency with backend
        await loadVendors();
        setIsDeleteDialogOpen(false);
        setIsViewDetailsOpen(false);
        setSelectedVendor(null);
        setDeleteConfirmation('');
        setDeleteReason('');
      }
    } catch (error: any) {
      console.error('Failed to delete vendor:', error);
      const errorMsg = error.message || error.toString() || 'Failed to delete vendor';
      
      // Provide user-friendly error messages
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        sonnerToast.error('You are not authorized to delete vendors. Please contact your administrator.');
      } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
        sonnerToast.error('You do not have permission to delete vendors.');
      } else if (errorMsg.includes('500') || errorMsg.includes('Internal Server Error')) {
        sonnerToast.error('Server error occurred. Please try again later.');
      } else {
        sonnerToast.error(`Failed to delete vendor: ${errorMsg}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for AddVendorModal (submits to real POST /vendor/vendors)
  const handleAddVendorSubmit = async (payload: VendorCreatePayload) => {
    try {
      setIsLoading(true);

      await vendorApi.createVendor(payload);

      await loadVendors();

      setIsAddModalOpen(false);
      sonnerToast.success(`Vendor "${payload.vendorName}" added successfully!`);
    } catch (error: any) {
      console.error('Failed to create vendor:', error);
      const errorMessage = error.message || 'Failed to create vendor';
      sonnerToast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    // Exclude deleted vendors from the list (should already be filtered in loadVendors, but double-check)
    // This is a safety check in case any deleted vendors slip through
    
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || 
      vendor.name.toLowerCase().includes(q) ||
      vendor.id.toLowerCase().includes(q) ||
      (vendor.code && vendor.code.toLowerCase().includes(q)) ||
      vendor.email.toLowerCase().includes(q) ||
      vendor.phone.toLowerCase().includes(q);
    
    const matchesStatus = statusFilter === 'All Status' || vendor.status === statusFilter;
    const matchesCategory = categoryFilter === 'All Categories' || vendor.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleDownloadReport = () => {
    try {
      const headers = ['Vendor ID', 'Name', 'Category', 'Phone', 'Email', 'Address', 'Compliance', 'Status'];
      const rows = filteredVendors.map((v) => [
        v.code || v.id,
        v.name,
        v.category,
        v.phone,
        v.email,
        v.address,
        v.complianceStatus,
        v.status,
      ]);

      const csvContent =
        [headers, ...rows]
          .map((row) =>
            row
              .map((cell) => {
                const safe = String(cell ?? '').replace(/"/g, '""');
                return `"${safe}"`;
              })
              .join(','),
          )
          .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vendor-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      sonnerToast.success('Vendor report downloaded');
    } catch (error) {
      sonnerToast.error('Failed to download vendor report');
      // eslint-disable-next-line no-console
      console.error('Download report error:', error);
    }
  };

  const handleBulkImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadImportTemplate = () => {
    const csv = `${VENDOR_BULK_IMPORT_CSV_HEADER}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendor-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    sonnerToast.success('Template downloaded (UTF-8 CSV)');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv') {
      sonnerToast.error('Use a UTF-8 .csv file. Export from Excel as “CSV UTF-8 (comma delimited)” if needed.');
      return;
    }

    setIsBulkImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsvRows(text);
      if (rows.length < 2) {
        sonnerToast.error('CSV must include a header row and at least one data row.');
        return;
      }

      const headerKeys = mapCsvHeaderToKeys(rows[0]);

      const required: (keyof FlatVendorCsvRow)[] = [
        'vendorCode',
        'vendorName',
        'gstin',
        'paymentTerms',
        'currencyCode',
        'line1',
        'city',
        'state',
        'country',
        'zipCode',
        'contactName',
        'contactPhone',
        'contactEmail',
      ];
      const present = new Set(headerKeys.filter(Boolean) as (keyof FlatVendorCsvRow)[]);
      const missing = required.filter((k) => !present.has(k));
      if (missing.length) {
        sonnerToast.error(`CSV is missing required columns: ${missing.join(', ')}`);
        return;
      }

      let created = 0;
      let failed = 0;
      const failures: string[] = [];

      for (let r = 1; r < rows.length; r++) {
        const flat = cellsToFlatRow(headerKeys, rows[r]);
        if (
          !flat.vendorCode.trim() &&
          !flat.vendorName.trim() &&
          !flat.gstin.trim() &&
          !flat.contactEmail.trim()
        ) {
          continue;
        }
        const payloadOrErr = flatRowToCreatePayload(flat);
        if ('error' in payloadOrErr) {
          failed++;
          failures.push(payloadOrErr.error);
          continue;
        }
        try {
          await vendorApi.createVendor(payloadOrErr);
          created++;
        } catch (err: any) {
          failed++;
          const msg = err?.message || String(err);
          failures.push(`${flat.vendorCode || `row ${r + 1}`}: ${msg}`);
        }
      }

      await loadVendors();

      if (created) {
        sonnerToast.success(`Imported ${created} vendor(s)${failed ? `, ${failed} failed` : ''}.`);
      } else {
        sonnerToast.error('No vendors were created.');
      }
      if (failures.length) {
        sonnerToast.error(failures.slice(0, 5).join(' | '), { duration: 8000 });
        if (failures.length > 5) {
          sonnerToast.warning(`${failures.length - 5} more error(s) logged in the console.`);
          // eslint-disable-next-line no-console
          console.error('Bulk import errors', failures);
        }
      }
    } catch (err: any) {
      sonnerToast.error(err?.message || 'Failed to read or import CSV.');
    } finally {
      setIsBulkImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[500] animate-slide-in">
          <div className={`min-w-[400px] px-6 py-4 rounded-lg shadow-2xl flex items-start gap-3 ${
            toast.type === 'success' ? 'bg-[#10B981] text-white' :
            toast.type === 'warning' ? 'bg-[#F59E0B] text-[#1F2937]' :
            'bg-[#EF4444] text-white'
          }`}>
            <div className="flex-1">
              <p className="font-medium">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="hover:opacity-80">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Breadcrumb + title / actions */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="min-w-0">
          <nav className="mb-2" aria-label="Breadcrumb">
            <ol className="m-0 flex list-none flex-wrap items-center gap-x-1 gap-y-1 p-0 text-sm text-[#6B7280]">
              <li className="min-w-0">
                {onNavigateTab ? (
                  <button
                    type="button"
                    className="max-w-full truncate rounded px-0.5 text-left font-medium text-[#6B7280] transition-colors hover:text-[#4F46E5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2"
                    onClick={goToVendorOverview}
                  >
                    Vendor Overview
                  </button>
                ) : (
                  <span className="font-medium text-[#6B7280]">Vendor Overview</span>
                )}
              </li>
              <VendorListBreadcrumbSeparator />
              {isViewDetailsOpen && selectedVendor ? (
                <>
                  <li className="min-w-0">
                    <button
                      type="button"
                      className="max-w-full truncate rounded px-0.5 text-left font-medium text-[#6B7280] transition-colors hover:text-[#4F46E5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2"
                      onClick={goToVendorListRoot}
                    >
                      Vendor List
                    </button>
                  </li>
                  <VendorListBreadcrumbSeparator />
                  <li className="min-w-0">
                    <span
                      className="block truncate font-semibold text-[#1F2937]"
                      title={selectedVendor.name}
                      aria-current="page"
                    >
                      {selectedVendor.name}
                    </span>
                  </li>
                </>
              ) : (
                <li className="min-w-0">
                  <span className="font-semibold text-[#1F2937]" aria-current="page">
                    Vendor List
                  </span>
                </li>
              )}
            </ol>
          </nav>
          {!isViewDetailsOpen && (
            <>
              <h1 className="text-2xl font-bold text-[#1F2937]">Vendor List</h1>
              <p className="text-sm text-[#6B7280] mt-1">Manage all vendors and suppliers</p>
            </>
          )}
        </div>
        {!isViewDetailsOpen && (
          <div className="flex flex-wrap gap-3 justify-end">
            <button
              type="button"
              onClick={handleDownloadImportTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] font-medium rounded-lg hover:bg-[#F3F4F6]"
            >
              <FileText size={16} />
              CSV template
            </button>
            <button
              type="button"
              onClick={handleBulkImportClick}
              disabled={isBulkImporting || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] font-medium rounded-lg hover:bg-[#F3F4F6] disabled:opacity-50"
            >
              {isBulkImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {isBulkImporting ? 'Importing…' : 'Bulk import CSV'}
            </button>
            <button
              type="button"
              onClick={handleDownloadReport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] font-medium rounded-lg hover:bg-[#F3F4F6]"
            >
              <Download size={16} />
              Download Report
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#4338CA]"
            >
              <span className="text-lg">+</span>
              Add Vendor
            </button>
          </div>
        )}
      </div>

      {isViewDetailsOpen && selectedVendor ? (
        <VendorProfile
          variant="inline"
          vendor={selectedVendor}
          onClose={() => {
            setIsViewDetailsOpen(false);
            setSelectedVendor(null);
          }}
          onEdit={() => handleActionClick('edit', selectedVendor)}
          onMessage={() => handleActionClick('message', selectedVendor)}
          onViewDocs={() => handleActionClick('documents', selectedVendor)}
          onSuspend={() => handleActionClick('suspend', selectedVendor)}
          onUnsuspend={() => handleActionClick('unsuspend', selectedVendor)}
          onDeactivate={() => handleActionClick('deactivate', selectedVendor)}
          onActivate={() => handleActionClick('activate', selectedVendor)}
          onReport={() => handleActionClick('performance', selectedVendor)}
        />
      ) : null}

      {/* Search & Filters + table (hidden while viewing vendor details inline) */}
      {!isViewDetailsOpen && (
        <>
      <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6B7280]" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vendor name, ID, phone, email..."
                className="w-full pl-10 pr-4 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>
          
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
            <option>Suspended</option>
            <option>Under Review</option>
          </select>

          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
          >
            <option>All Categories</option>
            <option>Vegetables</option>
            <option>Fruits</option>
            <option>Spices</option>
            <option>Dairy / Perishables</option>
            <option>Packaged Goods</option>
            <option>Fresh Produce</option>
            <option>Packaging</option>
          </select>

          {(searchQuery || statusFilter !== 'All Status' || categoryFilter !== 'All Categories') && (
            <button 
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('All Status');
                setCategoryFilter('All Categories');
              }}
              className="text-sm text-[#4F46E5] hover:underline font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-[#6B7280]">
        {isLoading && isInitialLoad ? (
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span>Loading vendors...</span>
          </div>
        ) : (
          `Showing ${filteredVendors.length} of ${vendors.length} vendors`
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        {isLoading && isInitialLoad ? (
          <div className="py-20 text-center">
            <Loader2 size={48} className="mx-auto mb-4 text-[#4F46E5] animate-spin" />
            <p className="text-[#6B7280]">Loading vendors...</p>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="font-bold text-[#1F2937] mb-2">No vendors found</h3>
            <p className="text-[#6B7280] text-sm mb-6">
              {searchQuery || statusFilter !== 'All Status' || categoryFilter !== 'All Categories'
                ? 'Try adjusting your filters'
                : vendors.length === 0 
                  ? 'Ready to add your first vendor?'
                  : 'No vendors match your filters'}
            </p>
            {!searchQuery && statusFilter === 'All Status' && categoryFilter === 'All Categories' && vendors.length === 0 && (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="px-6 py-2 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#4338CA]"
              >
                + Add Vendor
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] text-[#6B7280] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-3 text-left">Vendor ID</th>
                  <th className="px-6 py-3 text-left">Vendor Name</th>
                  <th className="px-6 py-3 text-left">Category</th>
                  <th className="px-6 py-3 text-left">Phone No.</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Address</th>
                  <th className="px-6 py-3 text-left">Compliance</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-[#F3F4F6] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-[#6B7280]">{vendor.code || vendor.id}</td>
                    <td className="px-6 py-4 font-semibold text-[#1F2937]">{vendor.name}</td>
                    <td className="px-6 py-4 text-[#6B7280]">{vendor.category}</td>
                    <td className="px-6 py-4 text-[#1F2937]">{vendor.phone}</td>
                    <td className="px-6 py-4">
                      <a href={`mailto:${vendor.email}`} className="text-[#4F46E5] hover:underline">
                        {vendor.email}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-[#6B7280] max-w-[200px] truncate" title={vendor.address}>
                      {vendor.address}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        vendor.complianceStatus === 'Compliant' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        vendor.complianceStatus === 'Pending' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        'bg-[#FEE2E2] text-[#7F1D1D]'
                      }`}>
                        {vendor.complianceStatus === 'Compliant' && '✓'}
                        {vendor.complianceStatus === 'Pending' && '⚠'}
                        {vendor.complianceStatus === 'Non-Compliant' && '✕'}
                        {vendor.complianceStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        vendor.status === 'Active' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        vendor.status === 'Inactive' ? 'bg-[#FEE2E2] text-[#7F1D1D]' :
                        vendor.status === 'Suspended' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        'bg-[#EDE9FE] text-[#5B21B6]'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        aria-expanded={actionMenu?.vendorId === vendor.id}
                        aria-haspopup="menu"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (actionMenu?.vendorId === vendor.id) closeActionMenu();
                          else openActionMenuForVendor(vendor.id, e.currentTarget);
                        }}
                        className="p-1 hover:bg-[#F3F4F6] rounded inline-flex"
                      >
                        <MoreVertical size={18} className="text-[#6B7280]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {actionMenu &&
        typeof document !== 'undefined' &&
        (() => {
          const menuVendor = vendors.find((v) => v.id === actionMenu.vendorId);
          if (!menuVendor) return null;
          return createPortal(
            <div
              ref={actionMenuPanelRef}
              className="fixed z-[300] w-56 overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-xl"
              style={{
                left: actionMenu.left,
                maxHeight: actionMenu.maxHeight,
                ...(actionMenu.top != null ? { top: actionMenu.top } : {}),
                ...(actionMenu.bottom != null ? { bottom: actionMenu.bottom } : {}),
              }}
              role="menu"
            >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleActionClick('view', menuVendor)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#4F46E5] hover:bg-[#F3F4F6]"
                >
                  <Eye size={14} /> View Details
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleActionClick('edit', menuVendor)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#4F46E5] hover:bg-[#F3F4F6]"
                >
                  <Edit size={14} /> Edit Vendor
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleActionClick('documents', menuVendor)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#1F2937] hover:bg-[#F3F4F6]"
                >
                  <FileText size={14} /> View Documents
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleActionClick('message', menuVendor)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#1F2937] hover:bg-[#F3F4F6]"
                >
                  <MessageSquare size={14} /> Send Message
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleActionClick('performance', menuVendor)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#1F2937] hover:bg-[#F3F4F6]"
                >
                  <BarChart3 size={14} /> Performance Report
                </button>
                <div className="my-1 border-t border-[#E5E7EB]" />
                {menuVendor.status === 'Suspended' ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleActionClick('unsuspend', menuVendor)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#065F46] hover:bg-[#D1FAE5]"
                  >
                    <PlayCircle size={14} /> Lift Suspension
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleActionClick('suspend', menuVendor)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#92400E] hover:bg-[#FEF3C7]"
                  >
                    <Pause size={14} /> Suspend
                  </button>
                )}
                {menuVendor.status === 'Inactive' ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleActionClick('activate', menuVendor)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#065F46] hover:bg-[#D1FAE5]"
                  >
                    <CheckCircle size={14} /> Activate
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleActionClick('deactivate', menuVendor)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#EF4444] hover:bg-[#FEE2E2]"
                  >
                    <XCircle size={14} /> Deactivate
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleActionClick('delete', menuVendor)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#EF4444] hover:bg-[#FEE2E2]"
                >
                  <Trash2 size={14} /> Delete
                </button>
            </div>,
            document.body,
          );
        })()}

      {/* View Documents Modal */}
      {isDocumentsModalOpen && selectedVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[400] p-4" onClick={() => setIsDocumentsModalOpen(false)}>
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#E5E7EB]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1F2937]">Vendor Documents</h2>
                  <p className="text-sm text-[#6B7280] mt-1">{selectedVendor.name}</p>
                </div>
                <button 
                  onClick={() => setIsDocumentsModalOpen(false)}
                  className="text-[#6B7280] hover:text-[#1F2937] p-1 hover:bg-[#F3F4F6] rounded"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex gap-2 border-b border-[#E5E7EB]">
                {(['verified', 'pending', 'rejected', 'upload'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDocumentTab(tab)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      documentTab === tab
                        ? 'border-[#4F46E5] text-[#4F46E5]'
                        : 'border-transparent text-[#6B7280] hover:text-[#1F2937]'
                    }`}
                  >
                    {tab === 'verified' && '✓ Verified'}
                    {tab === 'pending' && '⚠ Pending'}
                    {tab === 'rejected' && '✕ Rejected'}
                    {tab === 'upload' && '📤 Upload New'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {documentTab === 'verified' && (
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto text-[#9CA3AF] mb-3" />
                  <p className="text-[#6B7280]">No verified documents</p>
                  <p className="text-xs text-[#9CA3AF] mt-2 max-w-sm mx-auto">
                    Document lists are not loaded from the database for this screen yet.
                  </p>
                </div>
              )}

              {documentTab === 'pending' && (
                <div className="text-center py-12">
                  <AlertTriangle size={48} className="mx-auto text-[#F59E0B] mb-3" />
                  <p className="text-[#6B7280]">No pending documents</p>
                </div>
              )}

              {documentTab === 'rejected' && (
                <div className="text-center py-12">
                  <XCircle size={48} className="mx-auto text-[#EF4444] mb-3" />
                  <p className="text-[#6B7280]">No rejected documents</p>
                </div>
              )}

              {documentTab === 'upload' && (
                <div className="text-center py-12">
                  <Upload size={48} className="mx-auto text-[#9CA3AF] mb-3" />
                  <p className="text-[#6B7280]">Document upload is not available here</p>
                  <p className="text-xs text-[#9CA3AF] mt-2 max-w-sm mx-auto">
                    There is no document-storage API wired to this list view. Use a dedicated compliance or files module when it exists.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-end">
              <button
                onClick={() => setIsDocumentsModalOpen(false)}
                className="px-6 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:bg-[#4338CA]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {isMessageModalOpen && selectedVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[400] p-4" onClick={() => setIsMessageModalOpen(false)}>
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#E5E7EB]">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-[#1F2937]">Send Message</h2>
                  <p className="text-sm text-[#6B7280] mt-1">To: {selectedVendor.name}</p>
                </div>
                <button 
                  onClick={() => setIsMessageModalOpen(false)}
                  className="text-[#6B7280] hover:text-[#1F2937] p-1 hover:bg-[#F3F4F6] rounded"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSendMessage} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#1F2937] mb-2">
                  Subject <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={messageForm.subject}
                  onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                  placeholder="Enter subject"
                  className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#1F2937] mb-2">
                  Message <span className="text-[#EF4444]">*</span>
                </label>
                <textarea
                  value={messageForm.message}
                  onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                  placeholder="Type your message here..."
                  rows={5}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  required
                />
                <div className="text-xs text-[#6B7280] text-right mt-1">{messageForm.message.length}/1000 characters</div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsMessageModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-[#D1D5DB] rounded-lg text-sm font-bold text-[#1F2937] hover:bg-[#F3F4F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:bg-[#4338CA] flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend / lift suspension confirmation */}
      {isSuspendDialogOpen && selectedVendor && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[400] p-4"
          onClick={() => {
            setIsSuspendDialogOpen(false);
            setSuspendIsReactivate(false);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  suspendIsReactivate ? 'bg-[#D1FAE5]' : 'bg-[#FEF3C7]'
                }`}
              >
                {suspendIsReactivate ? (
                  <PlayCircle size={24} className="text-[#059669]" />
                ) : (
                  <Pause size={24} className="text-[#F59E0B]" />
                )}
              </div>
              <h3 className="text-lg font-bold text-[#1F2937] mb-2">
                {suspendIsReactivate ? 'Lift Suspension?' : 'Suspend vendor?'}
              </h3>
              <p className="text-sm text-[#6B7280] mb-4">
                {suspendIsReactivate ? (
                  <>
                    Restore <span className="font-bold text-[#1F2937]">"{selectedVendor.name}"</span> to active
                    status?
                  </>
                ) : (
                  <>
                    Suspend <span className="font-bold text-[#1F2937]">"{selectedVendor.name}"</span>?
                  </>
                )}
              </p>
            </div>

            {!suspendIsReactivate ? (
              <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-lg p-3 mb-4 text-sm text-[#92400E]">
                <p className="font-medium mb-2">Suspended vendors will:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Not receive new orders</li>
                  <li>• Keep existing orders active</li>
                  <li>• Suspension can be lifted anytime</li>
                </ul>
              </div>
            ) : (
              <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg p-3 mb-4 text-sm text-[#065F46]">
                <p className="text-xs">The vendor will return to active status and can receive new orders again.</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-bold text-[#1F2937] mb-2">Note (optional)</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder={
                  suspendIsReactivate ? 'Optional note when lifting suspension…' : 'Reason for suspension…'
                }
                rows={2}
                className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsSuspendDialogOpen(false);
                  setSuspendIsReactivate(false);
                }}
                className="flex-1 px-4 py-2 border border-[#D1D5DB] rounded-lg text-sm font-bold text-[#1F2937] hover:bg-[#F3F4F6]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSuspend}
                className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-bold ${
                  suspendIsReactivate
                    ? 'bg-[#059669] hover:bg-[#047857]'
                    : 'bg-[#F59E0B] hover:bg-[#D97706]'
                }`}
              >
                {suspendIsReactivate ? 'Lift Suspension' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Dialog */}
      {isDeactivateDialogOpen && selectedVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[400] p-4" onClick={() => setIsDeactivateDialogOpen(false)}>
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-[#FEE2E2] rounded-full flex items-center justify-center mx-auto mb-3">
                <XCircle size={24} className="text-[#F97316]" />
              </div>
              <h3 className="text-lg font-bold text-[#1F2937] mb-2">Deactivate Vendor?</h3>
              <p className="text-sm text-[#6B7280] mb-4">
                Are you sure you want to deactivate <span className="font-bold text-[#1F2937]">"{selectedVendor.name}"</span>?
              </p>
            </div>

            <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-lg p-3 mb-4 text-sm text-[#7F1D1D]">
              <p className="font-medium mb-2">Deactivated vendors:</p>
              <ul className="space-y-1 text-xs">
                <li>• Will not receive new orders</li>
                <li>• Existing orders paused</li>
                <li>• Can be reactivated anytime</li>
              </ul>
              <p className="text-xs mt-2 pt-2 border-t border-[#FECACA]">
                Note: This is a soft deactivate. To permanently delete, use Delete option.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-[#1F2937] mb-2">
                Reason (optional)
              </label>
              <textarea
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder="Enter reason for deactivation..."
                rows={2}
                className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeactivateDialogOpen(false)}
                className="flex-1 px-4 py-2 border border-[#D1D5DB] rounded-lg text-sm font-bold text-[#1F2937] hover:bg-[#F3F4F6]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                className="flex-1 px-4 py-2 bg-[#F97316] text-white rounded-lg text-sm font-bold hover:bg-[#EA580C]"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activate Confirmation Dialog */}
      {isActivateDialogOpen && selectedVendor && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsActivateDialogOpen(false)}
          role="presentation"
        >
          <div
            className="relative z-[401] w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="activate-vendor-title"
          >
            <div className="flex flex-col gap-8">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle size={24} className="text-emerald-600" aria-hidden />
                </div>
                <h3 id="activate-vendor-title" className="mb-2 text-lg font-bold text-gray-800">
                  Activate vendor?
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  Set <span className="font-bold text-gray-900">"{selectedVendor.name}"</span> back to active?
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setIsActivateDialogOpen(false)}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleActivateVendor}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  Activate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && selectedVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[400] p-4" onClick={() => setIsDeleteDialogOpen(false)}>
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-[#FEE2E2] rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={24} className="text-[#EF4444]" />
              </div>
              <h3 className="text-lg font-bold text-[#1F2937] mb-2">Delete Vendor?</h3>
              
              <div className="bg-[#FEE2E2] border-2 border-[#EF4444] rounded-lg p-3 mb-4 text-sm text-[#7F1D1D]">
                <p className="font-bold text-[#EF4444] mb-2">⚠️ DANGER: This action is PERMANENT and CANNOT be undone!</p>
              </div>

              <p className="text-sm text-[#6B7280] mb-4">
                You are about to delete: <span className="font-bold text-[#1F2937]">"{selectedVendor.name}"</span> ({selectedVendor.id})
              </p>
            </div>

            <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-lg p-3 mb-4 text-sm text-[#7F1D1D]">
              <p className="font-medium mb-2">This will:</p>
              <ul className="space-y-1 text-xs">
                <li>✕ Permanently remove all data</li>
                <li>✕ Delete all associated orders</li>
                <li>✕ Remove all documents</li>
                <li>✕ Cannot be recovered</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-[#1F2937] mb-2">
                Type vendor name to confirm <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={`Type: ${selectedVendor.name}`}
                className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]"
              />
              {deleteConfirmation && deleteConfirmation !== selectedVendor.name && (
                <p className="text-xs text-[#EF4444] mt-1">Name does not match</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-[#1F2937] mb-2">
                Reason for deletion <span className="text-[#EF4444]">*</span>
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter reason for deletion..."
                rows={2}
                className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="flex-1 px-4 py-2 border border-[#D1D5DB] rounded-lg text-sm font-bold text-[#1F2937] hover:bg-[#F3F4F6]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmation !== selectedVendor.name || !deleteReason.trim()}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  deleteConfirmation === selectedVendor.name && deleteReason.trim()
                    ? 'bg-[#EF4444] text-white hover:bg-[#DC2626]'
                    : 'bg-[#D1D5DB] text-[#9CA3AF] cursor-not-allowed'
                }`}
              >
                PERMANENTLY DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {isAddModalOpen && (
        <AddVendorModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddVendorSubmit}
        />
      )}

      {isEditModalOpen && selectedVendor && (
        <AddVendorModal
          mode="edit"
          isOpen={isEditModalOpen}
          editVendorId={selectedVendor.id}
          initialPayload={editModalPayload}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditModalPayload(null);
            if (!isViewDetailsOpen) {
              setSelectedVendor(null);
            }
          }}
          onEditSubmit={handleEditVendorSubmit}
        />
      )}

      {/* Performance Report Modal */}
      {isPerformanceReportOpen && selectedVendor && (
        <PerformanceReportModal
          vendor={selectedVendor}
          onClose={() => setIsPerformanceReportOpen(false)}
        />
      )}

      {/* Hidden File Input for Bulk Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}