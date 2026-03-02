export interface SKU {
  id: string;
  name: string;
  code: string;
  category: string;
  basePrice: number;
  currentSellingPrice: number;
  costPrice: number;
  competitorPrice: number;
  marginPercent: number;
  inventory: number;
  status: 'Active' | 'Inactive';
  region: string;
}

export interface PriceRule {
  id: string;
  name: string;
  description: string;
  type: 'Base' | 'Geo' | 'Time' | 'Campaign' | 'Surge';
  status: 'Active' | 'Paused' | 'Inactive';
  zones: string[];
  trigger?: string;
  multiplier?: string;
  activeDays?: string[];
  startDate?: string;
  endDate?: string;
}

export interface PendingUpdate {
  id: string;
  skuId: string;
  skuName: string;
  currentPrice: number;
  proposedPrice: number;
  effectiveDate: string;
  reason: string;
  requestedBy: string;
  requestedOn: string;
  marginImpact: number;
  source: 'Manual' | 'Campaign' | 'Rule Engine';
  status: 'Pending' | 'Approved' | 'Rejected';
  priority: 'High' | 'Medium' | 'Low';
}

export interface MarginAlert {
  skuId: string;
  skuName: string;
  skuCode: string;
  basePrice: number;
  currentSellingPrice: number;
  cost: number;
  marginPercent: number;
  competitorAvg: number;
  status: 'Critical' | 'Warning';
}
