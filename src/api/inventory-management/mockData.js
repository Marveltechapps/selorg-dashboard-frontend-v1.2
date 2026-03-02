/**
 * Inventory Management mock data – used when API is unavailable or returns empty.
 */

export const MOCK_SCAN_ITEM = (sku) => ({
  success: true,
  item: {
    sku: sku || 'SKU-101',
    name: 'Organic Milk 1L',
    location: 'A-01-02',
    current_stock: 24,
    product_name: 'Organic Milk 1L',
  },
  product_name: 'Organic Milk 1L',
  location: 'A-01-02',
  stock: 24,
});

export const MOCK_SHELF_VIEW = {
  success: true,
  alerts: { empty_shelves: 1, misplaced_items: 0, damaged_goods_reports: 0 },
  empty_shelves: 1,
  misplaced_shelves: 0,
  aisles: [
    { aisle: 'A', shelves: [
      { location_code: 'A-01-01', shelf_number: 1, is_critical: false, is_misplaced: false, assigned_skus: [{ sku: 'SKU-101', product_name: 'Organic Milk 1L', stock_count: 24 }] },
      { location_code: 'A-01-02', shelf_number: 2, is_critical: false, is_misplaced: false, assigned_skus: [{ sku: 'SKU-102', product_name: 'Whole Wheat Bread', stock_count: 18 }] },
      { location_code: 'A-01-03', shelf_number: 3, is_critical: false, is_misplaced: false, assigned_skus: [{ sku: 'SKU-106', product_name: 'Oats 500g', stock_count: 20 }] },
    ]},
    { aisle: 'B', shelves: [
      { location_code: 'B-01-01', shelf_number: 1, is_critical: true, is_misplaced: false, assigned_skus: [{ sku: 'SKU-103', product_name: 'Greek Yogurt 500g', stock_count: 12 }] },
      { location_code: 'B-01-02', shelf_number: 2, is_critical: false, is_misplaced: false, assigned_skus: [{ sku: 'SKU-107', product_name: 'Cheese 200g', stock_count: 14 }] },
    ]},
    { aisle: 'C', shelves: [
      { location_code: 'C-01-01', shelf_number: 1, is_critical: false, is_misplaced: true, assigned_skus: [{ sku: 'SKU-104', product_name: 'Free Range Eggs 12pk', stock_count: 30 }] },
      { location_code: 'C-01-02', shelf_number: 2, is_critical: false, is_misplaced: false, assigned_skus: [{ sku: 'SKU-105', product_name: 'Butter 200g', stock_count: 15 }] },
    ]},
    { aisle: 'D', shelves: [
      { location_code: 'D-01-01', shelf_number: 1, is_critical: false, is_misplaced: false, assigned_skus: [{ sku: 'SKU-108', product_name: 'Juice 1L', stock_count: 22 }] },
      { location_code: 'D-01-02', shelf_number: 2, is_critical: false, is_misplaced: false, assigned_skus: [{ sku: 'SKU-109', product_name: 'Water 500ml', stock_count: 40 }] },
    ]},
    { aisle: 'E', shelves: [
      { location_code: 'E-01-01', shelf_number: 1, is_critical: false, is_misplaced: false, assigned_skus: [{ sku: 'SKU-110', product_name: 'Snacks Mix', stock_count: 16 }] },
    ]},
    { aisle: 'F', shelves: [
      { location_code: 'F-01-01', shelf_number: 1, is_critical: false, is_misplaced: false, assigned_skus: [{ sku: 'SKU-111', product_name: 'Frozen Veg 400g', stock_count: 10 }] },
      { location_code: 'F-01-02', shelf_number: 2, is_critical: false, is_misplaced: false, assigned_skus: [{ sku: 'SKU-112', product_name: 'Ice Cream 500ml', stock_count: 8 }] },
    ]},
  ],
  shelves: [
    { id: 'A-01-01', zone: 'Ambient A', aisle: 'A1', level: 1, sku: 'SKU-101', product_name: 'Organic Milk 1L', qty: 24 },
    { id: 'B-01-01', zone: 'Chiller', aisle: 'B1', level: 1, sku: 'SKU-103', product_name: 'Greek Yogurt 500g', qty: 12 },
  ],
};

export const MOCK_STOCK_LEVELS = {
  success: true,
  items: [
    { sku: 'SKU-101', name: 'Organic Milk 1L', stock: 24, location: 'A-01-02', category: 'Dairy', status: 'in_stock' },
    { sku: 'SKU-102', name: 'Whole Wheat Bread', stock: 18, location: 'A-01-02', category: 'Bakery', status: 'in_stock' },
    { sku: 'SKU-103', name: 'Greek Yogurt 500g', stock: 12, location: 'A-02-01', category: 'Dairy', status: 'low_stock' },
    { sku: 'SKU-104', name: 'Free Range Eggs 12pk', stock: 30, location: 'C-01-01', category: 'Dairy', status: 'in_stock' },
    { sku: 'SKU-105', name: 'Butter 200g', stock: 15, location: 'C-01-02', category: 'Dairy', status: 'in_stock' },
    { sku: 'SKU-106', name: 'Ice Cream 500ml', stock: 8, location: 'F-01-01', category: 'Frozen', status: 'low_stock' },
  ],
};

export const MOCK_ADJUSTMENTS = [
  { adjustment_id: 'adj-1', sku: 'SKU-101', product_name: 'Organic Milk 1L', action: 'add', quantity: 20, reason: 'Restock', user: 'Admin', created_at: new Date(Date.now() - 3600000).toISOString() },
  { adjustment_id: 'adj-2', sku: 'SKU-102', product_name: 'Whole Wheat Bread', action: 'remove', quantity: 5, reason: 'Inventory Audit', user: 'System', created_at: new Date(Date.now() - 7200000).toISOString() },
  { adjustment_id: 'adj-3', sku: 'SKU-103', product_name: 'Greek Yogurt 500g', action: 'damage', quantity: 2, reason: 'Damaged', user: 'Admin', created_at: new Date(Date.now() - 86400000).toISOString() },
];

export const MOCK_CYCLE_COUNT = {
  success: true,
  metrics: {
    daily_count_progress: { percentage: 68, items_counted: 34, items_total: 50 },
    daily_progress: 68,
    items_counted: 34,
    total_items: 50,
    accuracy_rate: 98.5,
    accuracy_rate_percentage: 98.5,
    variance_count: 3,
    variance_value: { amount: -2, items_missing: 2, items_extra: 0 },
  },
  heatmap: {
    zones: [
      { zone_id: 'Ambient A', accuracy: 92, variance_level: 'low' },
      { zone_id: 'Chiller', accuracy: 98, variance_level: 'low' },
      { zone_id: 'Frozen', accuracy: 85, variance_level: 'medium' },
      { zone_id: 'Ambient B', accuracy: 99, variance_level: 'low' },
      { zone_id: 'Prep', accuracy: 88, variance_level: 'medium' },
      { zone_id: 'Receiving', accuracy: 95, variance_level: 'low' },
    ],
  },
  variance_report: [
    { sku: 'SKU-101', product_name: 'Organic Milk 1L', expected: 24, actual: 23, counted: 23, variance: -1, difference: -1 },
    { sku: 'SKU-103', product_name: 'Greek Yogurt 500g', expected: 12, actual: 11, counted: 11, variance: -1, difference: -1 },
    { sku: 'SKU-104', product_name: 'Free Range Eggs 12pk', expected: 30, actual: 29, counted: 29, variance: -1, difference: -1 },
    { sku: 'SKU-106', product_name: 'Oats 500g', expected: 20, actual: 21, counted: 21, variance: 1, difference: 1 },
  ],
};

// Inbound / GRN / Putaway / Inter-store
export const MOCK_INBOUND_SUMMARY = {
  success: true,
  summary: {
    trucks_today: 5,
    pending_grn: 3,
    putaway_tasks: 8,
    inter_store_transfers: 2,
  },
};

const _grnItems = [
  { grn_id: 'GRN-001', truck_id: 'TRK-101', supplier: 'Fresh Farms Co.', status: 'pending', items_count: 12, created_at: new Date().toISOString() },
  { grn_id: 'GRN-002', truck_id: 'TRK-102', supplier: 'Metro Supplies Ltd.', status: 'in_progress', items_count: 8, created_at: new Date(Date.now() - 3600000).toISOString() },
  { grn_id: 'GRN-003', truck_id: 'TRK-103', supplier: 'Organic Valley Inc.', status: 'pending', items_count: 15, created_at: new Date(Date.now() - 7200000).toISOString() },
];
export const MOCK_GRN_LIST = {
  success: true,
  grn_orders: _grnItems,
  grn_list: _grnItems,
  grns: _grnItems,
};

const _putawayTasks = [
  { task_id: 'PUT-001', grn_id: 'GRN-001', sku: 'SKU-101', product_name: 'Organic Milk 1L', quantity: 50, target_location: 'A-01-01', location: 'A-01-01', status: 'pending' },
  { task_id: 'PUT-002', grn_id: 'GRN-001', sku: 'SKU-102', product_name: 'Whole Wheat Bread', quantity: 30, target_location: 'A-01-02', location: 'A-01-02', status: 'in_progress' },
  { task_id: 'PUT-003', grn_id: 'GRN-002', sku: 'SKU-104', product_name: 'Free Range Eggs 12pk', quantity: 20, target_location: 'C-01-01', location: 'C-01-01', status: 'pending' },
];
export const MOCK_PUTAWAY_TASKS = {
  success: true,
  tasks: _putawayTasks,
  putaway_tasks: _putawayTasks,
};

export const MOCK_INTER_STORE_TRANSFERS = {
  success: true,
  transfers: [
    { transfer_id: 'IST-001', from_store: 'DS-Hub-01', to_store: 'DS-Brooklyn-04', status: 'in_transit', items_count: 10, expected_at: new Date(Date.now() + 86400000).toISOString(), expected_arrival: new Date(Date.now() + 86400000).toISOString() },
    { transfer_id: 'IST-002', from_store: 'DS-Hub-02', to_store: 'DS-Brooklyn-04', status: 'pending', items_count: 5, expected_at: new Date(Date.now() + 172800000).toISOString(), expected_arrival: new Date(Date.now() + 172800000).toISOString() },
  ],
};
