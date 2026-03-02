
export type Region = 'North America' | 'Europe (West)' | 'APAC';
export type CollectionStatus = 'Live' | 'Draft' | 'Scheduled' | 'Archived';
export type CollectionType = 'Seasonal' | 'Thematic' | 'Bundle/Combo' | 'Brand';
export type SKUVisibilityStatus = 'Visible' | 'Hidden';

export interface SKU {
  id: string;
  code: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  promoPrice?: number;
  stock: number;
  visibility: Record<Region, SKUVisibilityStatus>; // Simplified for now
  imageUrl?: string;
  tags: string[];
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  type: CollectionType;
  status: CollectionStatus;
  tags: string[];
  skus: string[]; // SKU IDs
  imageUrl?: string;
  region: Region | 'Global';
  startDate?: string;
  endDate?: string;
  updatedAt: string;
  owner: string;
}
