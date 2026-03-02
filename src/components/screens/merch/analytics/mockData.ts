import { CampaignData, SkuData, RegionalData, ChartData } from './types';

export const CAMPAIGN_DATA: CampaignData[] = [
  { id: '1', name: 'Summer Heatwave', type: 'Discount', status: 'Active', revenue: 45200, uplift: 18.5, redemptionRate: 42, roi: 3.2 },
  { id: '2', name: 'Back to School Bundle', type: 'Bundle', status: 'Active', revenue: 32150, uplift: 12.0, redemptionRate: 28, roi: 2.8 },
  { id: '3', name: 'Flash Friday', type: 'Flash Sale', status: 'Ended', revenue: 12500, uplift: 45.2, redemptionRate: 65, roi: 5.1 },
  { id: '4', name: 'Loyalty Bonus', type: 'Loyalty', status: 'Active', revenue: 28900, uplift: 5.5, redemptionRate: 15, roi: 4.0 },
  { id: '5', name: 'Winter Clearance', type: 'Discount', status: 'Scheduled', revenue: 0, uplift: 0, redemptionRate: 0, roi: 0 },
];

export const SKU_DATA: SkuData[] = [
  { id: '1', name: 'Organic Bananas', code: 'BAN-001', category: 'Produce', unitsSold: 1250, revenue: 1125, margin: 30, stock: 500, daysCover: 3, promoImpact: 15 },
  { id: '2', name: 'Whole Milk 2L', code: 'DAI-002', category: 'Dairy', unitsSold: 980, revenue: 2940, margin: 25, stock: 200, daysCover: 2, promoImpact: 5 },
  { id: '3', name: 'Avocados (Pack of 4)', code: 'PRO-003', category: 'Produce', unitsSold: 850, revenue: 4250, margin: 40, stock: 150, daysCover: 4, promoImpact: 25 },
  { id: '4', name: 'Sourdough Bread', code: 'BAK-004', category: 'Bakery', unitsSold: 600, revenue: 3000, margin: 50, stock: 40, daysCover: 1, promoImpact: 10 },
  { id: '5', name: 'Sparkling Water 12pk', code: 'BEV-005', category: 'Beverages', unitsSold: 450, revenue: 3600, margin: 35, stock: 120, daysCover: 10, promoImpact: 30 },
  { id: '6', name: 'Free Range Eggs', code: 'DAI-006', category: 'Dairy', unitsSold: 420, revenue: 2520, margin: 20, stock: 80, daysCover: 5, promoImpact: 8 },
  { id: '7', name: 'Ground Coffee', code: 'BEV-007', category: 'Beverages', unitsSold: 300, revenue: 4500, margin: 60, stock: 200, daysCover: 20, promoImpact: 12 },
  { id: '8', name: 'Olive Oil 1L', code: 'PAN-008', category: 'Pantry', unitsSold: 150, revenue: 2250, margin: 45, stock: 300, daysCover: 45, promoImpact: 20 },
];

export const REGIONAL_DATA: RegionalData[] = [
  { id: '1', name: 'Downtown Core', revenue: 125000, orders: 4500, aov: 27.78, redemptionRate: 35, newCustomers: 450, returningCustomers: 4050, storeType: 'Flagship' },
  { id: '2', name: 'West End', revenue: 98000, orders: 3200, aov: 30.62, redemptionRate: 28, newCustomers: 300, returningCustomers: 2900, storeType: 'Dark Store' },
  { id: '3', name: 'North Hills', revenue: 75000, orders: 2100, aov: 35.71, redemptionRate: 22, newCustomers: 150, returningCustomers: 1950, storeType: 'Dark Store' },
  { id: '4', name: 'Eastside', revenue: 62000, orders: 2800, aov: 22.14, redemptionRate: 40, newCustomers: 600, returningCustomers: 2200, storeType: 'Flagship' },
];

export const CAMPAIGN_CHART_DATA: ChartData[] = [
  { name: 'Mon', revenue: 4000, uplift: 10 },
  { name: 'Tue', revenue: 3000, uplift: 8 },
  { name: 'Wed', revenue: 5000, uplift: 15 },
  { name: 'Thu', revenue: 4500, uplift: 12 },
  { name: 'Fri', revenue: 8000, uplift: 25 },
  { name: 'Sat', revenue: 9500, uplift: 30 },
  { name: 'Sun', revenue: 8500, uplift: 22 },
];

export const SKU_CHART_DATA: ChartData[] = [
  { name: 'Bananas', units: 1250 },
  { name: 'Milk', units: 980 },
  { name: 'Avocados', units: 850 },
  { name: 'Bread', units: 600 },
  { name: 'Water', units: 450 },
];

export const REGIONAL_CHART_DATA: ChartData[] = [
  { name: 'Downtown', revenue: 125000, uplift: 15000 },
  { name: 'West End', revenue: 98000, uplift: 8000 },
  { name: 'North', revenue: 75000, uplift: 5000 },
  { name: 'East', revenue: 62000, uplift: 12000 },
];
