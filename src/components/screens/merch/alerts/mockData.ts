import { Alert, AlertAuditLog } from './types';

const now = new Date();

export const INITIAL_ALERTS: Alert[] = [
  {
    id: '1',
    type: 'Pricing',
    title: 'Pricing Conflict Detected',
    description: "SKU 'Organic Milk' has overlapping discounts in Campaign A and Campaign B, resulting in -5% margin.",
    severity: 'critical',
    status: 'New',
    createdAt: new Date(now.getTime() - 10 * 60000).toISOString(), // 10 mins ago
    updatedAt: new Date(now.getTime() - 10 * 60000).toISOString(),
    region: 'Global',
    linkedEntities: {
      skus: ['Organic Milk'],
      campaigns: [{ id: 'A', name: 'Summer Sale' }, { id: 'B', name: 'Dairy Promo' }]
    }
  },
  {
    id: '2',
    type: 'Stock',
    title: 'Stock Shortage Warning',
    description: "Promo item 'Chocolate Bar' is below safety stock in West End Hub. Campaign may stall.",
    severity: 'warning',
    status: 'New',
    createdAt: new Date(now.getTime() - 60 * 60000).toISOString(), // 1 hour ago
    updatedAt: new Date(now.getTime() - 60 * 60000).toISOString(),
    region: 'West End',
    linkedEntities: {
      skus: ['Chocolate Bar'],
      store: 'West End Hub'
    }
  },
  {
    id: '3',
    type: 'Campaign',
    title: 'Campaign Ending Soon',
    description: "'Summer Essentials' campaign ends in 24 hours. Review performance?",
    severity: 'info',
    status: 'New',
    createdAt: new Date(now.getTime() - 120 * 60000).toISOString(), // 2 hours ago
    updatedAt: new Date(now.getTime() - 120 * 60000).toISOString(),
    region: 'Global',
    linkedEntities: {
      campaigns: [{ id: 'C', name: 'Summer Essentials' }]
    }
  },
  {
    id: '5',
    type: 'Pricing',
    title: 'Margin Threshold Exceeded',
    description: "SKU 'Premium Coffee Beans' has a combined discount of 45%, exceeding the 40% margin threshold.",
    severity: 'critical',
    status: 'In Progress',
    createdAt: new Date(now.getTime() - 30 * 60000).toISOString(), // 30 mins ago
    updatedAt: new Date(now.getTime() - 15 * 60000).toISOString(),
    region: 'North America',
    linkedEntities: {
      skus: ['Premium Coffee Beans'],
      campaigns: [{ id: 'D', name: 'Coffee Week' }, { id: 'E', name: 'Premium Discount' }]
    }
  },
  {
    id: '6',
    type: 'Stock',
    title: 'Low Stock Alert - Avocados',
    description: "Avocados (Pack of 4) is running low in Downtown Hub. Only 25 units remaining.",
    severity: 'warning',
    status: 'New',
    createdAt: new Date(now.getTime() - 90 * 60000).toISOString(), // 1.5 hours ago
    updatedAt: new Date(now.getTime() - 90 * 60000).toISOString(),
    region: 'Downtown',
    linkedEntities: {
      skus: ['Avocados (Pack of 4)'],
      store: 'Downtown Hub'
    }
  },
  {
    id: '7',
    type: 'Campaign',
    title: 'High-Performance Campaign Detected',
    description: "'Black Friday Sale' is performing 200% above forecast. Consider extending duration?",
    severity: 'info',
    status: 'New',
    createdAt: new Date(now.getTime() - 180 * 60000).toISOString(), // 3 hours ago
    updatedAt: new Date(now.getTime() - 180 * 60000).toISOString(),
    region: 'Global',
    linkedEntities: {
      campaigns: [{ id: 'F', name: 'Black Friday Sale' }]
    }
  },
  {
    id: '8',
    type: 'System',
    title: 'Payment Gateway Timeout',
    description: "Stripe payment gateway is experiencing intermittent timeouts. 3 failed transactions in last hour.",
    severity: 'warning',
    status: 'In Progress',
    createdAt: new Date(now.getTime() - 45 * 60000).toISOString(), // 45 mins ago
    updatedAt: new Date(now.getTime() - 20 * 60000).toISOString(),
    region: 'Global',
    linkedEntities: {}
  },
  {
    id: '9',
    type: 'Pricing',
    title: 'Competitor Price Change',
    description: "Competitor 'FreshMart' reduced price of 'Organic Bananas' by 15%. Review our pricing strategy?",
    severity: 'info',
    status: 'New',
    createdAt: new Date(now.getTime() - 240 * 60000).toISOString(), // 4 hours ago
    updatedAt: new Date(now.getTime() - 240 * 60000).toISOString(),
    region: 'Eastside',
    linkedEntities: {
      skus: ['Organic Bananas']
    }
  },
  {
    id: '10',
    type: 'Stock',
    title: 'Expiring Inventory Alert',
    description: "150 units of 'Fresh Yogurt' expiring in 2 days. Consider running a clearance promotion.",
    severity: 'warning',
    status: 'New',
    createdAt: new Date(now.getTime() - 200 * 60000).toISOString(), // 3.3 hours ago
    updatedAt: new Date(now.getTime() - 200 * 60000).toISOString(),
    region: 'Central Warehouse',
    linkedEntities: {
      skus: ['Fresh Yogurt'],
      store: 'Central Warehouse'
    }
  },
  {
    id: '4',
    type: 'System',
    title: 'Data Sync Delayed',
    description: "Inventory sync with SAP is delayed by 15 minutes.",
    severity: 'info',
    status: 'Resolved',
    createdAt: new Date(now.getTime() - 300 * 60000).toISOString(), // 5 hours ago
    updatedAt: new Date(now.getTime() - 30 * 60000).toISOString(),
    region: 'Global',
    linkedEntities: {}
  }
];

export const MOCK_AUDIT_LOGS: AlertAuditLog[] = [
  {
    id: '1',
    alertId: '4',
    user: 'System',
    action: 'Alert Created',
    timestamp: new Date(now.getTime() - 300 * 60000).toISOString()
  },
  {
    id: '2',
    alertId: '4',
    user: 'Jane Doe',
    action: 'Marked as Resolved',
    timestamp: new Date(now.getTime() - 30 * 60000).toISOString()
  }
];
