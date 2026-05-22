import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Download } from 'lucide-react';
import { exportFinanceReport } from './financeApi';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId?: string;
}

/** Above finance top-bar search overlay (z-180) and sheets (z-50). */
function useFinanceDialogZIndex(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const style = document.createElement('style');
    style.setAttribute('data-finance-export-dialog', 'true');
    style.textContent = `
      [data-finance-export-dialog-root="true"] [data-slot="dialog-overlay"] {
        z-index: 200 !important;
      }
      [data-finance-export-dialog-root="true"] [data-slot="dialog-content"] {
        z-index: 210 !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) document.head.removeChild(style);
    };
  }, [active]);
}

export function ExportFinanceReportModal({ open, onOpenChange, entityId }: Props) {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('today');
  const [format, setFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [scopes, setScopes] = useState<string[]>(['overview']);

  useFinanceDialogZIndex(open);

  useEffect(() => {
    if (!open) return;
    setDateRange('today');
    setFormat('pdf');
    setScopes(['overview']);
    setLoading(false);
  }, [open]);

  const handleScopeChange = (scope: string) => {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  };

  const handleExport = async () => {
    if (scopes.length === 0) {
      toast.error('Select at least one report scope');
      return;
    }
    setLoading(true);
    try {
      await exportFinanceReport({
        entityId,
        dateRange,
        format,
        scope: scopes,
      });
      toast.success('Finance report exported successfully', {
        description: 'Your download should start shortly.',
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
    <div data-finance-export-dialog-root="true">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[450px] z-[210]">
          <DialogHeader>
            <DialogTitle>Export Finance Report</DialogTitle>
            <DialogDescription>Generate a detailed financial report for your records.</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-5">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange} modal={false}>
                <SelectTrigger type="button">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[220]">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Report Scope</Label>
              <div className="flex flex-col gap-3 border rounded-md p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="overview"
                    checked={scopes.includes('overview')}
                    onCheckedChange={() => handleScopeChange('overview')}
                  />
                  <Label htmlFor="overview" className="font-normal cursor-pointer">
                    Payments Overview
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="gateway"
                    checked={scopes.includes('gateway')}
                    onCheckedChange={() => handleScopeChange('gateway')}
                  />
                  <Label htmlFor="gateway" className="font-normal cursor-pointer">
                    Gateway Performance
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="failed"
                    checked={scopes.includes('failed')}
                    onCheckedChange={() => handleScopeChange('failed')}
                  />
                  <Label htmlFor="failed" className="font-normal cursor-pointer">
                    Failed Payments Analysis
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormat('pdf')}
                  className={`flex-1 py-2 px-4 rounded border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${format === 'pdf' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  PDF / HTML
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('xlsx')}
                  className={`flex-1 py-2 px-4 rounded border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${format === 'xlsx' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  Excel (CSV)
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleExport} disabled={loading || scopes.length === 0} className="bg-[#14B8A6] hover:bg-[#0D9488] text-white">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
