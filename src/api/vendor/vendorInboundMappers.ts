/**
 * Maps vendor inbound API payloads to UI shapes used by InboundOperations.
 */

export type GRNStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Partial Receipt' | 'Archived';
export type ExceptionType = 'No Issue' | 'Short' | 'Excess' | 'Damaged' | 'Missing' | 'Quality';
export type RTVStatus = 'Open' | 'In Transit' | 'Completed' | 'Rejected';
export type RTVReason = 'Short Goods' | 'Damaged Goods' | 'Excess Goods' | 'Quality Issues' | 'Wrong Item';

export interface LineItem {
  sku: string;
  product: string;
  ordered: number;
  received: number;
  unit: string;
  status: 'Complete' | 'Short' | 'Excess' | 'Damaged';
}

export interface GRN {
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

export interface Shipment {
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

export interface InboundException {
  id: string;
  grnId: string;
  grnReference: string;
  type: ExceptionType;
  description: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt?: string;
}

export interface RTV {
  id: string;
  rtvNumber: string;
  grnReference: string;
  grnId?: string;
  reason: RTVReason;
  quantity: string;
  status: RTVStatus;
  vendor: string;
  createdDate: string;
  items: string[];
  trackingSteps?: string[];
  currentTrackingStep?: number;
}

export interface InboundOverview {
  totalGRNsToday: number;
  pendingApproval: number;
  approvedGRNs: number;
  rejectedGRNs: number;
  inTransitShipments: number;
  exceptions: number;
}

function normalizeGrnStatus(raw: unknown): GRNStatus {
  const s = String(raw ?? 'PENDING').toUpperCase().replace(/\s+/g, '_');
  if (s === 'APPROVED') return 'Approved';
  if (s === 'REJECTED') return 'Rejected';
  if (s === 'ARCHIVED') return 'Archived';
  if (s === 'PARTIAL' || s === 'PARTIAL_RECEIPT') return 'Partial Receipt';
  const lower = String(raw ?? '').toLowerCase();
  if (lower === 'approved' || lower === 'completed') return 'Approved';
  if (lower === 'rejected') return 'Rejected';
  if (lower === 'in_progress' || lower === 'partial') return 'Partial Receipt';
  if (lower === 'pending') return 'Pending Approval';
  return 'Pending Approval';
}

function normalizeExceptionType(raw: unknown): ExceptionType {
  const t = String(raw ?? '').toUpperCase();
  if (t.includes('SHORT')) return 'Short';
  if (t.includes('EXCESS')) return 'Excess';
  if (t.includes('DAMAGE')) return 'Damaged';
  if (t.includes('MISS')) return 'Missing';
  if (t.includes('QUALITY')) return 'Quality';
  if (t.includes('REJECT')) return 'Damaged';
  return 'No Issue';
}

function buildLineItemsFromLegacy(raw: Record<string, unknown>): LineItem[] {
  const qty = Number(raw.total_quantity ?? raw.received_quantity ?? 0);
  const supplier = String(raw.supplier ?? raw.vendor ?? 'Inbound');
  return [
    {
      sku: 'MIXED-SKU',
      product: `${supplier} shipment`,
      ordered: qty || 1,
      received: Number(raw.received_quantity ?? 0),
      unit: 'units',
      status: 'Complete',
    },
  ];
}

function mapLineItems(items: unknown): LineItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((it: Record<string, unknown>) => {
    const ordered = Number(it.quantity ?? it.ordered ?? 0);
    const received = Number(it.receivedQuantity ?? it.received ?? 0);
    let status: LineItem['status'] = 'Complete';
    if (received < ordered) status = 'Short';
    else if (received > ordered) status = 'Excess';
    if (String(it.status).toLowerCase() === 'damaged') status = 'Damaged';
    return {
      sku: String(it.sku ?? ''),
      product: String(it.product ?? it.name ?? it.sku ?? 'Item'),
      ordered,
      received,
      unit: String(it.unit ?? 'units'),
      status,
    };
  });
}

export function mapGrnFromApi(raw: Record<string, unknown>): GRN {
  const id = String(raw.id ?? raw._id ?? '');
  const created = raw.createdAt ?? raw.receivedAt ?? raw.date;
  const date =
    raw.date != null
      ? String(raw.date)
      : created
        ? new Date(String(created)).toLocaleDateString()
        : new Date().toLocaleDateString();

  return {
    id,
    grnNumber: String(raw.grnNumber ?? raw.grn_number ?? raw.grn_id ?? `GRN-${id.slice(-8).toUpperCase()}`),
    shipmentId: String(raw.shipmentId ?? raw.shipment_id ?? raw.truck_id ?? raw.poNumber ?? '—'),
    vendor: String(raw.vendor ?? raw.vendorName ?? raw.supplier ?? raw.vendorId ?? '—'),
    warehouse: String(raw.warehouse ?? raw.warehouseName ?? raw.store_id ?? 'Hub'),
    date,
    status: normalizeGrnStatus(raw.status),
    exceptionType: normalizeExceptionType(raw.exceptionType ?? raw.exception_type),
    exceptionDetails:
      typeof raw.exceptionDetails === 'string'
        ? raw.exceptionDetails
        : typeof raw.exception_details === 'string'
          ? raw.exception_details
          : undefined,
    lineItems: Array.isArray(raw.lineItems)
      ? (raw.lineItems as LineItem[])
      : Array.isArray(raw.items) && raw.items.length
        ? mapLineItems(raw.items)
        : buildLineItemsFromLegacy(raw),
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    qualityChecked: Boolean(raw.qualityChecked ?? raw.quality_checked),
    documentsComplete: Boolean(raw.documentsComplete ?? raw.documents_complete),
  };
}

export function mapShipmentFromApi(raw: Record<string, unknown>): Shipment {
  const id = String(raw._id ?? raw.id ?? '');
  const tracking = String(raw.trackingNumber ?? raw.shipmentId ?? '—');
  const statusRaw = String(raw.status ?? 'IN_TRANSIT').toUpperCase();
  let status: Shipment['status'] = 'In Transit';
  if (statusRaw.includes('STOP')) status = 'Stopped';
  else if (statusRaw.includes('ARRIV')) status = 'Arriving';
  else if (statusRaw.includes('ALERT')) status = 'Alert';
  const eta =
    raw.estimatedArrival != null && raw.estimatedArrival !== ''
      ? new Date(String(raw.estimatedArrival)).toLocaleString()
      : '—';
  const progress =
    typeof raw.progress === 'number' && !Number.isNaN(raw.progress)
      ? raw.progress
      : status === 'In Transit'
        ? 50
        : status === 'Arriving'
          ? 85
          : 0;
  return {
    id,
    shipmentId: tracking,
    vendor: String(raw.carrier ?? raw.vendorName ?? raw.vendor ?? '—'),
    currentLocation: String(raw.currentLocation ?? raw.location ?? '—'),
    eta,
    status,
    driver: String(raw.driver ?? '—'),
    driverPhone: String(raw.driverPhone ?? '—'),
    truckNumber: String(raw.truckNumber ?? '—'),
    progress,
    lat: typeof raw.lat === 'number' ? raw.lat : Number(raw.lat) || 0,
    lng: typeof raw.lng === 'number' ? raw.lng : Number(raw.lng) || 0,
  };
}

export function mapExceptionFromApi(raw: Record<string, unknown>): InboundException {
  const id = String(raw._id ?? raw.id ?? '');
  return {
    id,
    grnId: String(raw.grnId ?? ''),
    grnReference: String(raw.grnReference ?? raw.grnId ?? ''),
    type: normalizeExceptionType(raw.type),
    description: String(raw.description ?? ''),
    status: String(raw.status ?? 'OPEN').toUpperCase() === 'RESOLVED' ? 'RESOLVED' : 'OPEN',
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
  };
}

export function mapRtvFromApi(raw: Record<string, unknown>): RTV {
  const id = String(raw._id ?? raw.id ?? '');
  const statusRaw = String(raw.status ?? 'OPEN').toUpperCase();
  let status: RTVStatus = 'Open';
  if (statusRaw.includes('TRANSIT')) status = 'In Transit';
  else if (statusRaw.includes('COMPLET')) status = 'Completed';
  else if (statusRaw.includes('REJECT')) status = 'Rejected';
  const reasonRaw = String(raw.reason ?? 'Short Goods');
  const reason = (
    ['Short Goods', 'Damaged Goods', 'Excess Goods', 'Quality Issues', 'Wrong Item'].includes(reasonRaw)
      ? reasonRaw
      : 'Short Goods'
  ) as RTVReason;
  return {
    id,
    rtvNumber: String(raw.rtvNumber ?? `RTV-${id.slice(-8).toUpperCase()}`),
    grnReference: String(raw.grnReference ?? ''),
    grnId: raw.grnId ? String(raw.grnId) : undefined,
    reason,
    quantity: String(raw.quantity ?? ''),
    status,
    vendor: String(raw.vendor ?? '—'),
    createdDate: raw.createdAt
      ? new Date(String(raw.createdAt)).toLocaleDateString()
      : new Date().toLocaleDateString(),
    items: Array.isArray(raw.items) ? raw.items.map(String) : [],
    trackingSteps: Array.isArray(raw.trackingSteps) ? raw.trackingSteps.map(String) : undefined,
    currentTrackingStep:
      typeof raw.currentTrackingStep === 'number' ? raw.currentTrackingStep : undefined,
  };
}

export function extractList<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>;
    if (Array.isArray(r.data)) return r.data as T[];
    if (r.data && typeof r.data === 'object') {
      const nested = r.data as Record<string, unknown>;
      if (Array.isArray(nested.data)) return nested.data as T[];
    }
    if (Array.isArray(r.items)) return r.items as T[];
  }
  return [];
}

export function rtvStatusToApi(status: RTVStatus): string {
  switch (status) {
    case 'In Transit':
      return 'IN_TRANSIT';
    case 'Completed':
      return 'COMPLETED';
    case 'Rejected':
      return 'REJECTED';
    default:
      return 'OPEN';
  }
}
