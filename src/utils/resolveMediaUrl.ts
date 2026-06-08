import { resolveApiBaseUrl } from '@/config/api';

function getApiOrigin(): string {
  const base = resolveApiBaseUrl().trim();
  if (/^https?:\/\//i.test(base)) {
    try {
      return new URL(base).origin;
    } catch {
      return typeof window !== 'undefined' ? window.location.origin : '';
    }
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}

/**
 * Resolve picker/rider document and image URLs for dashboard <img> tags.
 * Handles absolute URLs, data URIs, and backend-relative `/uploads/...` paths.
 */
export function resolveMediaUrl(input?: string | null): string | null {
  if (input == null) return null;
  let url = input.trim();
  if (!url) return null;

  if (url.startsWith('data:')) return url;

  if (/^https?:\/(?!\/)/i.test(url)) {
    url = url.replace(/^https?:\/(?!\/)/i, (m) => `${m}/`);
  }
  if (/^www\./i.test(url)) {
    url = `https://${url}`;
  }

  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;

  if (url.startsWith('/uploads/') || url.startsWith('/static/')) {
    return url;
  }

  const origin = getApiOrigin();
  if (url.startsWith('/')) return `${origin}${url}`;
  if (/^uploads\//i.test(url)) return `${origin}/${url}`;

  return url;
}

export type PickerDocSidePayload =
  | string
  | {
      url?: string | null;
      documentUrl?: string | null;
      fileUrl?: string | null;
      status?: string;
      rejectionReason?: string | null;
      reviewedAt?: string | null;
    }
  | null
  | undefined;

export function normalizePickerDocSide(
  payload: PickerDocSidePayload
): { url: string | null; status?: string; rejectionReason?: string | null; reviewedAt?: string | null } | null {
  if (payload == null) return null;
  if (typeof payload === 'string') {
    const url = resolveMediaUrl(payload);
    return url ? { url, status: 'pending' } : null;
  }
  const raw =
    payload.url ?? payload.documentUrl ?? payload.fileUrl ?? null;
  const url = resolveMediaUrl(raw);
  if (!url) return null;
  return {
    url,
    status: payload.status,
    rejectionReason: payload.rejectionReason ?? null,
    reviewedAt: payload.reviewedAt ?? null,
  };
}
