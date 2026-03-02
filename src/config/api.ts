/**
 * API Configuration
 * Base URL for backend API.
 * For server/hosted run: set VITE_API_BASE_URL in .env (e.g. http://65.2.153.16:5000/api/v1).
 * For local dev with proxy: leave unset to use /api/v1 (proxied by Vite).
 */
export const API_CONFIG = {
  baseURL: (import.meta.env.VITE_API_BASE_URL ?? '').trim() || '/api/v1',
  timeout: 30000, // 30 seconds
};

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Auth - Login only; registration is disabled (company-issued credentials only)
  auth: {
    login: '/auth/login',
  },
  // Dashboard-specific auth endpoints
  darkstore: {
    auth: {
      login: '/darkstore/auth/login',
    },
  },
  production: {
    auth: {
      login: '/production/auth/login',
    },
    overview: '/production/overview',
    overviewBatch: '/production/overview/batch',
    updateLine: (lineId: string) => `/production/overview/lines/${lineId}`,
    factories: '/production/factories',
    dashboard: {
      alerts: '/production/dashboard/alerts',
      alertStatus: (id: string) => `/production/dashboard/alerts/${id}/status`,
      alertDelete: (id: string) => `/production/dashboard/alerts/${id}`,
      incidents: '/production/dashboard/incidents',
      incidentStatus: (id: string) => `/production/dashboard/incidents/${id}/status`,
      reports: '/production/dashboard/reports',
      reportsExport: '/production/dashboard/reports/export',
      uploadHistory: '/production/dashboard/utilities/upload-history',
      syncHistory: '/production/dashboard/utilities/sync-history',
      hsdSync: '/production/dashboard/utilities/hsd-sync',
      settings: '/production/dashboard/utilities/settings',
      auditLogs: '/production/dashboard/utilities/audit-logs',
      bulkUpload: '/production/dashboard/utilities/bulk-upload',
    },
    rawMaterials: {
      materials: '/production/raw-materials/materials',
      orderMaterial: (id: string) => `/production/raw-materials/materials/${id}/order`,
      receipts: '/production/raw-materials/receipts',
      receiveReceipt: (id: string) => `/production/raw-materials/receipts/${id}/receive`,
      requisitions: '/production/raw-materials/requisitions',
      updateRequisitionStatus: (id: string) => `/production/raw-materials/requisitions/${id}/status`,
    },
    planning: {
      plans: '/production/planning',
    },
    workOrders: {
      list: '/production/work-orders',
      byId: (id: string) => `/production/work-orders/${id}`,
      assign: (id: string) => `/production/work-orders/${id}/assign`,
      updateStatus: (id: string) => `/production/work-orders/${id}/status`,
    },
    qc: {
      summary: '/production/qc/summary',
      inspections: '/production/qc/inspections',
      samples: '/production/qc/samples',
      sampleStatus: (id: string) => `/production/qc/samples/${id}`,
    },
    maintenance: {
      equipment: '/production/maintenance/equipment',
      tasks: '/production/maintenance/tasks',
      taskStatus: (id: string) => `/production/maintenance/tasks/${id}/status`,
      iot: '/production/maintenance/iot',
    },
    staff: {
      roster: '/production/staff/roster',
      create: '/production/staff',
      status: (id: string) => `/production/staff/${id}/status`,
      shiftCoverage: '/production/staff/shift-coverage',
      createShift: '/production/staff/shift-coverage',
      attendance: '/production/staff/attendance',
      markPresent: (recordId: string) => `/production/staff/attendance/${recordId}/mark-present`,
    },
  },
  merch: {
    auth: {
      login: '/merch/auth/login',
    },
  },
  rider: {
    auth: {
      login: '/rider/auth/login',
    },
  },
  finance: {
    auth: {
      login: '/finance/auth/login',
    },
    vendorPayments: {
      summary: '/finance/vendor-payments/summary',
      invoices: '/finance/vendor-payments/invoices',
      invoiceById: (id: string) => `/finance/vendor-payments/invoices/${id}`,
      approveInvoice: (id: string) => `/finance/vendor-payments/invoices/${id}/approve`,
      bulkApproveInvoices: '/finance/vendor-payments/invoices/bulk-approve',
      rejectInvoice: (id: string) => `/finance/vendor-payments/invoices/${id}/reject`,
      markInvoicePaid: (id: string) => `/finance/vendor-payments/invoices/${id}/mark-paid`,
      createPayment: '/finance/vendor-payments/payments',
      vendors: '/finance/vendor-payments/vendors',
    },
    riderCash: {
      summary: '/finance/rider-cash/summary',
      payouts: '/finance/rider-cash/payouts',
      codReconciliation: '/finance/rider-cash/cod-reconciliation',
    },
    summary: '/finance/summary',
    paymentMethodSplit: '/finance/payment-method-split',
    liveTransactions: '/finance/live-transactions',
    dailyMetrics: '/finance/daily-metrics',
    gatewayStatus: '/finance/gateway-status',
    hourlyTrends: '/finance/hourly-trends',
    export: '/finance/export',
    analytics: {
      revenueGrowth: '/finance/analytics/revenue-growth',
      cashFlow: '/finance/analytics/cash-flow',
      expenseBreakdown: '/finance/analytics/expense-breakdown',
      export: '/finance/analytics/export',
    },
  },
  warehouse: {
    auth: {
      login: '/warehouse/auth/login',
    },
    metrics: '/warehouse/metrics',
    orderFlow: '/warehouse/order-flow',
    dailyReport: '/warehouse/reports/daily',
    operationsView: '/warehouse/reports/operations-view',
    analytics: '/warehouse/analytics',
    utilities: {
      zones: '/warehouse/utilities/zones',
      logs: '/warehouse/utilities/logs',
      uploadSkus: '/warehouse/utilities/upload-skus',
      generateLabels: '/warehouse/utilities/generate-labels',
      reassignBins: '/warehouse/utilities/reassign-bins',
    },
  },
  admin: {
    auth: {
      login: '/admin/auth/login',
    },
    users: {
      list: '/admin/users',
      byId: (id: string) => `/admin/users/${id}`,
      create: '/admin/users',
      update: (id: string) => `/admin/users/${id}`,
      delete: (id: string) => `/admin/users/${id}`,
      assignRole: (id: string) => `/admin/users/${id}/role`,
      bulk: '/admin/users/bulk',
    },
    roles: '/admin/roles',
    permissions: '/admin/permissions',
    accessLogs: '/admin/access-logs',
    sessions: '/admin/sessions',
    sessionRevoke: (id: string) => `/admin/sessions/${id}`,
    customers: {
      list: '/admin/customers',
      stats: '/admin/customers/stats',
      getById: (id: string) => `/admin/customers/${id}`,
      update: (id: string) => `/admin/customers/${id}`,
      orders: (id: string) => `/admin/customers/${id}/orders`,
      addresses: (id: string) => `/admin/customers/${id}/addresses`,
      paymentMethods: (id: string) => `/admin/customers/${id}/payment-methods`,
      passwordInfo: (id: string) => `/admin/customers/${id}/password-info`,
      resetPassword: (id: string) => `/admin/customers/${id}/reset-password`,
      setPassword: (id: string) => `/admin/customers/${id}/set-password`,
    },
    fraud: {
      alerts: '/admin/fraud/alerts',
      alertById: (id: string) => `/admin/fraud/alerts/${id}`,
      blocked: '/admin/fraud/blocked',
      blockedById: (id: string) => `/admin/fraud/blocked/${id}`,
      rules: '/admin/fraud/rules',
      ruleToggle: (id: string) => `/admin/fraud/rules/${id}/toggle`,
      riskProfiles: '/admin/fraud/risk-profiles',
      patterns: '/admin/fraud/patterns',
      investigations: '/admin/fraud/investigations',
      chargebacks: '/admin/fraud/chargebacks',
      chargebackById: (id: string) => `/admin/fraud/chargebacks/${id}`,
      metrics: '/admin/fraud/metrics',
    },
  },
  // Dashboard
  dashboard: {
    summary: '/shared/dashboard/summary',
  },
  // Riders (mounted at /api/v1/rider)
  riders: {
    list: '/rider',
    create: '/rider',
    byId: (id: string) => `/rider/${id}`,
    location: (id: string) => `/rider/${id}/location`,
    distribution: '/rider/distribution',
    summary: '/rider/summary',
  },
  // Orders (mounted at /api/v1/rider/orders)
  orders: {
    list: '/rider/orders',
    assign: (id: string) => `/rider/orders/${id}/assign`,
    alert: (id: string) => `/rider/orders/${id}/alert`,
  },
  // HR (mounted at /api/v1/rider/hr)
  hr: {
    summary: '/rider/hr/dashboard/summary',
    documents: '/rider/hr/documents',
    document: (id: string) => `/rider/hr/documents/${id}`,
    documentRejectionReason: (id: string) => `/rider/hr/documents/${id}/rejection-reason`,
    documentHistory: (id: string) => `/rider/hr/documents/${id}/history`,
    riders: '/rider/hr/riders',
    rider: (id: string) => `/rider/hr/riders/${id}`,
    access: (id: string) => `/rider/hr/access/${id}`,
    remindRider: (id: string) => `/rider/hr/riders/${id}/remind`,
    training: '/rider/hr/training',
    contracts: '/rider/hr/contracts',
    contract: (id: string) => `/rider/hr/contracts/${id}`,
    renewContract: (id: string) => `/rider/hr/contracts/${id}/renew`,
    terminateContract: (id: string) => `/rider/hr/contracts/${id}/terminate`,
  },
  // Dispatch (mounted at /api/v1/rider/dispatch)
  dispatch: {
    unassignedOrders: '/rider/dispatch/unassigned-orders',
    unassignedOrdersCount: '/rider/dispatch/unassigned-orders/count',
    mapData: '/rider/dispatch/map-data',
    mapRiders: '/rider/dispatch/map-data/riders',
    mapOrders: '/rider/dispatch/map-data/orders',
    recommendedRiders: (orderId: string) => `/rider/dispatch/recommended-riders/${orderId}`,
    orderAssignmentDetails: (orderId: string) => `/rider/dispatch/order/${orderId}/assignment-details`,
    createOrder: '/rider/dispatch/orders',
    manualOrder: '/rider/dispatch/manual-order',
    assignOrder: '/rider/dispatch/assign',
    batchAssign: '/rider/dispatch/batch-assign',
    autoAssign: '/rider/dispatch/auto-assign',
    autoAssignRules: '/rider/dispatch/auto-assign-rules',
  },
  // Fleet (mounted at /api/v1/rider/fleet)
  fleet: {
    summary: '/rider/fleet/summary',
    vehicles: '/rider/fleet/vehicles',
    vehicle: (id: string) => `/rider/fleet/vehicles/${id}`,
    maintenance: '/rider/fleet/maintenance',
    maintenanceTask: (id: string) => `/rider/fleet/maintenance/${id}`,
  },
  // Alerts & Exceptions (shared routes)
  alerts: {
    list: '/shared/alerts',
    byId: (id: string) => `/shared/alerts/${id}`,
    action: (id: string) => `/shared/alerts/${id}/action`,
    markAllRead: '/shared/alerts/read-all',
    clearResolved: '/shared/alerts',
  },
  // Analytics & Reports
  analytics: {
    riderPerformance: '/analytics/rider-performance',
    slaAdherence: '/analytics/sla-adherence',
    fleetUtilization: '/analytics/fleet-utilization',
    exportReport: '/analytics/reports/export',
  },
  // Staff & Shift Management
  staff: {
    summary: '/staff/summary',
    list: '/staff',
    shifts: '/staff/shifts',
    shift: (id: string) => `/staff/shifts/${id}`,
    shiftCoverage: '/staff/shifts/coverage',
    weeklyRoster: '/staff/roster/weekly',
    publishRoster: '/staff/roster/weekly/publish',
    absences: '/staff/absences',
    autoAssign: '/staff/shifts/auto-assign',
    performance: '/staff/performance',
    incentiveCriteria: '/staff/incentive-criteria',
  },
  // Communication Hub (shared routes: /api/v1/shared/communication/...)
  communication: {
    chats: '/shared/communication/chats',
    chat: (id: string) => `/shared/communication/chats/${id}`,
    chatMessages: (id: string) => `/shared/communication/chats/${id}/messages`,
    markRead: (id: string) => `/shared/communication/chats/${id}/read`,
    broadcasts: '/shared/communication/broadcasts',
    flagIssue: (id: string) => `/shared/communication/chats/${id}/flag`,
  },
  // System Health (shared routes under /api/v1/shared/system-health)
  systemHealth: {
    summary: '/shared/system-health/summary',
    devices: '/shared/system-health/devices',
    device: (id: string) => `/shared/system-health/devices/${id}`,
    runDiagnostics: '/shared/system-health/diagnostics/run',
    diagnosticsReport: (reportId: string) => `/shared/system-health/diagnostics/reports/${reportId}`,
  },
  // Task Approvals (shared routes under /api/v1/shared)
  approvals: {
    summary: '/shared/approvals/summary',
    queue: '/shared/approvals/queue',
    queueItem: (id: string) => `/shared/approvals/queue/${id}`,
    approve: (id: string) => `/shared/approvals/queue/${id}/approve`,
    reject: (id: string) => `/shared/approvals/queue/${id}/reject`,
    batchApprove: '/shared/approvals/batch-approve',
  },
  // Vendor
  vendor: {
    // Auth
    auth: {
      login: '/vendor/auth/login',
    },
    // Utilities (upload-history, contracts, audit-logs)
    utilities: {
      uploadHistory: '/vendor/utilities/upload-history',
      bulkUpload: '/vendor/utilities/bulk-upload',
      contracts: '/vendor/utilities/contracts',
      contractById: (id: string) => `/vendor/utilities/contracts/${id}`,
      auditLogs: '/vendor/utilities/audit-logs',
      auditLogsExport: '/vendor/utilities/audit-logs/export',
    },
    // Vendors
    vendors: {
      list: '/vendor/vendors',
      create: '/vendor/vendors',
      summary: '/vendor/vendors/summary',
      byId: (id: string) => `/vendor/vendors/${id}`,
      update: (id: string) => `/vendor/vendors/${id}`,
      patch: (id: string) => `/vendor/vendors/${id}`,
      action: (id: string) => `/vendor/vendors/${id}/actions`,
      purchaseOrders: (id: string) => `/vendor/vendors/${id}/purchase-orders`,
      qcChecks: (id: string) => `/vendor/vendors/${id}/qc-checks`,
      createQCCheck: (id: string) => `/vendor/vendors/${id}/qc-checks`,
      alerts: (id: string) => `/vendor/vendors/${id}/alerts`,
      createAlert: (id: string) => `/vendor/vendors/${id}/alerts`,
      performance: (id: string) => `/vendor/vendors/${id}/performance`,
      health: (id: string) => `/vendor/vendors/${id}/health`,
    },
    // Inbound
    inbound: {
      overview: '/vendor/inbound/overview',
      grns: '/vendor/inbound/grns',
      createGrn: '/vendor/inbound/grns',
      grnById: (id: string) => `/vendor/inbound/grns/${id}`,
      updateGrn: (id: string) => `/vendor/inbound/grns/${id}`,
      patchGrnStatus: (id: string) => `/vendor/inbound/grns/${id}/status`,
      approveGrn: (id: string) => `/vendor/inbound/grns/${id}/approve`,
      rejectGrn: (id: string) => `/vendor/inbound/grns/${id}/reject`,
      shipments: '/vendor/inbound/shipments',
      createShipment: '/vendor/inbound/shipments',
      patchShipmentStatus: (id: string) => `/vendor/inbound/shipments/${id}/status`,
      exceptions: '/vendor/inbound/exceptions',
      createException: '/vendor/inbound/exceptions',
      resolveException: (id: string) => `/vendor/inbound/exceptions/${id}/resolve`,
      bulkImport: '/vendor/inbound/bulk-import',
      bulkImportStatus: (id: string) => `/vendor/inbound/bulk-import/${id}`,
      report: '/vendor/inbound/report',
    },
    // Inventory
    inventory: {
      summary: (vendorId: string) => `/vendor/inventory/${vendorId}`,
      stock: (vendorId: string) => `/vendor/inventory/${vendorId}/stock`,
      sync: (vendorId: string) => `/vendor/inventory/${vendorId}/sync`,
      reconcile: (vendorId: string) => `/vendor/inventory/${vendorId}/reconcile`,
      agingAlerts: (vendorId: string) => `/vendor/inventory/${vendorId}/aging-alerts`,
      ackAlert: (vendorId: string, alertId: string) => `/vendor/inventory/${vendorId}/aging-alerts/${alertId}/ack`,
    },
    // Purchase Orders
    purchaseOrders: {
      list: '/vendor/purchase-orders',
      create: '/vendor/purchase-orders',
      byId: (id: string) => `/vendor/purchase-orders/${id}`,
      update: (id: string) => `/vendor/purchase-orders/${id}`,
      patch: (id: string) => `/vendor/purchase-orders/${id}`,
      approve: (id: string) => `/vendor/purchase-orders/${id}/approve`,
      reject: (id: string) => `/vendor/purchase-orders/${id}/reject`,
      cancel: (id: string) => `/vendor/purchase-orders/${id}/cancel`,
      receive: (id: string) => `/vendor/purchase-orders/${id}/receive`,
      export: '/vendor/purchase-orders/export',
    },
    // Procurement Task Approvals
    approvals: {
      summary: '/vendor/approvals/summary',
      tasks: '/vendor/approvals/tasks',
      taskById: (id: string) => `/vendor/approvals/tasks/${id}`,
      submitDecision: (id: string) => `/vendor/approvals/tasks/${id}/decision`,
    },
    // QC
    qc: {
      list: '/vendor/qc',
      create: '/vendor/qc',
      overview: '/vendor/qc/overview',
      byId: (id: string) => `/vendor/qc/${id}`,
      update: (id: string) => `/vendor/qc/${id}`,
    },
    // Certificates
    certificates: {
      listVendorCertificates: (vendorId: string) => `/vendor/vendors/${vendorId}/certificates`,
      createVendorCertificate: (vendorId: string) => `/vendor/vendors/${vendorId}/certificates`,
      getCertificate: (id: string) => `/vendor/certificates/${id}`,
      deleteCertificate: (id: string) => `/vendor/certificates/${id}`,
    },
    // Webhooks
    webhooks: {
      vendorSigned: '/vendor/webhooks/vendor-signed',
      carrier: '/vendor/webhooks/carrier',
    },
    // Reports & Analytics
    reports: {
      salesOverview: '/vendor/reports/sales/overview',
      salesData: '/vendor/reports/sales/data',
      productPerformance: '/vendor/reports/products/performance',
      orderAnalytics: '/vendor/reports/orders/analytics',
      revenueByCategory: '/vendor/reports/revenue/category',
      hourlySales: '/vendor/reports/sales/hourly',
      financialSummary: '/vendor/reports/financial/summary',
      customerInsights: '/vendor/reports/customers/insights',
      topCustomers: '/vendor/reports/customers/top',
    },
  },
  // Onboarding (Admin - mounted at /api/v1/customer/admin/onboarding-pages)
  onboarding: {
    list: '/customer/admin/onboarding-pages',
    create: '/customer/admin/onboarding-pages',
    update: (id: string) => `/customer/admin/onboarding-pages/${id}`,
    delete: (id: string) => `/customer/admin/onboarding-pages/${id}`,
    reorder: '/customer/admin/onboarding-pages/reorder',
    uploadImage: (id: string) => `/customer/admin/onboarding-pages/${id}/image`,
  },
  // Customer App Config (Admin)
  customerAppConfig: {
    get: '/customer/admin/app-config',
    update: '/customer/admin/app-config',
    updateSection: (section: string) => `/customer/admin/app-config/section/${section}`,
    reset: '/customer/admin/app-config/reset',
  },
  // Coupons (Admin)
  customerCoupons: {
    list: '/customer/admin/coupons',
    stats: '/customer/admin/coupons/stats',
    getById: (id: string) => `/customer/admin/coupons/${id}`,
    create: '/customer/admin/coupons',
    update: (id: string) => `/customer/admin/coupons/${id}`,
    delete: (id: string) => `/customer/admin/coupons/${id}`,
  },
  // Legal (Admin)
  customerLegal: {
    documents: '/customer/admin/legal/documents',
    documentById: (id: string) => `/customer/admin/legal/documents/${id}`,
    createDocument: '/customer/admin/legal/documents',
    updateDocument: (id: string) => `/customer/admin/legal/documents/${id}`,
    deleteDocument: (id: string) => `/customer/admin/legal/documents/${id}`,
    setCurrentDocument: (id: string) => `/customer/admin/legal/documents/${id}/set-current`,
    config: '/customer/admin/legal/config',
    updateConfig: '/customer/admin/legal/config',
  },
  // Cancellation Policies (Admin)
  customerCancellationPolicies: {
    list: '/customer/admin/cancellation-policies',
    getById: (id: string) => `/customer/admin/cancellation-policies/${id}`,
    create: '/customer/admin/cancellation-policies',
    update: (id: string) => `/customer/admin/cancellation-policies/${id}`,
    delete: (id: string) => `/customer/admin/cancellation-policies/${id}`,
  },
  // Notifications (Admin)
  customerNotifications: {
    list: '/customer/admin/notifications',
    stats: '/customer/admin/notifications/stats',
    send: '/customer/admin/notifications/send',
    delete: (id: string) => `/customer/admin/notifications/${id}`,
  },
  // Catalog (Admin - mounted at /api/v1/customer/admin/home)
  catalog: {
    products: '/customer/admin/home/products',
    productById: (id: string) => `/customer/admin/home/products/${id}`,
    productsBulk: '/customer/admin/home/products/bulk',
    categories: '/customer/admin/home/categories',
    categoryById: (id: string) => `/customer/admin/home/categories/${id}`,
    attributes: '/customer/admin/home/attributes',
    attributeById: (id: string) => `/customer/admin/home/attributes/${id}`,
    uploadProductImage: '/customer/admin/home/upload-product-image',
  },
  // Inbound (warehouse dashboard - mounted at /api/v1/warehouse)
  inbound: {
    grns: '/warehouse/inbound/grns',
    createGrn: '/warehouse/inbound/grns',
    exportGrns: '/warehouse/inbound/grns/export',
    grnById: (id: string) => `/warehouse/inbound/grns/${id}`,
    startGrn: (id: string) => `/warehouse/inbound/grns/${id}/start`,
    completeGrn: (id: string) => `/warehouse/inbound/grns/${id}/complete`,
    logDiscrepancy: (id: string) => `/warehouse/inbound/grns/${id}/discrepancy`,
    docks: '/warehouse/inbound/docks',
    updateDock: (id: string) => `/warehouse/inbound/docks/${id}`,
  },
  // Outbound (warehouse dashboard - mounted at /api/v1/warehouse)
  outbound: {
    picklists: '/warehouse/outbound/picklists',
    picklistById: (id: string) => `/warehouse/outbound/picklists/${id}`,
    assignPicker: (id: string) => `/warehouse/outbound/picklists/${id}/assign`,
    batches: '/warehouse/outbound/batches',
    batchById: (id: string) => `/warehouse/outbound/batches/${id}`,
    pickers: '/warehouse/outbound/pickers',
    pickerOrders: (id: string) => `/warehouse/outbound/pickers/${id}/orders`,
    routeMap: (id: string) => `/warehouse/outbound/routes/${id}/map`,
    routesActive: '/warehouse/outbound/routes/active/map',
    consolidatedPicks: '/warehouse/outbound/consolidated-picks',
  },
  // Inventory (warehouse dashboard)
  inventory: {
    summary: '/warehouse/inventory/summary',
    items: '/warehouse/inventory/items',
    itemById: (id: string) => `/warehouse/inventory/items/${id}`,
    locations: '/warehouse/inventory/locations',
    locationById: (id: string) => `/warehouse/inventory/locations/${id}`,
    adjustments: '/warehouse/inventory/adjustments',
    createAdjustment: '/warehouse/inventory/adjustments',
    cycleCounts: '/warehouse/inventory/cycle-counts',
    cycleCountById: (id: string) => `/warehouse/inventory/cycle-counts/${id}`,
    createCycleCount: '/warehouse/inventory/cycle-counts',
    startCycleCount: (id: string) => `/warehouse/inventory/cycle-counts/${id}/start`,
    completeCycleCount: (id: string) => `/warehouse/inventory/cycle-counts/${id}/complete`,
    transfers: '/warehouse/inventory/transfers',
    createTransfer: '/warehouse/inventory/transfers',
    updateTransferStatus: (id: string) => `/warehouse/inventory/transfers/${id}/status`,
    alerts: '/warehouse/inventory/alerts',
    createReorder: '/warehouse/inventory/reorder',
    export: '/warehouse/inventory/export',
  },
  // Inter-warehouse Transfers
  transfers: {
    list: '/warehouse/transfers',
    create: '/warehouse/transfers',
    details: (id: string) => `/warehouse/transfers/${id}`,
    updateStatus: (id: string) => `/warehouse/transfers/${id}/status`,
    track: (id: string) => `/warehouse/transfers/${id}/track`,
    export: '/warehouse/transfers/export',
  },
  // QC & Compliance (warehouse)
  qc: {
    inspections: '/warehouse/qc/inspections',
    createInspection: '/warehouse/qc/inspections',
    inspectionDetails: (id: string) => `/warehouse/qc/inspections/${id}`,
    inspectionReport: (id: string) => `/warehouse/qc/inspections/${id}/report`,
    temperatureLogs: '/warehouse/qc/temperature-logs',
    createTempLog: '/warehouse/qc/temperature-logs',
    tempChart: (id: string) => `/warehouse/qc/temperature-logs/${id}/chart`,
    logRejection: '/warehouse/qc/rejections',
    complianceDocs: '/warehouse/qc/compliance-docs',
    complianceDoc: (id: string) => `/warehouse/qc/compliance-docs/${id}`,
    samples: '/warehouse/qc/samples',
    createSample: '/warehouse/qc/samples',
    sampleReport: (id: string) => `/warehouse/qc/samples/${id}/report`,
    updateSample: (id: string) => `/warehouse/qc/samples/${id}/update`,
  },
  // Workforce & Shifts (warehouse)
  workforce: {
    staff: '/warehouse/workforce/staff',
    staffDetails: (id: string) => `/warehouse/workforce/staff/${id}`,
    schedule: '/warehouse/workforce/schedule',
    createSchedule: '/warehouse/workforce/schedule',
    assignStaff: (id: string) => `/warehouse/workforce/schedule/${id}/assign`,
    trainings: '/warehouse/workforce/training',
    trainingDetails: (id: string) => `/warehouse/workforce/training/${id}`,
    enrollStaff: (id: string) => `/warehouse/workforce/training/${id}/enroll`,
    attendance: '/warehouse/workforce/attendance',
    performance: '/warehouse/workforce/performance',
    leaveRequests: '/warehouse/workforce/leave-requests',
    createLeaveRequest: '/warehouse/workforce/leave-requests',
    updateLeaveStatus: (id: string) => `/warehouse/workforce/leave-requests/${id}/status`,
    logAttendance: '/warehouse/workforce/attendance',
  },
  // Equipment & Assets (warehouse)
  equipment: {
    devices: '/warehouse/equipment/devices',
    deviceById: (id: string) => `/warehouse/equipment/devices/${id}`,
    machinery: '/warehouse/equipment/machinery',
    addMachinery: '/warehouse/equipment/machinery',
    machineryById: (id: string) => `/warehouse/equipment/machinery/${id}`,
    reportIssue: (id: string) => `/warehouse/equipment/machinery/${id}/issue`,
    resolveIssue: (id: string) => `/warehouse/equipment/machinery/${id}/resolve`,
    export: '/warehouse/equipment/export',
  },
  // Exceptions (warehouse)
  exceptions: {
    list: '/warehouse/exceptions',
    report: '/warehouse/exceptions',
    byId: (id: string) => `/warehouse/exceptions/${id}`,
    updateStatus: (id: string) => `/warehouse/exceptions/${id}/status`,
    rejectShipment: (id: string) => `/warehouse/exceptions/${id}/reject-shipment`,
    acceptPartial: (id: string) => `/warehouse/exceptions/${id}/accept-partial`,
    export: '/warehouse/exceptions/export',
  },
};
