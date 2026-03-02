export type ReportType = 'Campaign' | 'SKU' | 'Regional' | 'Full';
export type DateRange = 'Today' | 'Last 7 Days' | 'Last 30 Days' | 'Custom';
export type Frequency = 'Daily' | 'Weekly' | 'Monthly';

export interface KPI {
  label: string;
  value: string;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export interface ChartData {
  name: string;
  [key: string]: string | number;
}

export interface CampaignData {
  id: string;
  name: string;
  type: string;
  status: 'Active' | 'Ended' | 'Scheduled';
  revenue: number;
  uplift: number;
  redemptionRate: number;
  roi: number;
}

export interface SkuData {
  id: string;
  name: string;
  code: string;
  category: string;
  unitsSold: number;
  revenue: number;
  margin: number;
  stock: number;
  daysCover: number;
  promoImpact: number;
}

export interface RegionalData {
  id: string;
  name: string;
  revenue: number;
  orders: number;
  aov: number;
  redemptionRate: number;
  newCustomers: number;
  returningCustomers: number;
  storeType: 'Flagship' | 'Dark Store';
}
