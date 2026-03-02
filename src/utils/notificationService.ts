import { getAuthUser } from '../contexts/AuthContext';

type DashboardRole =
  | 'darkstore'
  | 'production'
  | 'merch'
  | 'rider'
  | 'finance'
  | 'vendor'
  | 'warehouse'
  | 'admin'
  | 'super_admin';

interface DashboardBranding {
  title: string;
  color: string;
  badge: string;
}

const DASHBOARD_BRANDING: Record<string, DashboardBranding> = {
  darkstore: { title: 'Selorg Darkstore', color: '#16A34A', badge: 'DS' },
  production: { title: 'Selorg Production', color: '#9333EA', badge: 'PR' },
  merch: { title: 'Selorg Merch', color: '#E11D48', badge: 'MR' },
  rider: { title: 'Selorg Rider', color: '#EA580C', badge: 'RD' },
  finance: { title: 'Selorg Finance', color: '#2563EB', badge: 'FN' },
  vendor: { title: 'Selorg Vendor', color: '#0891B2', badge: 'VN' },
  warehouse: { title: 'Selorg Warehouse', color: '#CA8A04', badge: 'WH' },
  admin: { title: 'Selorg Admin', color: '#DC2626', badge: 'AD' },
  super_admin: { title: 'Selorg Admin', color: '#DC2626', badge: 'AD' },
};

function buildIconDataUri(color: string, badge: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="14" fill="${color}"/>
    <text x="32" y="32" dy=".35em" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="22" fill="white">${badge}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const iconCache = new Map<string, string>();

function getIconForRole(role: string): string {
  if (iconCache.has(role)) return iconCache.get(role)!;
  const branding = DASHBOARD_BRANDING[role] || DASHBOARD_BRANDING.admin;
  const uri = buildIconDataUri(branding.color, branding.badge);
  iconCache.set(role, uri);
  return uri;
}

function getBranding(role?: string): DashboardBranding {
  return DASHBOARD_BRANDING[role || 'admin'] || DASHBOARD_BRANDING.admin;
}

class NotificationService {
  private permissionGranted = false;

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      return true;
    }
    if (Notification.permission === 'denied') return false;

    const result = await Notification.requestPermission();
    this.permissionGranted = result === 'granted';
    return this.permissionGranted;
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }

  hasPermission(): boolean {
    return this.isSupported() && Notification.permission === 'granted';
  }

  show(title: string, options?: NotificationOptions & { onClick?: () => void }): Notification | null {
    if (!this.hasPermission()) return null;

    const user = getAuthUser();
    const role = user?.role || 'admin';
    const branding = getBranding(role);
    const icon = getIconForRole(role);

    const prefixedTitle = `${branding.title} — ${title}`;

    const { onClick, ...nativeOptions } = options || {};

    const notification = new Notification(prefixedTitle, {
      icon,
      badge: icon,
      ...nativeOptions,
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    } else {
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    return notification;
  }

  showOrderCreated(data: { order_id?: string; customer_name?: string; total_bill?: number; item_count?: number }): Notification | null {
    const orderId = data.order_id || 'Unknown';
    const customer = data.customer_name || 'Customer';
    const amount = data.total_bill ? `₹${data.total_bill.toLocaleString('en-IN')}` : '';
    const items = data.item_count || 0;

    return this.show('New Order Placed', {
      body: `Order #${orderId} by ${customer}${amount ? ` — ${amount}` : ''}${items ? ` (${items} item${items > 1 ? 's' : ''})` : ''}`,
      tag: `order-created-${orderId}`,
      requireInteraction: false,
    });
  }

  showOrderUpdated(data: { order_id?: string; status?: string; customer_name?: string }): Notification | null {
    const orderId = data.order_id || 'Unknown';
    const status = data.status || 'updated';
    const customer = data.customer_name || '';

    const statusLabel = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return this.show('Order Updated', {
      body: `Order #${orderId}${customer ? ` (${customer})` : ''} → ${statusLabel}`,
      tag: `order-updated-${orderId}`,
    });
  }

  showOrderCancelled(data: { order_id?: string; customer_name?: string; reason?: string }): Notification | null {
    const orderId = data.order_id || 'Unknown';
    const customer = data.customer_name || '';
    const reason = data.reason || '';

    return this.show('Order Cancelled', {
      body: `Order #${orderId}${customer ? ` by ${customer}` : ''}${reason ? ` — ${reason}` : ''}`,
      tag: `order-cancelled-${orderId}`,
    });
  }

  showPaymentCreated(data: { orderId?: string; amount?: number; methodDisplay?: string; customerName?: string; status?: string }): Notification | null {
    const amount = data.amount ? `₹${data.amount.toLocaleString('en-IN')}` : '';
    const method = data.methodDisplay || '';
    const customer = data.customerName || '';

    return this.show('New Payment Received', {
      body: `${amount}${method ? ` via ${method}` : ''}${customer ? ` from ${customer}` : ''}${data.orderId ? ` (Order #${data.orderId})` : ''}`,
      tag: `payment-${data.orderId || Date.now()}`,
    });
  }

  showCustomerRegistered(data: { name?: string; email?: string }): Notification | null {
    return this.show('New Customer Registered', {
      body: `${data.name || 'A new customer'}${data.email ? ` (${data.email})` : ''} just signed up`,
      tag: `customer-registered-${Date.now()}`,
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
