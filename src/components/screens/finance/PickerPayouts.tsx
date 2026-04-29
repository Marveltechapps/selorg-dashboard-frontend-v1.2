import React, { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchAgencies, type AgencyItem } from '@/api/admin/pickerOpsApi';

type FinancePickerAttendanceRow = {
  pickerName: string;
  agency?: string | null;
  daysWorked: number;
  regularHours: number;
  otHours: number;
  month: string; // YYYY-MM
};

function getDefaultMonth(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replaceAll('"', '""')}"`;
  return str;
}

function downloadCsvFromRows(rows: FinancePickerAttendanceRow[], filename: string) {
  const header = ['Picker Name', 'Agency', 'Days Worked', 'Regular Hours', 'OT Hours', 'Month'];
  const lines = [
    header.join(','),
    ...rows.map((r) =>
      [
        r.pickerName,
        r.agency ?? '',
        r.daysWorked,
        r.regularHours,
        r.otHours,
        r.month,
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function PickerPayouts() {
  const [month, setMonth] = useState<string>(getDefaultMonth());
  const [agencyId, setAgencyId] = useState<string>('all');
  const [agencies, setAgencies] = useState<AgencyItem[]>([]);

  const [rows, setRows] = useState<FinancePickerAttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAgencies = async () => {
    try {
      const data = await fetchAgencies();
      setAgencies(data);
    } catch {
      setAgencies([]);
    }
  };

  const loadAttendance = async () => {
    if (!month) {
      toast.error('Pick a month');
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('month', month);
      params.set('agency', agencyId === 'all' ? '' : agencyId);
      const res = await apiRequest<{ success: boolean; data: FinancePickerAttendanceRow[] }>(
        `/finance/picker-attendance?${params.toString()}`
      );
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load picker attendance');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgencies();
  }, []);

  useEffect(() => {
    loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, agencyId]);

  const selectedAgencyName = useMemo(() => {
    if (agencyId === 'all') return 'All agencies';
    return agencies.find((a) => a.agencyId === agencyId)?.name || 'Selected agency';
  }, [agencyId, agencies]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#212121]">Picker Payouts</h1>
        <p className="text-[#757575] text-sm">View picker attendance and export CSV by month and agency.</p>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <Label>Month</Label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Agency</Label>
            <Select value={agencyId} onValueChange={setAgencyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select agency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agencies</SelectItem>
                {agencies.map((a) => (
                  <SelectItem key={a.agencyId} value={a.agencyId}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex md:justify-end gap-2">
            <Button variant="outline" onClick={loadAttendance} disabled={loading}>
              <RefreshCw size={14} className="mr-1.5" /> Refresh
            </Button>
            <Button
              onClick={() => {
                if (!month) {
                  toast.error('Pick a month');
                  return;
                }
                downloadCsvFromRows(rows, `picker-attendance-${month}-${agencyId}.csv`);
              }}
              disabled={rows.length === 0}
            >
              <Download size={14} className="mr-1.5" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="text-sm text-[#71717a]">
          Showing <span className="font-medium text-[#18181b]">{rows.length}</span> rows •{' '}
          <span className="font-medium text-[#18181b]">{selectedAgencyName}</span> •{' '}
          <span className="font-medium text-[#18181b]">{month}</span>
        </div>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-[#f9fafb] z-10">
              <TableRow>
                <TableHead>Picker Name</TableHead>
                <TableHead>Agency</TableHead>
                <TableHead>Days Worked</TableHead>
                <TableHead>Regular Hours</TableHead>
                <TableHead>OT Hours</TableHead>
                <TableHead>Month</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-[#71717a]">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-[#71717a]">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, idx) => (
                  <TableRow key={`${r.pickerName}-${r.month}-${idx}`} className="hover:bg-[#fcfcfc]">
                    <TableCell className="font-medium text-[#18181b]">{r.pickerName || '—'}</TableCell>
                    <TableCell>{r.agency || '—'}</TableCell>
                    <TableCell>{typeof r.daysWorked === 'number' ? r.daysWorked : '—'}</TableCell>
                    <TableCell>{typeof r.regularHours === 'number' ? r.regularHours : '—'}</TableCell>
                    <TableCell>{typeof r.otHours === 'number' ? r.otHours : '—'}</TableCell>
                    <TableCell>{r.month || month}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
