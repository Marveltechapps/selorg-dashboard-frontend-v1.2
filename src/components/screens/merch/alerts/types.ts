export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'New' | 'In Progress' | 'Snoozed' | 'Resolved' | 'Dismissed';
export type AlertType = 'Pricing' | 'Stock' | 'Campaign' | 'System';

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  region: string;
  linkedEntities: {
    skus?: string[];
    campaigns?: Array<{ id: string; name: string }>;
    store?: string;
  };
}

export interface AlertAuditLog {
  id: string;
  alertId: string;
  user: string;
  action: string;
  timestamp: string;
}
