/**
 * Mock data for warehouse dashboard when backend is unavailable.
 * Used as fallback in warehouseApi so UI shows data and create operations succeed.
 */

import type {
  WarehouseMetrics,
  PicklistFlow,
  GRN,
  DockSlot,
  PicklistOrder,
  PickerAssignment,
  BatchOrder,
  MultiOrderPick,
  RouteOptimization,
  StorageLocation,
  InventoryItem,
  Adjustment,
  CycleCount,
  InternalTransfer,
  StockAlert,
  WarehouseTransfer,
  QCInspection,
  TemperatureLog,
  ComplianceDoc,
  SampleTest,
  Rejection,
  Staff,
  ShiftSchedule,
  Attendance,
  Performance,
  LeaveRequest,
  Training,
  Device,
  Equipment,
  Exception,
  AccessLog,
} from './warehouseApi';

export const MOCK_WAREHOUSE_METRICS: WarehouseMetrics = {
  inboundQueue: 4,
  outboundQueue: 12,
  inventoryHealth: 98,
  criticalAlerts: 1,
  capacityUtilization: { bins: 72, coldStorage: 65, ambient: 78 },
};

export const MOCK_ORDER_FLOW: PicklistFlow[] = [
  { id: '1', orderId: 'ORD-1001', customer: 'Customer A', items: 5, priority: 'high', status: 'picking', zone: 'A' },
  { id: '2', orderId: 'ORD-1002', customer: 'Customer B', items: 3, priority: 'standard', status: 'pending', zone: 'B' },
  { id: '3', orderId: 'ORD-1003', customer: 'Customer C', items: 8, priority: 'urgent', status: 'packing', zone: 'A' },
];

export const MOCK_GRNS: GRN[] = [
  { id: 'grn-1', poNumber: 'PO-2024-001', vendor: 'Vendor Alpha', status: 'pending', timestamp: new Date().toISOString(), items: 120 },
  { id: 'grn-2', poNumber: 'PO-2024-002', vendor: 'Vendor Beta', status: 'completed', timestamp: new Date().toISOString(), items: 85 },
];

export const MOCK_DOCK_SLOTS: DockSlot[] = [
  { id: 'D1', name: 'Dock 1', status: 'active', truck: 'T-101', vendor: 'Vendor Alpha', eta: '10:30' },
  { id: 'D2', name: 'Dock 2', status: 'empty' },
  { id: 'D3', name: 'Dock 3', status: 'active', truck: 'T-102', vendor: 'Vendor Beta', eta: '11:00' },
  { id: 'D4', name: 'Dock 4', status: 'offline' },
];

export const MOCK_PICKERS: PickerAssignment[] = [
  { id: 'p1', pickerId: 'p1', pickerName: 'John', name: 'John', status: 'busy', currentOrders: 3, activeOrders: 3, completedToday: 12, pickRate: 14, zone: 'Zone A' },
  { id: 'p2', pickerId: 'p2', pickerName: 'Jane', name: 'Jane', status: 'available', currentOrders: 2, activeOrders: 2, completedToday: 8, pickRate: 11, zone: 'Zone B' },
  { id: 'p3', pickerId: 'p3', pickerName: 'Mike', name: 'Mike', status: 'available', currentOrders: 0, activeOrders: 0, completedToday: 10, pickRate: 13, zone: 'Zone A' },
];

export const MOCK_PICKLIST_ORDERS: PicklistOrder[] = [
  { id: 'pl-1', orderId: 'ORD-1001', customer: 'Customer A', items: 5, priority: 'high', status: 'picking', picker: 'John', zone: 'A' },
  { id: 'pl-2', orderId: 'ORD-1002', customer: 'Customer B', items: 3, priority: 'standard', status: 'pending', zone: 'B' },
];

export const MOCK_BATCHES: BatchOrder[] = [
  { id: 'b1', batchId: 'BATCH-001', orderCount: 5, totalItems: 24, picker: 'John', status: 'picking', progress: 60 },
];

export const MOCK_MULTI_ORDER_PICKS: MultiOrderPick[] = [
  { id: 'm1', pickId: 'PICK-001', orders: ['ORD-1001', 'ORD-1002'], sku: 'SKU-101', productName: 'Product A', location: 'A-1-2', totalQty: 10, pickedQty: 6, status: 'in-progress' },
];

export const MOCK_ROUTES: RouteOptimization[] = [
  { id: 'r1', routeId: 'ROUTE-001', picker: 'John', stops: 8, distance: '2.4 km', estimatedTime: '18 min', status: 'active', efficiency: 92 },
];

export const MOCK_STORAGE_LOCATIONS: StorageLocation[] = [
  { id: 'loc-1', aisle: 'A', rack: 1, status: 'occupied', sku: 'SKU-101', quantity: 50 },
  { id: 'loc-2', aisle: 'A', rack: 2, status: 'empty' },
  { id: 'loc-3', aisle: 'B', rack: 1, status: 'occupied', sku: 'SKU-102', quantity: 30 },
];

export const MOCK_INVENTORY_ITEMS: InventoryItem[] = [
  { id: 'inv-1', sku: 'SKU-101', productName: 'Product A', category: 'Grocery', currentStock: 120, minStock: 20, maxStock: 200, location: 'A-1-1', lastUpdated: new Date().toISOString(), value: 2400 },
  { id: 'inv-2', sku: 'SKU-102', productName: 'Product B', category: 'FMCG', currentStock: 85, minStock: 15, maxStock: 150, location: 'B-2-1', lastUpdated: new Date().toISOString(), value: 1700 },
];

export const MOCK_ADJUSTMENTS: Adjustment[] = [
  { id: 'adj-1', type: 'correction', sku: 'SKU-101', productName: 'Product A', change: 5, reason: 'Cycle count variance', user: 'Admin', timestamp: new Date().toISOString() },
];

export const MOCK_CYCLE_COUNTS: CycleCount[] = [
  { id: 'cc-1', countId: 'CC-001', zone: 'A', assignedTo: 'John', scheduledDate: new Date().toISOString().split('T')[0], status: 'scheduled', itemsTotal: 50, itemsCounted: 0, discrepancies: 0 },
];

export const MOCK_INTERNAL_TRANSFERS: InternalTransfer[] = [
  { id: 'it-1', transferId: 'IT-001', fromLocation: 'A-1', toLocation: 'B-2', sku: 'SKU-101', productName: 'Product A', quantity: 10, status: 'in-transit', initiatedBy: 'Admin', timestamp: new Date().toISOString() },
];

export const MOCK_STOCK_ALERTS: StockAlert[] = [
  { id: 'alert-1', type: 'low-stock', sku: 'SKU-103', productName: 'Product C', currentLevel: 8, threshold: 15, priority: 'high' },
];

export const MOCK_WAREHOUSE_TRANSFERS: WarehouseTransfer[] = [
  { id: 'wt-1', transferId: 'TRF-001', destination: 'WH-North', status: 'en-route', distance: '45 km', eta: '14:00', progress: 60, items: 120 },
  { id: 'wt-2', transferId: 'TRF-002', destination: 'WH-South', status: 'completed', items: 80 },
];

export const MOCK_QC_INSPECTIONS: QCInspection[] = [
  { id: 'qi-1', inspectionId: 'INS-001', batchId: 'B-001', productName: 'Product A', inspector: 'QC Team', date: new Date().toISOString().split('T')[0], status: 'passed', score: 98, itemsInspected: 50, defectsFound: 0 },
];

export const MOCK_TEMPERATURE_LOGS: TemperatureLog[] = [
  { id: 'tl-1', zone: 'Cold-1', temperature: 2, humidity: 65, timestamp: new Date().toISOString(), status: 'normal' },
  { id: 'tl-2', zone: 'Cold-2', temperature: 4, humidity: 70, timestamp: new Date().toISOString(), status: 'warning' },
];

export const MOCK_COMPLIANCE_DOCS: ComplianceDoc[] = [
  { id: 'cd-1', docId: 'DOC-001', docName: 'Food Safety Certificate', type: 'Certificate', issuedDate: '2024-01-01', expiryDate: '2025-01-01', status: 'valid' },
];

export const MOCK_SAMPLE_TESTS: SampleTest[] = [
  { id: 'st-1', sampleId: 'SMP-001', batchId: 'B-001', productName: 'Product A', testType: 'Quality', result: 'pass', testedBy: 'Lab', date: new Date().toISOString().split('T')[0] },
];

export const MOCK_REJECTIONS: Rejection[] = [
  { id: 'rj-1', batch: 'B-002', reason: 'Quality below standard', items: 5, timestamp: new Date().toISOString(), inspector: 'QC', severity: 'high' },
];

export const MOCK_STAFF: Staff[] = [
  { id: 's1', name: 'John Doe', role: 'Picker', shift: 'morning', status: 'active', productivity: 95, email: 'john@wh.com', phone: '+91 98765 43210', joinDate: '2024-01-15', hourlyRate: 250 },
  { id: 's2', name: 'Jane Smith', role: 'Packer', shift: 'afternoon', status: 'active', productivity: 92, email: 'jane@wh.com', phone: '+91 98765 43211', joinDate: '2024-02-01', hourlyRate: 240 },
];

export const MOCK_SCHEDULES: ShiftSchedule[] = [
  { id: 'sh-1', date: new Date().toISOString().split('T')[0], shift: 'morning', staffAssigned: ['John Doe', 'Jane Smith'], requiredStaff: 4, status: 'understaffed' },
];

export const MOCK_ATTENDANCE: Attendance[] = [
  { id: 'at-1', staffId: 's1', staffName: 'John Doe', date: new Date().toISOString().split('T')[0], checkIn: '09:00', checkOut: '18:00', status: 'present', hoursWorked: 9 },
];

export const MOCK_PERFORMANCE: Performance[] = [
  { id: 'pf-1', staffId: 's1', staffName: 'John Doe', role: 'Picker', weeklyTarget: 200, weeklyActual: 185, accuracy: 98, avgSpeed: 12, rating: 4.5 },
];

export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  { id: 'lr-1', staffId: 's1', staffName: 'John Doe', leaveType: 'casual', startDate: '2024-12-25', endDate: '2024-12-26', days: 2, status: 'pending', reason: 'Personal' },
];

export const MOCK_TRAININGS: Training[] = [
  { id: 'tr-1', trainingId: 'TRN-001', title: 'Safety Training', type: 'Mandatory', date: new Date().toISOString().split('T')[0], duration: '2h', instructor: 'HR', enrolled: 15, capacity: 20, status: 'scheduled' },
];

export const MOCK_DEVICES: Device[] = [
  { id: 'd1', deviceId: 'DEV-001', user: 'John', battery: 85, signal: 'strong', status: 'active' },
];

export const MOCK_EQUIPMENT: Equipment[] = [
  { id: 'eq-1', equipmentId: 'EQ-001', name: 'Forklift A', type: 'forklift', zone: 'A', operator: 'John', status: 'operational' },
  { id: 'eq-2', equipmentId: 'EQ-002', name: 'Pallet Jack 1', type: 'pallet-jack', zone: 'B', status: 'idle' },
];

export const MOCK_EXCEPTIONS: Exception[] = [
  { id: 'ex-1', priority: 'medium', category: 'inbound', title: 'Damaged carton', description: 'Carton received with damage', timestamp: new Date().toISOString(), status: 'open' },
];

export const MOCK_ACCESS_LOGS: AccessLog[] = [
  { id: 'al-1', user: 'Admin', action: 'Login', details: 'Successful login', timestamp: new Date().toISOString() },
  { id: 'al-2', user: 'John', action: 'Create GRN', details: 'GRN PO-2024-001 created', timestamp: new Date().toISOString() },
];
