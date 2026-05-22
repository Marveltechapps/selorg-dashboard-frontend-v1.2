import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getVendors } from '@/api/vendor/vendorManagement.api';
import {
  VENDOR_ANALYTICS_EXPORT_SCOPES,
  type VendorAnalyticsExportFormat,
  type VendorAnalyticsExportScope,
  dateRangeLabel,
  runVendorAnalyticsExport,
  scopesForTab,
} from './vendorAnalyticsExport';

interface VendorAnalyticsExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDateRange: string;
  activeTab: string;
}

const ALL_SCOPE_IDS = VENDOR_ANALYTICS_EXPORT_SCOPES.map((s) => s.id);

export function VendorAnalyticsExportModal({
  open,
  onOpenChange,
  defaultDateRange,
  activeTab,
}: VendorAnalyticsExportModalProps) {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [format, setFormat] = useState<VendorAnalyticsExportFormat>('csv');
  const [scopes, setScopes] = useState<VendorAnalyticsExportScope[]>(ALL_SCOPE_IDS);
  const [vendorId, setVendorId] = useState<string>('all');
  const [productSortBy, setProductSortBy] = useState<'revenue' | 'units' | 'growth'>('revenue');
  const [topCustomersLimit, setTopCustomersLimit] = useState('10');
  const [salesGroupBy, setSalesGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    setDateRange(defaultDateRange);
    setFormat('csv');
    setScopes(ALL_SCOPE_IDS);
    setVendorId('all');
    setProductSortBy('revenue');
    setTopCustomersLimit('10');
    setSalesGroupBy('day');
    setLoading(false);
  }, [open, defaultDateRange]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getVendors({ page: 1, pageSize: 200 });
        const raw = res as Record<string, unknown>;
        const items = (raw.data ?? raw.items ?? raw.vendors ?? raw) as unknown[];
        const arr = Array.isArray(items) ? items : [];
        if (cancelled) return;
        setVendors(
          arr
            .map((v) => {
              const row = v as Record<string, unknown>;
              return {
                id: String(row._id ?? row.id ?? ''),
                name: String(row.name ?? row.vendorName ?? row.code ?? 'Vendor'),
              };
            })
            .filter((v) => v.id)
        );
      } catch {
        if (!cancelled) setVendors([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const toggleScope = (id: VendorAnalyticsExportScope) => {
    setScopes((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleExport = async () => {
    if (scopes.length === 0) {
      toast.error('Select at least one report section');
      return;
    }
    setLoading(true);
    try {
      await runVendorAnalyticsExport({
        dateRange,
        format,
        scopes,
        vendorId: vendorId === 'all' ? undefined : vendorId,
        productSortBy,
        topCustomersLimit: parseInt(topCustomersLimit, 10) || 10,
        salesGroupBy,
      });
      toast.success('Export ready', {
        description: `${format.toUpperCase()} download started for ${dateRangeLabel(dateRange)}.`,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export analytics</DialogTitle>
          <DialogDescription>
            Choose format, filters, and sections. Data is fetched with your selections when you download.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as VendorAnalyticsExportFormat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel (.csv)</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                  <SelectItem value="quarter">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger><SelectValue placeholder="All vendors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All vendors (hub)</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Top customers limit</Label>
              <Select value={topCustomersLimit} onValueChange={setTopCustomersLimit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Top 5</SelectItem>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="25">Top 25</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product sort</Label>
              <Select value={productSortBy} onValueChange={(v) => setProductSortBy(v as 'revenue' | 'units' | 'growth')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">By revenue</SelectItem>
                  <SelectItem value="units">By units sold</SelectItem>
                  <SelectItem value="growth">By growth rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Revenue trend grouping</Label>
              <Select value={salesGroupBy} onValueChange={(v) => setSalesGroupBy(v as 'day' | 'week' | 'month')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Report sections</Label>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                  const tabScopes = scopesForTab(activeTab);
                  setScopes(tabScopes.length ? tabScopes : ALL_SCOPE_IDS);
                }}>
                  Current tab
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setScopes(ALL_SCOPE_IDS)}>
                  Select all
                </Button>
              </div>
            </div>
            <div className="border rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {VENDOR_ANALYTICS_EXPORT_SCOPES.map((s) => (
                <div key={s.id} className="flex items-center space-x-2">
                  <Checkbox id={`export-${s.id}`} checked={scopes.includes(s.id)} onCheckedChange={() => toggleScope(s.id)} />
                  <Label htmlFor={`export-${s.id}`} className="font-normal text-sm cursor-pointer">{s.label}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button type="button" onClick={handleExport} disabled={loading} className="bg-[#4F46E5] hover:bg-[#4338CA] text-white">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : format === 'pdf' ? <FileText className="h-4 w-4 mr-2" /> : format === 'json' ? <Download className="h-4 w-4 mr-2" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
            {loading ? 'Exporting…' : 'Download'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
