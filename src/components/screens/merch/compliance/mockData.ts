import { ApprovalRequest, AuditLogEntry, ComplianceScoreComponent } from './types';

const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const todayMinus2Hours = new Date(now.getTime() - 2 * 60 * 60 * 1000);

export const MOCK_APPROVALS: ApprovalRequest[] = [
  {
    id: '1',
    type: 'Price Change',
    title: 'Coffee Beans 1kg',
    description: '₹25.00 → ₹28.00',
    requestedBy: 'John D.',
    requestedAt: todayMinus2Hours.toISOString(),
    status: 'Pending',
    riskLevel: 'Low',
    region: 'North America',
    details: {
      sku: 'SKU-CB-001',
      currentPrice: 25.00,
      proposedPrice: 28.00,
      marginImpact: '+12%',
      competitorPrices: 'Avg ₹29.50',
    },
    approvers: ['Pricing Manager'],
    currentStep: 1,
    slaDeadline: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    type: 'New Campaign',
    title: 'Winter Warmers',
    description: 'Bundle Discount',
    requestedBy: 'Sarah M.',
    requestedAt: yesterday.toISOString(),
    status: 'Pending',
    riskLevel: 'Medium',
    region: 'Europe',
    details: {
      campaignName: 'Winter Warmers 2024',
      discountMechanics: 'Buy 2 Get 1 Free',
      expectedUplift: '15%',
      affectedRegions: ['UK', 'Germany', 'France'],
    },
    approvers: ['Head of Merch', 'Compliance Officer'],
    currentStep: 1,
    slaDeadline: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    type: 'Zone Change',
    title: 'Expand to West Coast',
    description: 'Add CA, OR, WA to "West Coast" Zone',
    requestedBy: 'Mike T.',
    requestedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
    status: 'Approved',
    riskLevel: 'High',
    region: 'North America',
    details: {
        affectedRegions: ['California', 'Oregon', 'Washington']
    },
    approvers: ['Head of Operations'],
    currentStep: 2,
    slaDeadline: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    type: 'Policy Override',
    title: 'Flash Sale Margin Exception',
    description: 'Allow 5% margin for 24h flash sale',
    requestedBy: 'Elena R.',
    requestedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
    status: 'Pending',
    riskLevel: 'High',
    region: 'Global',
    details: {
        marginImpact: '-10% vs Standard',
        expectedUplift: '200%'
    },
    approvers: ['CFO', 'Head of Merch'],
    currentStep: 1,
    slaDeadline: new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString(),
  }
];

export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: '101',
    eventType: 'Approval',
    entity: 'Price Change #123 (Coffee Beans)',
    user: 'Alice W.',
    timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    summary: 'Approved price increase to ₹28.00',
    result: 'Pass',
    scope: 'North America'
  },
  {
    id: '102',
    eventType: 'Violation',
    entity: 'Campaign #999 (Summer Sale)',
    user: 'System',
    timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    summary: 'Margin too low (-2%) without override',
    result: 'Fail',
    scope: 'Global'
  },
  {
    id: '103',
    eventType: 'System Check',
    entity: 'Regulatory Scan',
    user: 'Auto-Bot',
    timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
    summary: 'Weekly FDA compliance scan completed',
    result: 'Pass',
    scope: 'Global'
  },
  ...Array.from({ length: 19 }).map((_, i) => ({
    id: `audit-${i}`,
    eventType: 'System Check' as const,
    entity: `Standard Protocol #${1000 + i}`,
    user: 'System',
    timestamp: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
    summary: 'Automated compliance validation',
    result: 'Pass' as const,
    scope: 'Global'
  }))
];

export const COMPLIANCE_SCORES: ComplianceScoreComponent[] = [
  { category: 'Pricing', score: 98, weight: 30, issues: 0 },
  { category: 'Promotions', score: 92, weight: 30, issues: 2 },
  { category: 'Content/Media', score: 100, weight: 20, issues: 0 },
  { category: 'Regulatory', score: 100, weight: 20, issues: 0 },
];
