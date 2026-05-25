const REGION_MAP: Record<string, string> = {
  'north america': 'na',
  'europe': 'eu',
  apac: 'all',
  na: 'na',
  eu: 'eu',
  all: 'all',
};

export function capitalizeType(type: string): string {
  const raw = (type || 'discount').trim();
  if (!raw) return 'Discount';
  return raw
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function buildCampaignPayload(data: Record<string, unknown>, status: string) {
  const period =
    data.startDate && data.endDate
      ? `${new Date(data.startDate as string | Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(data.endDate as string | Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : 'TBD';

  const normalizedSkus = Array.isArray(data.skus)
    ? data.skus
        .map((sku: unknown) => {
          if (typeof sku === 'string') return sku;
          if (sku && typeof sku === 'object') {
            const s = sku as Record<string, unknown>;
            return {
              sku: String(s.sku || s.code || s.id || s._id || ''),
              name: String(s.name || ''),
              category: String(s.category || 'General'),
              basePrice: Number(s.basePrice ?? s.base ?? 0),
              promoPrice: Number(s.promoPrice ?? s.sell ?? s.sellingPrice ?? s.basePrice ?? 0),
            };
          }
          return null;
        })
        .filter(Boolean)
    : [];

  const regionLabel = String(data.region || 'North America');
  const regionCode = REGION_MAP[regionLabel.toLowerCase()] || 'na';
  const typeRaw = String(data.type || 'discount').toLowerCase();
  const campaignCategory = typeRaw.includes('clearance') ? 'clearance' : 'promo';
  const discountValue = data.discountValue != null && data.discountValue !== '' ? Number(data.discountValue) : null;

  const discountType = String(data.discountType || 'percentage').toLowerCase();
  let discountLogic = 'Flat 20% Off';
  if (discountValue != null && !Number.isNaN(discountValue)) {
    if (discountType === 'flat') discountLogic = `Flat ₹${discountValue} Off`;
    else if (discountType === 'bogo') discountLogic = 'Buy One Get One';
    else if (discountType === 'tiered') discountLogic = `Tiered ${discountValue}% Off`;
    else discountLogic = `${discountValue}% Off`;
  }

  return {
    name: String(data.name || 'Untitled Campaign'),
    tagline: String(data.description || 'New Promotion'),
    status,
    period,
    endsAt: data.endDate ? new Date(data.endDate as string | Date).toISOString() : undefined,
    target:
      String(data.target || '') ||
      (normalizedSkus.length ? `${normalizedSkus.length} SKUs` : 'Selected SKUs'),
    scope: regionLabel,
    region: regionCode,
    channel: 'all',
    campaignCategory,
    type: capitalizeType(typeRaw),
    owner: {
      name: String(data.owner || 'Muthu'),
      initial: String(data.owner || 'M').charAt(0).toUpperCase(),
    },
    kpi: { label: 'Revenue Uplift', value: '0%', trend: 'neutral' as const },
    rules: {
      discountLogic,
      minOrder: data.minOrderValue ? `₹${data.minOrderValue}` : '$0.00',
      segment: 'All Customers',
      stackable: false,
    },
    skus: normalizedSkus,
    discountType,
    discountValue: discountValue ?? undefined,
    minOrderValue: data.minOrderValue,
    ...(discountValue != null && !Number.isNaN(discountValue)
      ? { performance: { discountDepth: discountValue, uplift: 0, revenue: 0, roi: 0 } }
      : {}),
  };
}
