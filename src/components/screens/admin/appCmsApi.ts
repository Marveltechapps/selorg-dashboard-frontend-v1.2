// --- Type Definitions ---

export interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  position: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
  targetAudience: 'all' | 'new' | 'premium' | 'inactive';
  impressions: number;
  clicks: number;
}

export interface ContentPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  lastUpdated: string;
  publishedBy: string;
  isPublished: boolean;
  version: number;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  category: 'promotional' | 'transactional' | 'reminder' | 'update';
  deepLink?: string;
  imageUrl?: string;
  isActive: boolean;
  sentCount: number;
  openRate: number;
}

export interface FeaturedCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  position: number;
  isActive: boolean;
  productCount: number;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  deepLink: string;
  position: number;
  isActive: boolean;
  color: string;
}

export interface PromoCard {
  id: string;
  title: string;
  subtitle: string;
  discount: string;
  imageUrl: string;
  validUntil: string;
  code?: string;
  isActive: boolean;
  redemptions: number;
}

export interface AppSettings {
  appVersion: string;
  minAppVersion: string;
  forceUpdate: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  enableReferral: boolean;
  enableWallet: boolean;
  enableChat: boolean;
  maxCartItems: number;
}

export interface DeepLink {
  id: string;
  name: string;
  scheme: string;
  path: string;
  params: Record<string, string>;
  isActive: boolean;
  usageCount: number;
}

export interface OnboardingScreen {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  position: number;
  isActive: boolean;
}

export interface BottomNavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  position: number;
  isActive: boolean;
  badge?: string;
}

// --- Mock Data ---

const MOCK_BANNERS: Banner[] = [
  {
    id: 'BAN-001',
    title: 'Flash Sale: Up to 50% Off',
    description: 'Get amazing discounts on groceries and essentials',
    imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800',
    ctaText: 'Shop Now',
    ctaLink: '/deals',
    position: 1,
    isActive: true,
    startDate: '2024-12-20T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    targetAudience: 'all',
    impressions: 45678,
    clicks: 3421,
  },
  {
    id: 'BAN-002',
    title: 'Free Delivery on First Order',
    description: 'New users get free delivery with no minimum order',
    imageUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800',
    ctaText: 'Order Now',
    ctaLink: '/products',
    position: 2,
    isActive: true,
    startDate: '2024-12-15T00:00:00Z',
    endDate: '2025-01-15T23:59:59Z',
    targetAudience: 'new',
    impressions: 12345,
    clicks: 2134,
  },
  {
    id: 'BAN-003',
    title: 'Premium Membership - Save More',
    description: 'Join Premium and get exclusive discounts',
    imageUrl: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=800',
    ctaText: 'Learn More',
    ctaLink: '/premium',
    position: 3,
    isActive: false,
    startDate: '2024-12-01T00:00:00Z',
    endDate: '2024-12-20T23:59:59Z',
    targetAudience: 'inactive',
    impressions: 8901,
    clicks: 567,
  },
];

const MOCK_CONTENT_PAGES: ContentPage[] = [
  {
    id: 'PAGE-001',
    slug: 'about-us',
    title: 'About Us',
    content: '# About QuickCommerce\n\nWe are India\'s fastest grocery delivery service...',
    lastUpdated: '2024-12-15T10:30:00Z',
    publishedBy: 'Admin User',
    isPublished: true,
    version: 3,
  },
  {
    id: 'PAGE-002',
    slug: 'terms-of-service',
    title: 'Terms of Service',
    content: '# Terms and Conditions\n\n1. Acceptance of Terms...',
    lastUpdated: '2024-12-10T14:20:00Z',
    publishedBy: 'Legal Team',
    isPublished: true,
    version: 5,
  },
  {
    id: 'PAGE-003',
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    content: '# Privacy Policy\n\nYour privacy is important to us...',
    lastUpdated: '2024-12-05T09:15:00Z',
    publishedBy: 'Legal Team',
    isPublished: true,
    version: 4,
  },
  {
    id: 'PAGE-004',
    slug: 'faq',
    title: 'Frequently Asked Questions',
    content: '# FAQ\n\n## How fast is delivery?\nWe deliver in 10-15 minutes...',
    lastUpdated: '2024-12-18T16:45:00Z',
    publishedBy: 'Support Team',
    isPublished: true,
    version: 8,
  },
];

const MOCK_NOTIFICATIONS: NotificationTemplate[] = [
  {
    id: 'NOT-001',
    name: 'Order Delivered',
    title: 'Your order has been delivered! 🎉',
    body: 'Thank you for ordering with us. Enjoy your items!',
    category: 'transactional',
    deepLink: 'app://orders/[orderId]',
    isActive: true,
    sentCount: 15847,
    openRate: 78.5,
  },
  {
    id: 'NOT-002',
    name: 'Flash Sale Alert',
    title: 'Flash Sale Live Now! ⚡',
    body: 'Get up to 50% off on groceries. Limited time only!',
    category: 'promotional',
    deepLink: 'app://deals',
    imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400',
    isActive: true,
    sentCount: 45678,
    openRate: 45.2,
  },
  {
    id: 'NOT-003',
    name: 'Cart Reminder',
    title: 'Complete your order 🛒',
    body: 'You have items in your cart. Order now before they run out!',
    category: 'reminder',
    deepLink: 'app://cart',
    isActive: true,
    sentCount: 8901,
    openRate: 32.1,
  },
  {
    id: 'NOT-004',
    name: 'App Update Available',
    title: 'New version available 🚀',
    body: 'Update now to enjoy new features and improvements',
    category: 'update',
    deepLink: 'app://update',
    isActive: false,
    sentCount: 12345,
    openRate: 65.8,
  },
];

const MOCK_FEATURED_CATEGORIES: FeaturedCategory[] = [
  {
    id: 'CAT-001',
    name: 'Fresh Vegetables',
    slug: 'vegetables',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
    position: 1,
    isActive: true,
    productCount: 245,
  },
  {
    id: 'CAT-002',
    name: 'Dairy & Eggs',
    slug: 'dairy',
    imageUrl: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400',
    position: 2,
    isActive: true,
    productCount: 156,
  },
  {
    id: 'CAT-003',
    name: 'Snacks',
    slug: 'snacks',
    imageUrl: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400',
    position: 3,
    isActive: true,
    productCount: 389,
  },
  {
    id: 'CAT-004',
    name: 'Beverages',
    slug: 'beverages',
    imageUrl: 'https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=400',
    position: 4,
    isActive: true,
    productCount: 178,
  },
];

const MOCK_QUICK_ACTIONS: QuickAction[] = [
  { id: 'QA-001', label: 'Reorder', icon: 'RefreshCw', action: 'reorder', deepLink: 'app://reorder', position: 1, isActive: true, color: '#10b981' },
  { id: 'QA-002', label: 'Offers', icon: 'Tag', action: 'offers', deepLink: 'app://offers', position: 2, isActive: true, color: '#f59e0b' },
  { id: 'QA-003', label: 'Wallet', icon: 'Wallet', action: 'wallet', deepLink: 'app://wallet', position: 3, isActive: true, color: '#8b5cf6' },
  { id: 'QA-004', label: 'Refer', icon: 'Gift', action: 'refer', deepLink: 'app://refer', position: 4, isActive: true, color: '#ec4899' },
];

const MOCK_PROMO_CARDS: PromoCard[] = [
  {
    id: 'PROMO-001',
    title: 'First Order Free',
    subtitle: 'No delivery charges',
    discount: '₹50 OFF',
    imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400',
    validUntil: '2025-01-31T23:59:59Z',
    code: 'FIRST50',
    isActive: true,
    redemptions: 1234,
  },
  {
    id: 'PROMO-002',
    title: 'Weekend Special',
    subtitle: 'Saturday & Sunday',
    discount: '30% OFF',
    imageUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400',
    validUntil: '2024-12-31T23:59:59Z',
    code: 'WEEKEND30',
    isActive: true,
    redemptions: 567,
  },
];

const MOCK_APP_SETTINGS: AppSettings = {
  appVersion: '2.5.0',
  minAppVersion: '2.0.0',
  forceUpdate: false,
  maintenanceMode: false,
  maintenanceMessage: 'We are upgrading our systems. Please check back in 2 hours.',
  enableReferral: true,
  enableWallet: true,
  enableChat: true,
  maxCartItems: 50,
};

const MOCK_DEEP_LINKS: DeepLink[] = [
  {
    id: 'DL-001',
    name: 'Product Details',
    scheme: 'quickcommerce://',
    path: '/product/:productId',
    params: { productId: 'PRD-123' },
    isActive: true,
    usageCount: 5678,
  },
  {
    id: 'DL-002',
    name: 'Category View',
    scheme: 'quickcommerce://',
    path: '/category/:categorySlug',
    params: { categorySlug: 'vegetables' },
    isActive: true,
    usageCount: 3421,
  },
  {
    id: 'DL-003',
    name: 'Offer Details',
    scheme: 'quickcommerce://',
    path: '/offer/:offerId',
    params: { offerId: 'OFF-456' },
    isActive: true,
    usageCount: 2134,
  },
];

const MOCK_ONBOARDING: OnboardingScreen[] = [
  {
    id: 'ONB-001',
    title: 'Welcome to QuickCommerce',
    description: 'Get groceries delivered in 10 minutes',
    imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400',
    position: 1,
    isActive: true,
  },
  {
    id: 'ONB-002',
    title: 'Browse 10,000+ Products',
    description: 'From fresh produce to household essentials',
    imageUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400',
    position: 2,
    isActive: true,
  },
  {
    id: 'ONB-003',
    title: 'Track in Real-Time',
    description: 'Know exactly when your order will arrive',
    imageUrl: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=400',
    position: 3,
    isActive: true,
  },
];

const MOCK_BOTTOM_NAV: BottomNavItem[] = [
  { id: 'NAV-001', label: 'Home', icon: 'Home', route: '/home', position: 1, isActive: true },
  { id: 'NAV-002', label: 'Categories', icon: 'Grid', route: '/categories', position: 2, isActive: true },
  { id: 'NAV-003', label: 'Cart', icon: 'ShoppingCart', route: '/cart', position: 3, isActive: true, badge: '3' },
  { id: 'NAV-004', label: 'Orders', icon: 'Package', route: '/orders', position: 4, isActive: true },
  { id: 'NAV-005', label: 'Profile', icon: 'User', route: '/profile', position: 5, isActive: true },
];

// --- API Functions ---

import { apiRequest } from '@/api/apiClient';
import { API_ENDPOINTS } from '@/config/api';

export async function fetchBanners(): Promise<Banner[]> {
  const res = await apiRequest<{ success: boolean; data: any[] }>('/customer/admin/home/banners');
  return (res.data ?? []).map((b: any) => ({
    id: b._id,
    title: b.title || '',
    description: b.description || '',
    imageUrl: b.imageUrl || '',
    ctaText: b.ctaText || '',
    ctaLink: b.link || '',
    position: b.order ?? 0,
    isActive: b.isActive ?? true,
    startDate: b.startDate || '',
    endDate: b.endDate || '',
    targetAudience: 'all' as const,
    impressions: 0,
    clicks: 0,
  }));
}

export async function createBanner(banner: Partial<Banner>): Promise<Banner> {
  const res = await apiRequest<{ success: boolean; data: any }>('/customer/admin/home/banners', {
    method: 'POST',
    body: JSON.stringify({
      title: banner.title,
      imageUrl: banner.imageUrl,
      link: banner.ctaLink,
      isActive: banner.isActive,
      startDate: banner.startDate,
      endDate: banner.endDate,
      order: banner.position,
    }),
  });
  const b = res.data;
  return { ...banner, id: b._id } as Banner;
}

export async function updateBanner(id: string, banner: Partial<Banner>): Promise<Banner> {
  const res = await apiRequest<{ success: boolean; data: any }>(`/customer/admin/home/banners/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: banner.title,
      imageUrl: banner.imageUrl,
      link: banner.ctaLink,
      isActive: banner.isActive,
      startDate: banner.startDate,
      endDate: banner.endDate,
      order: banner.position,
    }),
  });
  return { ...banner, id } as Banner;
}

export async function deleteBanner(id: string): Promise<{ success: boolean }> {
  await apiRequest(`/customer/admin/home/banners/${id}`, { method: 'DELETE' });
  return { success: true };
}

export async function fetchContentPages(): Promise<ContentPage[]> {
  const res = await apiRequest<{ success: boolean; data: any[] }>(API_ENDPOINTS.customerLegal.documents);
  return (res.data ?? []).map((d: any) => ({
    id: d._id,
    slug: d.type,
    title: d.title,
    content: d.content,
    lastUpdated: d.lastUpdated || d.updatedAt || '',
    publishedBy: 'Admin',
    isPublished: d.isCurrent ?? true,
    version: parseInt(d.version) || 1,
  }));
}

export async function updateContentPage(id: string, page: Partial<ContentPage>): Promise<ContentPage> {
  const res = await apiRequest<{ success: boolean; data: any }>(API_ENDPOINTS.customerLegal.updateDocument(id), {
    method: 'PUT',
    body: JSON.stringify({
      title: page.title,
      content: page.content,
      isCurrent: page.isPublished,
    }),
  });
  const d = res.data;
  return {
    id: d._id,
    slug: d.type,
    title: d.title,
    content: d.content,
    lastUpdated: d.lastUpdated || d.updatedAt || '',
    publishedBy: 'Admin',
    isPublished: d.isCurrent ?? true,
    version: parseInt(d.version) || 1,
  };
}

export async function fetchNotificationTemplates(): Promise<NotificationTemplate[]> {
  return MOCK_NOTIFICATIONS;
}

export async function createNotificationTemplate(template: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
  return { ...template, id: `NOT-${Date.now()}`, sentCount: 0, openRate: 0 } as NotificationTemplate;
}

export async function sendNotification(templateId: string, audience: string): Promise<{ sent: number }> {
  const template = MOCK_NOTIFICATIONS.find(n => n.id === templateId);
  const res = await apiRequest<{ success: boolean; sent: number }>(API_ENDPOINTS.customerNotifications.send, {
    method: 'POST',
    body: JSON.stringify({
      title: template?.title || 'Notification',
      body: template?.body || '',
      audience,
    }),
  });
  return { sent: res.sent || 0 };
}

export async function fetchFeaturedCategories(): Promise<FeaturedCategory[]> {
  const res = await apiRequest<{ success: boolean; data: any[] }>('/customer/admin/home/categories');
  return (res.data ?? []).map((c: any) => ({
    id: c._id,
    name: c.name,
    slug: c.slug || '',
    imageUrl: c.imageUrl || '',
    position: c.order ?? 0,
    isActive: c.isActive ?? true,
    productCount: c.productCount ?? 0,
  }));
}

export async function updateFeaturedCategory(id: string, category: Partial<FeaturedCategory>): Promise<FeaturedCategory> {
  const res = await apiRequest<{ success: boolean; data: any }>(`/customer/admin/home/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: category.name,
      imageUrl: category.imageUrl,
      isActive: category.isActive,
      order: category.position,
    }),
  });
  return { ...category, id } as FeaturedCategory;
}

export async function fetchQuickActions(): Promise<QuickAction[]> {
  return MOCK_QUICK_ACTIONS;
}

export async function updateQuickAction(id: string, action: Partial<QuickAction>): Promise<QuickAction> {
  return { ...MOCK_QUICK_ACTIONS.find(q => q.id === id)!, ...action };
}

export async function fetchPromoCards(): Promise<PromoCard[]> {
  const res = await apiRequest<{ success: boolean; data: any[] }>(API_ENDPOINTS.customerCoupons.list);
  return (res.data ?? []).map((c: any) => ({
    id: c._id,
    title: c.code,
    subtitle: c.description,
    discount: c.discountType === 'percent' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`,
    imageUrl: '',
    validUntil: c.validTo || '',
    code: c.code,
    isActive: c.isActive ?? true,
    redemptions: c.usageCount || 0,
  }));
}

export async function createPromoCard(card: Partial<PromoCard>): Promise<PromoCard> {
  const res = await apiRequest<{ success: boolean; data: any }>(API_ENDPOINTS.customerCoupons.create, {
    method: 'POST',
    body: JSON.stringify({
      code: card.code || card.title,
      description: card.subtitle,
      discountType: 'percent',
      discountValue: 10,
      isActive: card.isActive,
      validTo: card.validUntil,
    }),
  });
  return { ...card, id: res.data._id } as PromoCard;
}

export async function fetchAppSettings(): Promise<AppSettings> {
  const res = await apiRequest<{ success: boolean; data: any }>(API_ENDPOINTS.customerAppConfig.get);
  const cfg = res.data;
  return {
    appVersion: cfg?.appVersion?.currentVersion ?? '1.0.0',
    minAppVersion: cfg?.appVersion?.minVersion ?? '1.0.0',
    forceUpdate: cfg?.appVersion?.forceUpdate ?? false,
    maintenanceMode: cfg?.maintenance?.isActive ?? false,
    maintenanceMessage: cfg?.maintenance?.message ?? '',
    enableReferral: cfg?.featureFlags?.enableReferral ?? true,
    enableWallet: cfg?.featureFlags?.enableWallet ?? true,
    enableChat: cfg?.featureFlags?.enableChat ?? true,
    maxCartItems: cfg?.featureFlags?.maxCartItems ?? 50,
  };
}

export async function updateAppSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const body: Record<string, unknown> = {};
  if (settings.appVersion !== undefined || settings.minAppVersion !== undefined || settings.forceUpdate !== undefined) {
    body.appVersion = {
      currentVersion: settings.appVersion,
      minVersion: settings.minAppVersion,
      forceUpdate: settings.forceUpdate,
    };
  }
  if (settings.maintenanceMode !== undefined || settings.maintenanceMessage !== undefined) {
    body.maintenance = {
      isActive: settings.maintenanceMode,
      message: settings.maintenanceMessage,
    };
  }
  if (settings.enableReferral !== undefined || settings.enableWallet !== undefined || settings.enableChat !== undefined || settings.maxCartItems !== undefined) {
    body.featureFlags = {
      enableReferral: settings.enableReferral,
      enableWallet: settings.enableWallet,
      enableChat: settings.enableChat,
      maxCartItems: settings.maxCartItems,
    };
  }
  await apiRequest(API_ENDPOINTS.customerAppConfig.update, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return await fetchAppSettings();
}

export async function fetchDeepLinks(): Promise<DeepLink[]> {
  return MOCK_DEEP_LINKS;
}

export async function createDeepLink(link: Partial<DeepLink>): Promise<DeepLink> {
  return { ...link, id: `DL-${Date.now()}`, usageCount: 0 } as DeepLink;
}

export async function fetchOnboardingScreens(): Promise<OnboardingScreen[]> {
  const res = await apiRequest<{ success: boolean; data: any[] }>(
    API_ENDPOINTS.onboarding.list
  );
  return (res.data ?? []).map((d: any) => ({
    id: d._id,
    title: d.title,
    description: d.description,
    imageUrl: d.imageUrl,
    position: d.order ?? d.pageNumber,
    isActive: d.isActive ?? true,
    ctaText: d.ctaText ?? undefined,
  }));
}

export async function createOnboardingScreen(
  screen: Partial<OnboardingScreen>
): Promise<OnboardingScreen> {
  const res = await apiRequest<{ success: boolean; data: any }>(
    API_ENDPOINTS.onboarding.create,
    {
      method: 'POST',
      body: JSON.stringify({
        title: screen.title,
        description: screen.description,
        imageUrl: screen.imageUrl ?? '',
        ctaText: (screen as any).ctaText ?? undefined,
        isActive: screen.isActive !== false,
      }),
    }
  );
  const d = res.data;
  return {
    id: d._id,
    title: d.title,
    description: d.description,
    imageUrl: d.imageUrl,
    position: d.order ?? d.pageNumber,
    isActive: d.isActive ?? true,
  };
}

export async function updateOnboardingScreen(
  id: string,
  screen: Partial<OnboardingScreen>
): Promise<OnboardingScreen> {
  const body: Record<string, unknown> = {};
  if (screen.title !== undefined) body.title = screen.title;
  if (screen.description !== undefined) body.description = screen.description;
  if (screen.imageUrl !== undefined) body.imageUrl = screen.imageUrl;
  if (screen.isActive !== undefined) body.isActive = screen.isActive;
  if ((screen as any).ctaText !== undefined) body.ctaText = (screen as any).ctaText;

  const res = await apiRequest<{ success: boolean; data: any }>(
    API_ENDPOINTS.onboarding.update(id),
    { method: 'PUT', body: JSON.stringify(body) }
  );
  const d = res.data;
  return {
    id: d._id,
    title: d.title,
    description: d.description,
    imageUrl: d.imageUrl,
    position: d.order ?? d.pageNumber,
    isActive: d.isActive ?? true,
  };
}

export async function deleteOnboardingScreen(id: string): Promise<void> {
  await apiRequest<{ success: boolean }>(
    API_ENDPOINTS.onboarding.delete(id),
    { method: 'DELETE' }
  );
}

export async function reorderOnboardingScreens(orderedIds: string[]): Promise<OnboardingScreen[]> {
  const res = await apiRequest<{ success: boolean; data: any[] }>(
    API_ENDPOINTS.onboarding.reorder,
    { method: 'PUT', body: JSON.stringify({ order: orderedIds }) }
  );
  return (res.data ?? []).map((d: any) => ({
    id: d._id,
    title: d.title,
    description: d.description,
    imageUrl: d.imageUrl,
    position: d.order ?? d.pageNumber,
    isActive: d.isActive ?? true,
  }));
}

export async function fetchBottomNavItems(): Promise<BottomNavItem[]> {
  // TODO: Implement backend endpoint for bottom nav items
  return [];
}

export async function updateBottomNavItem(id: string, item: Partial<BottomNavItem>): Promise<BottomNavItem> {
  // TODO: Implement backend endpoint for bottom nav items
  throw new Error('Not implemented');
}
