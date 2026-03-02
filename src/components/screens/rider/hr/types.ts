export interface Rider {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "onboarding" | "active" | "suspended";
  onboardingStatus: "invited" | "docs_pending" | "under_review" | "approved";
  trainingStatus: "not_started" | "in_progress" | "completed";
  appAccess: "enabled" | "disabled";
  deviceAssigned: boolean;
  contract: {
    startDate: string;
    endDate: string;
    renewalDue: boolean;
  };
  compliance: {
    isCompliant: boolean;
    lastAuditDate: string;
    policyViolationsCount: number;
    lastViolationReason?: string;
  };
  suspension?: {
    isSuspended: boolean;
    reason?: string;
    since?: string;
  };
}

export type DocumentType =
  | "ID Proof"
  | "Driving License"
  | "Vehicle RC"
  | "Insurance Policy"
  | "Background Check"
  | "Contract";

export type DocumentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "resubmitted";

export interface RiderDocument {
  id: string;
  riderId: string;
  riderName: string;
  documentType: DocumentType;
  submittedAt: string;
  expiresAt?: string;
  status: DocumentStatus;
  rejectionReason?: string;
  reviewer?: string;
  reviewedAt?: string;
  fileUrl: string;
}

export interface HrDashboardSummary {
  pendingVerifications: number;
  expiredDocuments: number;
  activeCompliantRiders: number;
}

export interface ApprovalHistoryEntry {
  id: string;
  riderId: string;
  riderName: string;
  documentType: DocumentType;
  action: "approved" | "rejected";
  actionBy: string;
  actionAt: string;
  notes?: string;
}
