export type LogisticsOrderType = 'VENDOR_TO_WAREHOUSE' | 'WAREHOUSE_TO_DARKSTORE';
export type LogisticsProvider = 'PORTER' | 'SHADOWFAX' | 'LOADSHARE';
export type LogisticsStatus =
  | 'CREATED'
  | 'DRIVER_ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export interface LogisticsLocation {
  name: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
}

export interface LogisticsItem {
  name: string;
  quantity: number;
  weight?: number;
}

export interface LogisticsOrder {
  _id: string;
  referenceId: string;
  type: LogisticsOrderType;
  provider: LogisticsProvider;
  providerOrderId?: string;
  status: LogisticsStatus;
  pickup: LogisticsLocation;
  drop: LogisticsLocation;
  items: LogisticsItem[];
  vehicleType?: string;
  estimatedFare?: number;
  actualFare?: number;
  distanceKm?: number;
  driverInfo?: {
    name?: string;
    phone?: string;
    vehicleNumber?: string;
    vehicleType?: string;
  };
  createdAt?: string;
}

export interface LogisticsOrderDetailResponse {
  order: LogisticsOrder;
  history: Array<{
    _id: string;
    status: string;
    message?: string;
    source?: string;
    eventTime?: string;
  }>;
  audits: Array<{
    _id: string;
    provider: string;
    rawRequest?: unknown;
    rawResponse?: unknown;
    createdAt?: string;
  }>;
}
