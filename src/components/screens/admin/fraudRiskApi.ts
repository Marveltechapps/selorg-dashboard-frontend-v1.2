import { apiRequest } from '@/api/apiClient';

// --- Type Definitions ---

export interface FraudAlert {
  id: string;
  alertNumber: string;
  type: 'promo_abuse' | 'fake_account' | 'payment_fraud' | 'velocity_breach' | 'device_fraud' | 'refund_abuse' | 'chargeback_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  customerId: string;
  customerName: string;
  customerEmail: string;
  description: string;
  detectedAt: string;
  resolvedAt?: string;
  assignedTo?: string;
  assignedToName?: string;
  riskScore: number;
  evidence: FraudEvidence[];
  actions: string[];
  orderNumbers?: string[];
  amountInvolved?: number;
  deviceId?: string;
  ipAddress?: string;
  location?: string;
}

export interface FraudEvidence {
  id: string;
  type: 'transaction' | 'device' | 'behavior' | 'system' | 'manual';
  description: string;
  timestamp: string;
  data?: any;
}

export interface RiskProfile {
  id: string;
  entityType: 'customer' | 'device' | 'ip' | 'transaction';
  entityId: string;
  entityName: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  totalOrders: number;
  totalSpent: number;
  refundRate: number;
  chargebackCount: number;
  accountAge: number; // in days
  lastActivity: string;
  flags: string[];
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}

export interface BlockedEntity {
  id: string;
  type: 'email' | 'phone' | 'ip' | 'device' | 'user';
  value: string;
  reason: string;
  blockedBy: string;
  blockedByName: string;
  blockedAt: string;
  expiresAt?: string;
  isPermanent: boolean;
  relatedAlerts: string[];
  notes?: string;
}

export interface FraudPattern {
  id: string;
  name: string;
  type: 'promo_abuse' | 'account_takeover' | 'payment_fraud' | 'refund_fraud' | 'velocity_abuse';
  description: string;
  occurrences: number;
  totalLoss: number;
  detectedCount: number;
  preventedCount: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  lastDetected: string;
  affectedCustomers: number;
}

export interface Investigation {
  id: string;
  caseNumber: string;
  title: string;
  type: 'fraud' | 'abuse' | 'suspicious';
  status: 'open' | 'investigating' | 'pending_review' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  investigator?: string;
  investigatorName?: string;
  openedAt: string;
  closedAt?: string;
  customerId: string;
  customerName: string;
  totalLoss: number;
  evidence: FraudEvidence[];
  timeline: InvestigationTimeline[];
  outcome?: 'confirmed_fraud' | 'false_positive' | 'inconclusive';
}

export interface InvestigationTimeline {
  id: string;
  action: string;
  performedBy: string;
  performedByName: string;
  timestamp: string;
  details?: string;
}

export interface FraudRule {
  id: string;
  name: string;
  type: 'velocity' | 'amount' | 'device' | 'location' | 'behavior';
  condition: string;
  threshold: number;
  action: 'flag' | 'block' | 'review' | 'alert';
  isActive: boolean;
  priority: number;
  triggeredCount: number;
  falsePositiveRate: number;
  createdAt: string;
  lastTriggered?: string;
}

export interface Chargeback {
  id: string;
  chargebackId: string;
  orderId: string;
  customerId: string;
  customerName: string;
  amount: number;
  reason: string;
  status: 'received' | 'under_review' | 'accepted' | 'disputed' | 'won' | 'lost';
  receivedAt: string;
  dueDate: string;
  resolvedAt?: string;
  merchantNotes?: string;
  evidence?: string[];
}

export interface FraudMetrics {
  totalAlerts: number;
  openAlerts: number;
  resolvedAlerts: number;
  falsePositives: number;
  totalLossPrevented: number;
  totalLossIncurred: number;
  averageRiskScore: number;
  blockedEntities: number;
  activeInvestigations: number;
  chargebackRate: number;
}

const PREFIX = '/admin/fraud';

// --- API Functions ---

export async function fetchFraudAlerts(filters?: { status?: string; severity?: string; type?: string }): Promise<FraudAlert[]> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters?.severity && filters.severity !== 'all') params.append('severity', filters.severity);
  if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
  const qs = params.toString();
  const res = await apiRequest<{ success: boolean; data: FraudAlert[] }>(
    `${PREFIX}/alerts${qs ? `?${qs}` : ''}`
  );
  return res.data ?? [];
}

export async function updateFraudAlert(id: string, data: Partial<FraudAlert>): Promise<FraudAlert> {
  const res = await apiRequest<{ success: boolean; data: FraudAlert }>(`${PREFIX}/alerts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function fetchRiskProfiles(): Promise<RiskProfile[]> {
  const res = await apiRequest<{ success: boolean; data: RiskProfile[] }>(`${PREFIX}/risk-profiles`);
  return res.data ?? [];
}

export async function fetchBlockedEntities(): Promise<BlockedEntity[]> {
  const res = await apiRequest<{ success: boolean; data: BlockedEntity[] }>(`${PREFIX}/blocked`);
  return res.data ?? [];
}

export async function blockEntity(data: Omit<BlockedEntity, 'id' | 'blockedAt' | 'blockedBy' | 'blockedByName'>): Promise<BlockedEntity> {
  const res = await apiRequest<{ success: boolean; data: BlockedEntity }>(`${PREFIX}/blocked`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function unblockEntity(id: string): Promise<void> {
  await apiRequest<{ success: boolean }>(`${PREFIX}/blocked/${id}`, { method: 'DELETE' });
}

export async function fetchFraudPatterns(): Promise<FraudPattern[]> {
  const res = await apiRequest<{ success: boolean; data: FraudPattern[] }>(`${PREFIX}/patterns`);
  return res.data ?? [];
}

export async function fetchInvestigations(): Promise<Investigation[]> {
  const res = await apiRequest<{ success: boolean; data: Investigation[] }>(`${PREFIX}/investigations`);
  return res.data ?? [];
}

export async function fetchFraudRules(): Promise<FraudRule[]> {
  const res = await apiRequest<{ success: boolean; data: FraudRule[] }>(`${PREFIX}/rules`);
  return res.data ?? [];
}

export async function toggleFraudRule(id: string): Promise<FraudRule> {
  const res = await apiRequest<{ success: boolean; data: FraudRule }>(`${PREFIX}/rules/${id}/toggle`, {
    method: 'PATCH',
  });
  return res.data;
}

export async function fetchChargebacks(): Promise<Chargeback[]> {
  const res = await apiRequest<{ success: boolean; data: Chargeback[] }>(`${PREFIX}/chargebacks`);
  return res.data ?? [];
}

export async function updateChargeback(id: string, data: Partial<Chargeback>): Promise<Chargeback> {
  const res = await apiRequest<{ success: boolean; data: Chargeback }>(`${PREFIX}/chargebacks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function fetchFraudMetrics(): Promise<FraudMetrics> {
  const res = await apiRequest<{ success: boolean; data: FraudMetrics }>(`${PREFIX}/metrics`);
  return res.data ?? {
    totalAlerts: 0,
    openAlerts: 0,
    resolvedAlerts: 0,
    falsePositives: 0,
    totalLossPrevented: 0,
    totalLossIncurred: 0,
    averageRiskScore: 0,
    blockedEntities: 0,
    activeInvestigations: 0,
    chargebackRate: 0,
  };
}
