/**
 * Lightweight pub/sub so any screen can refetch when related data changes elsewhere.
 *
 * Pattern for more modules (darkstore, warehouse, admin, …):
 * 1. Add a topic string here.
 * 2. After successful mutations in that module’s `*.api.ts`, call `emitDashboardRefresh(topic)`.
 * 3. In list/overview screens, `useOnDashboardRefresh(topic, () => void load…())`.
 */
export const DASHBOARD_TOPICS = {
  /** Vendor CRUD, QC, certificates, audits, bulk upload — refresh vendor lists & overview */
  vendor: 'vendor',
  /** Finance vendor payables: invoices, approvals, payments */
  financePayables: 'finance-payables',
} as const;

export type DashboardTopic = (typeof DASHBOARD_TOPICS)[keyof typeof DASHBOARD_TOPICS];

const listeners = new Map<string, Set<() => void>>();

export function subscribeDashboardRefresh(topic: string, fn: () => void): () => void {
  if (!listeners.has(topic)) listeners.set(topic, new Set());
  listeners.get(topic)!.add(fn);
  return () => {
    listeners.get(topic)?.delete(fn);
  };
}

export function emitDashboardRefresh(topic: string): void {
  const set = listeners.get(topic);
  if (!set) return;
  set.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error(`[dashboardRefresh] listener error (${topic})`, e);
    }
  });
}
