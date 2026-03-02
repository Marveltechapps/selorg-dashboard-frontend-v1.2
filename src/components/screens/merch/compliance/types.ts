export type RequestType = 'Price Change' | 'New Campaign' | 'Zone Change' | 'Policy Override';
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Expired';
export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface ApprovalRequest {
  id: string;
  type: RequestType;
  title: string;
  description: string;
  requestedBy: string;
  requestedAt: string; // ISO string
  status: ApprovalStatus;
  riskLevel: RiskLevel;
  region: string;
  details: {
    sku?: string;
    currentPrice?: number;
    proposedPrice?: number;
    marginImpact?: string;
    competitorPrices?: string;
    campaignName?: string;
    discountMechanics?: string;
    expectedUplift?: string;
    affectedRegions?: string[];
  };
  approvers: string[];
  currentStep: number;
  slaDeadline: string; // ISO string
}

export interface AuditLogEntry {
  id: string;
  eventType: 'Approval' | 'Rejection' | 'Override' | 'Violation' | 'System Check';
  entity: string; // e.g., "Price Change #123"
  user: string;
  timestamp: string;
  summary: string;
  result: 'Pass' | 'Fail' | 'Info';
  scope: string;
}

export interface ComplianceScoreComponent {
  category: 'Pricing' | 'Promotions' | 'Content/Media' | 'Regulatory';
  score: number;
  weight: number;
  issues: number;
}
