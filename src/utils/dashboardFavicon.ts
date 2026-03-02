type DashboardId = 'darkstore' | 'production' | 'merch' | 'rider' | 'finance' | 'vendor' | 'warehouse' | 'admin';

interface DashboardBrand {
  initial: string;
  label: string;
  colors: [string, string]; // gradient start, gradient end
}

export const DASHBOARD_BRANDS: Record<DashboardId, DashboardBrand> = {
  darkstore:  { initial: 'D', label: 'Darkstore',   colors: ['#3B82F6', '#5289CD'] },
  production: { initial: 'P', label: 'Production',  colors: ['#16A34A', '#0D9488'] },
  merch:      { initial: 'M', label: 'Merch',       colors: ['#7C3AED', '#9333EA'] },
  rider:      { initial: 'R', label: 'Rider',       colors: ['#F97316', '#EA580C'] },
  finance:    { initial: 'F', label: 'Finance',     colors: ['#14B8A6', '#0D9488'] },
  vendor:     { initial: 'V', label: 'Vendor',      colors: ['#4F46E5', '#6366F1'] },
  warehouse:  { initial: 'W', label: 'Warehouse',   colors: ['#0891B2', '#06B6D4'] },
  admin:      { initial: 'A', label: 'Admin',       colors: ['#E11D48', '#F43F5E'] },
};

const DEFAULT_BRAND: DashboardBrand = { initial: 'S', label: 'Selorg', colors: ['#16A34A', '#0D9488'] };

export function generateFaviconSvg(dashboardId?: string): string {
  const brand = (dashboardId && DASHBOARD_BRANDS[dashboardId as DashboardId]) || DEFAULT_BRAND;
  const [c1, c2] = brand.colors;

  return [
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>",
    "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>",
    `<stop offset='0' stop-color='${c1}'/>`,
    `<stop offset='1' stop-color='${c2}'/>`,
    "</linearGradient></defs>",
    "<rect width='32' height='32' rx='7' fill='url(#g)'/>",
    `<text x='16' y='16' dy='.35em' text-anchor='middle' font-family='Recursive,system-ui,sans-serif' font-weight='800' font-size='18' fill='white'>${brand.initial}</text>`,
    "</svg>",
  ].join('');
}

export function getFaviconDataUri(dashboardId?: string): string {
  const svg = generateFaviconSvg(dashboardId);
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function setFavicon(dashboardId?: string): void {
  const href = getFaviconDataUri(dashboardId);
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function setDocumentTitle(dashboardId?: string): void {
  if (dashboardId && DASHBOARD_BRANDS[dashboardId as DashboardId]) {
    document.title = `${DASHBOARD_BRANDS[dashboardId as DashboardId].label} | Selorg Dashboard`;
  } else {
    document.title = 'Login | Selorg Dashboard';
  }
}
