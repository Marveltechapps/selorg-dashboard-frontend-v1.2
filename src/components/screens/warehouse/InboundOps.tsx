import React, { useState, useEffect, useCallback } from 'react';
import { ArrowDownToLine, Truck, ClipboardList, CheckCircle2, AlertOctagon, X, Plus, Search, Download } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import {
  fetchGRNs,
  createGRN as apiCreateGRN,
  startGRN as apiStartGRN,
  completeGRN as apiCompleteGRN,
  logGRNDiscrepancy as apiLogGRNDiscrepancy,
  fetchDocks,
  fetchGRNById,
  fetchInboundSummary,
  updateDock,
  exportInboundGrnsCsv,
  GRN,
  DockSlot,
  DockActiveGrn,
  InboundSummary,
} from './warehouseApi';

function getDockBadgeLabel(dock: DockSlot): string {
  const fromId = dock.id.match(/(?:DOCK-?|^D)?(\d+)$/i);
  if (fromId) return fromId[1];
  const fromName = dock.name.match(/(\d+)/);
  if (fromName) return fromName[1];
  const stripped = dock.id.replace(/^DOCK-?/i, '');
  return stripped.length <= 4 ? stripped : dock.id.slice(0, 3);
}

function formatGrnStatusLabel(status: GRN['status']): string {
  switch (status) {
    case 'discrepancy':
      return 'Discrepancy';
    case 'completed':
      return 'Completed';
    case 'in-progress':
      return 'Counting';
    default:
      return 'Pending';
  }
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function dockSecondaryLine(dock: DockSlot): string {
  if (dock.status === 'offline') return 'Technician assigned';
  if (dock.truck) return `Vehicle: ${dock.truck}`;
  if (dock.eta) return `ETA: ${dock.eta}`;
  if (dock.status === 'empty') return 'Available';
  return 'Awaiting vehicle';
}

const EMPTY_SUMMARY: InboundSummary = {
  pendingGRNs: 0,
  inProgressGRNs: 0,
  putawayPendingItems: 0,
  putawayPendingGrns: 0,
  dockTotal: 0,
  dockActive: 0,
  dockUtilizationPercent: 0,
};

export function InboundOps() {
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [showStartCountModal, setShowStartCountModal] = useState(false);
  const [grnToStart, setGrnToStart] = useState<GRN | null>(null);
  const [startDockId, setStartDockId] = useState('');
  const [startTruck, setStartTruck] = useState('');
  const [startEta, setStartEta] = useState('');
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [selectedGRNForDiscrepancy, setSelectedGRNForDiscrepancy] = useState<GRN | null>(null);
  const [docsGrn, setDocsGrn] = useState<(GRN & { discrepancyNotes?: string; discrepancyType?: string }) | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');
  const [discrepancyType, setDiscrepancyType] = useState('quantity');
  const [submittingDiscrepancy, setSubmittingDiscrepancy] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [grns, setGrns] = useState<GRN[]>([]);
  const [dockSlots, setDockSlots] = useState<DockSlot[]>([]);
  const [dockFieldEdits, setDockFieldEdits] = useState<
    Record<string, { truck: string; eta: string; status: DockSlot['status'] }>
  >({});
  const [summary, setSummary] = useState<InboundSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [savingDockId, setSavingDockId] = useState<string | null>(null);
  const [creatingGrn, setCreatingGrn] = useState(false);

  const [newGRNData, setNewGRNData] = useState({ poNumber: '', vendor: '', items: '' });

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [gData, dData] = await Promise.all([fetchGRNs({ queueOnly: true }), fetchDocks()]);
      setGrns(gData);
      setDockSlots(dData);
      const edits: Record<string, { truck: string; eta: string; status: DockSlot['status'] }> = {};
      for (const d of dData) {
        edits[d.id] = { truck: d.truck ?? '', eta: d.eta ?? '', status: d.status };
      }
      setDockFieldEdits(edits);

      try {
        setSummary(await fetchInboundSummary());
      } catch {
        const activeDocks = dData.filter((d) => d.status === 'active').length;
        setSummary({
          pendingGRNs: gData.filter((g) => g.status === 'pending').length,
          inProgressGRNs: gData.filter((g) => g.status === 'in-progress').length,
          putawayPendingItems: gData
            .filter((g) => g.status === 'completed')
            .reduce((sum, g) => sum + (g.items ?? 0), 0),
          putawayPendingGrns: gData.filter((g) => g.status === 'completed').length,
          dockTotal: dData.length,
          dockActive: activeDocks,
          dockUtilizationPercent:
            dData.length > 0 ? Math.round((activeDocks / dData.length) * 100) : 0,
        });
      }
    } catch {
      if (!opts?.silent) {
        toast.error('Failed to load inbound data');
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData({ silent: true }), 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const createGRN = async () => {
    const poNumber = newGRNData.poNumber.trim();
    const vendor = newGRNData.vendor.trim();
    const items = Number(newGRNData.items || 0);

    if (!poNumber) {
      toast.error('PO Number is required');
      return;
    }
    if (!vendor) {
      toast.error('Vendor Name is required');
      return;
    }
    if (!Number.isFinite(items) || items < 0) {
      toast.error('Number of items must be a non-negative number');
      return;
    }

    setCreatingGrn(true);
    try {
      await apiCreateGRN({ poNumber, vendor, items });
      toast.success('GRN created successfully');
      setShowGRNModal(false);
      setNewGRNData({ poNumber: '', vendor: '', items: '' });
      await loadData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create GRN');
    } finally {
      setCreatingGrn(false);
    }
  };

  const openStartCountModal = (grn: GRN) => {
    const firstEmpty = dockSlots.find((d) => d.status === 'empty' && !d.grnId);
    setGrnToStart(grn);
    setStartDockId(firstEmpty?.id ?? '');
    setStartTruck('');
    setStartEta('');
    setShowStartCountModal(true);
  };

  const confirmStartCount = async () => {
    if (!grnToStart) return;
    if (!startDockId) {
      toast.error('Select an available dock');
      return;
    }
    setActionLoadingId(grnToStart.id);
    try {
      const { dock } = await apiStartGRN(grnToStart.id, {
        dockId: startDockId,
        truck: startTruck.trim() || undefined,
        eta: startEta.trim() || undefined,
      });
      toast.success(`${grnToStart.poNumber} assigned to ${dock.name}`);
      setShowStartCountModal(false);
      setGrnToStart(null);
      await loadData({ silent: true });
      requestAnimationFrame(() => {
        document.getElementById(`dock-card-${dock.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start counting');
    } finally {
      setActionLoadingId(null);
    }
  };

  const resumeCountOnDock = async (grn: DockActiveGrn) => {
    setActionLoadingId(grn.id);
    try {
      await apiStartGRN(grn.id, grn.dockId ? { dockId: grn.dockId } : undefined);
      toast.success('Counting resumed on dock');
      await loadData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resume counting');
    } finally {
      setActionLoadingId(null);
    }
  };

  const completeGRNHandler = async (id: string) => {
    setActionLoadingId(id);
    try {
      await apiCompleteGRN(id);
      toast.success('GRN completed');
      await loadData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete GRN');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openDiscrepancyModal = async (grn: GRN | DockActiveGrn) => {
    setSelectedGRNForDiscrepancy(grn);
    setDiscrepancyNotes('');
    setDiscrepancyType('quantity');
    setShowDiscrepancyModal(true);
    if (grn.status === 'discrepancy') {
      try {
        const details = await fetchGRNById(grn.id);
        if (details.discrepancyNotes) setDiscrepancyNotes(details.discrepancyNotes);
        if (details.discrepancyType) setDiscrepancyType(details.discrepancyType);
      } catch {
        /* keep empty defaults */
      }
    }
  };

  const closeDiscrepancyModal = () => {
    setShowDiscrepancyModal(false);
    setSelectedGRNForDiscrepancy(null);
    setDiscrepancyNotes('');
  };

  const submitDiscrepancy = async () => {
    if (!selectedGRNForDiscrepancy) return;
    setSubmittingDiscrepancy(true);
    try {
      await apiLogGRNDiscrepancy(selectedGRNForDiscrepancy.id, {
        notes: discrepancyNotes.trim(),
        type: discrepancyType,
      });
      toast.success('Discrepancy logged successfully');
      closeDiscrepancyModal();
      await loadData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to log discrepancy');
    } finally {
      setSubmittingDiscrepancy(false);
    }
  };

  const openDocs = async (grn: GRN) => {
    setShowDocsModal(true);
    setDocsLoading(true);
    setDocsGrn(null);
    try {
      const details = await fetchGRNById(grn.id);
      setDocsGrn(details);
    } catch {
      setDocsGrn(grn);
      toast.error('Could not load full GRN details');
    } finally {
      setDocsLoading(false);
    }
  };

  const downloadCsv = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportData = async () => {
    const today = new Date().toISOString().split('T')[0];
    setExporting(true);
    try {
      try {
        const csv = await exportInboundGrnsCsv();
        if (csv.trim()) {
          downloadCsv(csv, `inbound-grns-${today}.csv`);
          toast.success('Export downloaded');
          return;
        }
      } catch {
        /* use client-built export below */
      }

      const allGrns = await fetchGRNs();
      const csvData = [
      ['Inbound Operations Report', `Date: ${today}`],
      [''],
      ['GRN ID', 'PO Number', 'Vendor', 'Status', 'Items', 'Dock', 'Timestamp'],
      ...allGrns.map((g) => [
        g.id,
        g.poNumber,
        g.vendor,
        g.status,
        String(g.items ?? 0),
        g.dockId ?? '',
        g.timestamp,
      ]),
      [''],
      ['Dock Schedule'],
      ['Dock ID', 'Name', 'Status', 'Vehicle/Vendor'],
      ...dockSlots.map((d) => [d.id, d.name, d.status, d.truck || d.vendor || 'N/A']),
    ];
      downloadCsv(csvData.map((row) => row.join(',')).join('\n'), `inbound-ops-${today}.csv`);
      toast.success('Export downloaded');
    } finally {
      setExporting(false);
    }
  };

  const saveDockFields = async (dockId: string) => {
    const fields = dockFieldEdits[dockId];
    const dock = dockSlots.find((d) => d.id === dockId);
    if (!fields || !dock) return;

    const releasingGrn =
      fields.status === 'empty' && Boolean(dock.grnId || dock.activeGrn);
    if (
      releasingGrn &&
      !window.confirm(
        `Release ${dock.activeGrn?.poNumber ?? dock.grnId ?? 'GRN'} from ${dock.name}? It will return to the processing queue.`
      )
    ) {
      return;
    }

    setSavingDockId(dockId);
    try {
      await updateDock(dockId, {
        status: fields.status,
        truck: fields.truck.trim() || undefined,
        eta: fields.eta.trim() || undefined,
      });
      toast.success(
        releasingGrn ? `${dock.name} cleared — GRN back in queue` : `${dock.name} updated`
      );
      await loadData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update dock');
    } finally {
      setSavingDockId(null);
    }
  };

  const emptyDocks = dockSlots.filter((d) => d.status === 'empty' && !d.grnId);

  const filteredGRNs = grns.filter(
    (g) =>
      g.status === 'pending' &&
      (g.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pendingCount =
    summary.pendingGRNs || grns.filter((g) => g.status === 'pending').length;
  const dockUtilization =
    summary.dockTotal > 0
      ? summary.dockUtilizationPercent
      : dockSlots.length
        ? Math.round(
            (dockSlots.filter((d) => d.status === 'active').length / dockSlots.length) * 100
          )
        : 0;
  const putawayItems =
    summary.putawayPendingItems ||
    grns.filter((g) => g.status === 'completed').reduce((sum, g) => sum + (g.items ?? 0), 0);

  if (loading && grns.length === 0 && dockSlots.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891b2]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbound Operations"
        subtitle="Manage goods receiving notes (GRN), dock schedules, and inbound quality checks"
        actions={
          <div className="flex gap-3">
            <button
              onClick={exportData}
              disabled={exporting}
              className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC] flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Export'}
            </button>
            <button
              onClick={() => setShowGRNModal(true)}
              className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
            >
              <ClipboardList size={16} />
              Create GRN
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
            <ArrowDownToLine size={24} />
          </div>
          <div>
            <p className="text-[#64748B] text-sm font-medium">Pending GRNs</p>
            <h3 className="text-2xl font-bold text-[#1E293B]">{pendingCount}</h3>
            {summary.inProgressGRNs > 0 && (
              <p className="text-xs text-[#64748B] mt-1">{summary.inProgressGRNs} in counting</p>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
            <Truck size={24} />
          </div>
          <div>
            <p className="text-[#64748B] text-sm font-medium">Dock Utilization</p>
            <h3 className="text-2xl font-bold text-[#1E293B]">{dockUtilization}%</h3>
            {summary.dockTotal > 0 && (
              <p className="text-xs text-[#64748B] mt-1">
                {summary.dockActive} of {summary.dockTotal} docks active
              </p>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-cyan-100 text-cyan-700 rounded-lg">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[#64748B] text-sm font-medium">Putaway Pending</p>
            <h3 className="text-2xl font-bold text-[#1E293B]">{putawayItems} Items</h3>
            {summary.putawayPendingGrns > 0 && (
              <p className="text-xs text-[#64748B] mt-1">
                across {summary.putawayPendingGrns} completed GRN
                {summary.putawayPendingGrns === 1 ? '' : 's'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h3 className="font-bold text-[#1E293B]">Dock Schedule</h3>
            <p className="text-xs text-[#64748B] mt-1">
              Active GRNs appear here after Start Count. Manage each dock on its card.
            </p>
          </div>
          <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
            {dockSlots.length === 0 ? (
              <div className="py-8 text-center text-[#64748B] text-sm">No dock slots configured</div>
            ) : (
              dockSlots.map((dock) => {
                const grn = dock.activeGrn;
                const fields = dockFieldEdits[dock.id] ?? {
                  truck: dock.truck ?? '',
                  eta: dock.eta ?? '',
                  status: dock.status,
                };
                const hasAssignedGrn = Boolean(grn || dock.grnId);
                const isDiscrepancy = grn?.status === 'discrepancy';

                return (
                  <div
                    key={dock.id}
                    id={`dock-card-${dock.id}`}
                    className={`p-4 border rounded-lg space-y-3 ${
                      isDiscrepancy
                        ? 'bg-red-50 border-red-200'
                        : hasAssignedGrn
                          ? 'bg-green-50 border-green-200'
                          : dock.status === 'offline'
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-white border-[#E2E8F0]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          title={dock.name || dock.id}
                          className={`size-8 shrink-0 flex items-center justify-center rounded font-bold text-[11px] leading-none overflow-hidden ${
                            hasAssignedGrn
                              ? isDiscrepancy
                                ? 'bg-red-200 text-red-700'
                                : 'bg-green-200 text-green-700'
                              : dock.status === 'offline'
                                ? 'bg-amber-200 text-amber-700'
                                : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <span className="max-w-full truncate px-0.5">{getDockBadgeLabel(dock)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#1E293B]">{dock.name}</p>
                          {hasAssignedGrn && grn ? (
                            <p className="text-xs text-[#64748B] truncate">
                              {grn.id} • {grn.poNumber} • {grn.vendor}
                            </p>
                          ) : (
                            <p className="text-xs text-[#64748B]">{dockSecondaryLine(dock)}</p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-bold shrink-0 ${
                          isDiscrepancy
                            ? 'text-red-600'
                            : hasAssignedGrn
                              ? 'text-green-700'
                              : dock.status === 'offline'
                                ? 'text-amber-700'
                                : 'text-gray-500'
                        }`}
                      >
                        {isDiscrepancy
                          ? 'Issue'
                          : hasAssignedGrn && grn
                            ? formatGrnStatusLabel(grn.status)
                            : dock.status === 'offline'
                              ? 'Offline'
                              : 'Available'}
                      </span>
                    </div>

                    {hasAssignedGrn && grn && (
                      <>
                        <div className="text-xs text-[#64748B] bg-white/60 rounded px-2 py-1.5 border border-[#E2E8F0]/80">
                          <span className="font-medium text-[#1E293B]">{grn.items ?? 0} items</span>
                          {' • '}
                          {formatTimestamp(
                            typeof grn.timestamp === 'string'
                              ? grn.timestamp
                              : new Date(grn.timestamp as string).toISOString()
                          )}
                          {grn.discrepancyType && (
                            <span className="text-red-600"> • {grn.discrepancyType}</span>
                          )}
                        </div>
                        {grn.discrepancyNotes && (
                          <p className="text-xs text-red-700 bg-red-100/50 rounded px-2 py-1">
                            {grn.discrepancyNotes}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-[#64748B] mb-0.5">
                              Vehicle
                            </label>
                            <input
                              type="text"
                              value={fields.truck}
                              onChange={(e) =>
                                setDockFieldEdits((prev) => ({
                                  ...prev,
                                  [dock.id]: { ...fields, truck: e.target.value },
                                }))
                              }
                              className="w-full px-2 py-1.5 border border-[#E2E8F0] rounded text-xs"
                              placeholder="Truck ID"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-[#64748B] mb-0.5">ETA</label>
                            <input
                              type="text"
                              value={fields.eta}
                              onChange={(e) =>
                                setDockFieldEdits((prev) => ({
                                  ...prev,
                                  [dock.id]: { ...fields, eta: e.target.value },
                                }))
                              }
                              className="w-full px-2 py-1.5 border border-[#E2E8F0] rounded text-xs"
                              placeholder="10:30"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {grn.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => resumeCountOnDock(grn)}
                              disabled={actionLoadingId === grn.id}
                              className="px-2 py-1 bg-[#0891b2] text-white text-xs rounded hover:bg-[#06b6d4] disabled:opacity-50"
                            >
                              {actionLoadingId === grn.id ? 'Starting...' : 'Begin Count'}
                            </button>
                          )}
                          {grn.status === 'in-progress' && (
                            <>
                              <button
                                type="button"
                                onClick={() => completeGRNHandler(grn.id)}
                                disabled={actionLoadingId === grn.id}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                {actionLoadingId === grn.id ? 'Saving...' : 'Complete'}
                              </button>
                              <button
                                type="button"
                                onClick={() => openDiscrepancyModal(grn)}
                                className="px-2 py-1 bg-white border border-red-200 text-red-600 text-xs rounded hover:bg-red-50"
                              >
                                Report Issue
                              </button>
                            </>
                          )}
                          {grn.status === 'discrepancy' && (
                            <>
                              <button
                                type="button"
                                onClick={() => resumeCountOnDock(grn)}
                                disabled={actionLoadingId === grn.id}
                                className="px-2 py-1 bg-[#0891b2] text-white text-xs rounded hover:bg-[#06b6d4] disabled:opacity-50"
                              >
                                {actionLoadingId === grn.id ? 'Resuming...' : 'Resume Count'}
                              </button>
                              <button
                                type="button"
                                onClick={() => completeGRNHandler(grn.id)}
                                disabled={actionLoadingId === grn.id}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                Complete
                              </button>
                              <button
                                type="button"
                                onClick={() => openDiscrepancyModal(grn)}
                                className="px-2 py-1 bg-white border border-red-200 text-red-600 text-xs rounded hover:bg-red-50"
                              >
                                Update Issue
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => openDocs(grn)}
                            className="px-2 py-1 bg-white border border-[#E2E8F0] text-[#1E293B] text-xs rounded hover:bg-[#F1F5F9]"
                          >
                            Docs
                          </button>
                        </div>
                      </>
                    )}

                    <div className="space-y-2 pt-1 border-t border-[#E2E8F0]/80">
                      <div>
                        <label className="block text-[10px] font-medium text-[#64748B] mb-0.5">
                          Dock status
                        </label>
                        <select
                          value={fields.status}
                          onChange={(e) =>
                            setDockFieldEdits((prev) => ({
                              ...prev,
                              [dock.id]: {
                                ...fields,
                                status: e.target.value as DockSlot['status'],
                              },
                            }))
                          }
                          className="w-full px-2 py-1.5 border border-[#E2E8F0] rounded text-xs"
                        >
                          {hasAssignedGrn && (
                            <option value="active">Active (GRN on dock)</option>
                          )}
                          <option value="empty">
                            {hasAssignedGrn
                              ? 'Empty — release GRN to queue'
                              : 'Empty (available)'}
                          </option>
                          <option value="offline">Offline (maintenance)</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => saveDockFields(dock.id)}
                        disabled={savingDockId === dock.id}
                        className="w-full px-2 py-1.5 bg-[#0891b2] text-white text-xs font-medium rounded hover:bg-[#06b6d4] disabled:opacity-50"
                      >
                        {savingDockId === dock.id ? 'Saving...' : 'Save dock'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h3 className="font-bold text-[#1E293B] mb-1">GRN Processing Queue</h3>
            <p className="text-xs text-[#64748B] mb-3">Pending GRNs only — Start Count moves them to a dock.</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search GRN or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredGRNs.length === 0 ? (
                  <tr>
                    <td colSpan={1} className="px-6 py-8 text-center text-[#64748B]">
                      No pending GRNs
                    </td>
                  </tr>
                ) : (
                  filteredGRNs.map((grn) => (
                    <tr key={grn.id} className="hover:bg-[#F8FAFC]">
                      <td className="p-4">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-[#1E293B]">{grn.poNumber}</span>
                          <span
                            className={`text-xs font-bold flex items-center gap-1 ${
                              grn.status === 'discrepancy'
                                ? 'text-red-600'
                                : grn.status === 'completed'
                                  ? 'text-green-600'
                                  : grn.status === 'in-progress'
                                    ? 'text-blue-600'
                                    : 'text-[#64748B]'
                            }`}
                          >
                            {grn.status === 'discrepancy' && <AlertOctagon size={12} />}
                            {grn.status === 'completed' && <CheckCircle2 size={12} />}
                            {formatGrnStatusLabel(grn.status)}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B] mb-2">
                          {grn.id} • Vendor: {grn.vendor} • {grn.items ?? 0} items •{' '}
                          {formatTimestamp(grn.timestamp)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openStartCountModal(grn)}
                            disabled={actionLoadingId === grn.id || emptyDocks.length === 0}
                            className="px-2 py-1 bg-[#0891b2] text-white text-xs rounded hover:bg-[#06b6d4] disabled:opacity-50"
                            title={
                              emptyDocks.length === 0
                                ? 'No empty docks — free a dock first'
                                : undefined
                            }
                          >
                            {actionLoadingId === grn.id ? 'Starting...' : 'Start Count'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openDocs(grn)}
                            className="px-2 py-1 bg-white border border-[#E2E8F0] text-[#1E293B] text-xs rounded hover:bg-[#F1F5F9]"
                          >
                            Docs
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showStartCountModal && grnToStart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Assign to Dock</h3>
              <button
                type="button"
                onClick={() => {
                  setShowStartCountModal(false);
                  setGrnToStart(null);
                }}
                className="text-[#64748B] hover:text-[#1E293B]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#64748B]">
                <strong className="text-[#1E293B]">{grnToStart.poNumber}</strong> ({grnToStart.id}) will
                move to Dock Schedule and begin counting.
              </p>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Select dock</label>
                <select
                  value={startDockId}
                  onChange={(e) => setStartDockId(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="">Choose a dock...</option>
                  {emptyDocks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — Available
                    </option>
                  ))}
                </select>
                {emptyDocks.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">No empty docks. Complete a GRN or mark a dock empty.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">Vehicle (optional)</label>
                  <input
                    type="text"
                    value={startTruck}
                    onChange={(e) => setStartTruck(e.target.value)}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm"
                    placeholder="Truck ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">ETA (optional)</label>
                  <input
                    type="text"
                    value={startEta}
                    onChange={(e) => setStartEta(e.target.value)}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm"
                    placeholder="10:30"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowStartCountModal(false);
                  setGrnToStart(null);
                }}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStartCount}
                disabled={
                  !startDockId ||
                  actionLoadingId === grnToStart.id ||
                  emptyDocks.length === 0
                }
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] disabled:opacity-50"
              >
                {actionLoadingId === grnToStart.id ? 'Assigning...' : 'Start Count on Dock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDocsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">GRN Details</h3>
              <button
                type="button"
                onClick={() => setShowDocsModal(false)}
                className="text-[#64748B] hover:text-[#1E293B]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              {docsLoading ? (
                <p className="text-[#64748B]">Loading...</p>
              ) : docsGrn ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">GRN ID</span>
                    <span className="font-medium text-[#1E293B]">{docsGrn.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">PO Number</span>
                    <span className="font-medium text-[#1E293B]">{docsGrn.poNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Vendor</span>
                    <span className="font-medium text-[#1E293B]">{docsGrn.vendor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Status</span>
                    <span className="font-medium text-[#1E293B]">{formatGrnStatusLabel(docsGrn.status)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Items</span>
                    <span className="font-medium text-[#1E293B]">{docsGrn.items ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Received</span>
                    <span className="font-medium text-[#1E293B]">{formatTimestamp(docsGrn.timestamp)}</span>
                  </div>
                  {docsGrn.discrepancyType && (
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Discrepancy</span>
                      <span className="font-medium text-red-600">{docsGrn.discrepancyType}</span>
                    </div>
                  )}
                  {docsGrn.discrepancyNotes && (
                    <div className="pt-2 border-t border-[#E2E8F0]">
                      <p className="text-[#64748B] text-xs mb-1">Notes</p>
                      <p className="text-[#1E293B]">{docsGrn.discrepancyNotes}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[#64748B]">No details available</p>
              )}
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end">
              <button
                type="button"
                onClick={() => setShowDocsModal(false)}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showDiscrepancyModal && selectedGRNForDiscrepancy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">
                {selectedGRNForDiscrepancy.status === 'discrepancy'
                  ? 'Update GRN Discrepancy'
                  : 'Log GRN Discrepancy'}
              </h3>
              <button type="button" onClick={closeDiscrepancyModal} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#64748B]">
                GRN: <strong>{selectedGRNForDiscrepancy.poNumber}</strong> • Vendor:{' '}
                {selectedGRNForDiscrepancy.vendor}
              </p>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Discrepancy Type</label>
                <select
                  value={discrepancyType}
                  onChange={(e) => setDiscrepancyType(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="quantity">Quantity mismatch</option>
                  <option value="damage">Damage</option>
                  <option value="wrong_sku">Wrong SKU</option>
                  <option value="missing">Missing items</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Notes (required)</label>
                <textarea
                  placeholder="Describe the discrepancy..."
                  value={discrepancyNotes}
                  onChange={(e) => setDiscrepancyNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button
                type="button"
                onClick={closeDiscrepancyModal}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDiscrepancy}
                disabled={submittingDiscrepancy || !discrepancyNotes.trim()}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingDiscrepancy
                  ? 'Submitting...'
                  : selectedGRNForDiscrepancy.status === 'discrepancy'
                    ? 'Update'
                    : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGRNModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Create New GRN</h3>
              <button type="button" onClick={() => setShowGRNModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">PO Number</label>
                <input
                  type="text"
                  placeholder="PO-XXXX"
                  value={newGRNData.poNumber}
                  onChange={(e) => setNewGRNData({ ...newGRNData, poNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Vendor Name</label>
                <input
                  type="text"
                  placeholder="Enter vendor name"
                  value={newGRNData.vendor}
                  onChange={(e) => setNewGRNData({ ...newGRNData, vendor: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Number of Items</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newGRNData.items}
                  onChange={(e) => setNewGRNData({ ...newGRNData, items: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowGRNModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createGRN}
                disabled={creatingGrn}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] disabled:opacity-50"
              >
                {creatingGrn ? 'Creating...' : 'Create GRN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
