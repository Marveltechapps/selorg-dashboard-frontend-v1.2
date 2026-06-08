import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  Clock,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  Timer,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { toast } from 'sonner';
import {
  downloadAttendanceCsv,
  fetchAgencies,
  fetchAttendanceByMonth,
  type AgencyItem,
  type AttendanceExportRow,
} from '@/api/admin/pickerOpsApi';

function getDefaultMonth(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function formatMonthLabel(month: string): string {
  const [yyyy, mm] = month.split('-').map((x) => parseInt(x, 10));
  if (!yyyy || !mm) return month;
  return new Date(yyyy, mm - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatHours(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

type StatCardProps = {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
  accent?: string;
};

function StatCard({ label, value, hint, icon, accent = 'text-[#18181b]' }: StatCardProps) {
  return (
    <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm min-h-[120px] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-[#71717a] uppercase tracking-wide">{label}</p>
        {icon}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
      <p className="text-xs text-[#71717a] mt-2">{hint}</p>
    </div>
  );
}

export function PickerAttendanceExport() {
  const [agencies, setAgencies] = useState<AgencyItem[]>([]);
  const [agencyId, setAgencyId] = useState<string>('all');
  const [month, setMonth] = useState<string>(getDefaultMonth());
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<AttendanceExportRow[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadAgencies = async () => {
    setLoadingAgencies(true);
    try {
      const data = await fetchAgencies();
      setAgencies(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load agencies');
      setAgencies([]);
    } finally {
      setLoadingAgencies(false);
    }
  };

  const loadAttendance = async () => {
    if (!month) {
      toast.error('Select a reporting month');
      return;
    }
    setLoadingRows(true);
    try {
      const data = await fetchAttendanceByMonth({ month, agencyId });
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load attendance');
      setRows([]);
    } finally {
      setLoadingRows(false);
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

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (r) =>
        r.pickerName.toLowerCase().includes(query) ||
        (r.agency || '').toLowerCase().includes(query),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const activePickers = filteredRows.filter((r) => r.daysWorked > 0).length;
    const totalDays = filteredRows.reduce((sum, r) => sum + (r.daysWorked || 0), 0);
    const regularHours = filteredRows.reduce((sum, r) => sum + (r.regularHours || 0), 0);
    const otHours = filteredRows.reduce((sum, r) => sum + (r.otHours || 0), 0);
    return {
      totalPickers: filteredRows.length,
      activePickers,
      totalDays,
      regularHours,
      otHours,
    };
  }, [filteredRows]);

  const handleExport = async () => {
    if (!month) {
      toast.error('Select a reporting month');
      return;
    }
    setExporting(true);
    try {
      await downloadAttendanceCsv({ month, agencyId });
      toast.success('Attendance CSV downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const isRefreshing = loadingAgencies || loadingRows;

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      <PageHeader
        title="Attendance Export"
        subtitle="Review monthly picker attendance, validate totals, and download payroll-ready CSV reports."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadAgencies();
              loadAttendance();
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            ) : (
              <RefreshCw size={14} className="mr-1.5" />
            )}
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          label="Pickers"
          value={stats.totalPickers}
          hint={`${stats.activePickers} with recorded shifts`}
          icon={<Users className="text-blue-600" size={16} />}
        />
        <StatCard
          label="Days Worked"
          value={stats.totalDays}
          hint="Total shift days in period"
          icon={<CalendarDays className="text-emerald-600" size={16} />}
          accent="text-emerald-600"
        />
        <StatCard
          label="Regular Hours"
          value={formatHours(stats.regularHours)}
          hint="Standard shift hours"
          icon={<Clock className="text-indigo-600" size={16} />}
          accent="text-indigo-600"
        />
        <StatCard
          label="OT Hours"
          value={formatHours(stats.otHours)}
          hint="Approved overtime hours"
          icon={<Timer className="text-amber-600" size={16} />}
          accent="text-amber-600"
        />
        <StatCard
          label="Agencies"
          value={agencyId === 'all' ? agencies.length : 1}
          hint={selectedAgencyName}
          icon={<Building2 className="text-violet-600" size={16} />}
          accent="text-violet-600"
        />
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl p-5 shadow-sm space-y-5">
        <SectionHeader
          title="Report filters"
          description="Choose the reporting period and agency scope before exporting."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="attendance-month">Reporting month</Label>
            <input
              id="attendance-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Agency</Label>
            <Select value={agencyId} onValueChange={setAgencyId} disabled={loadingAgencies}>
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

          <div className="space-y-1.5">
            <Label htmlFor="attendance-search">Search pickers</Label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
              <Input
                id="attendance-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or agency…"
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <Button variant="outline" onClick={loadAttendance} disabled={loadingRows}>
              {loadingRows ? (
                <Loader2 size={14} className="mr-1.5 animate-spin" />
              ) : (
                <RefreshCw size={14} className="mr-1.5" />
              )}
              Apply
            </Button>
            <Button onClick={handleExport} disabled={exporting || rows.length === 0}>
              {exporting ? (
                <Loader2 size={14} className="mr-1.5 animate-spin" />
              ) : (
                <Download size={14} className="mr-1.5" />
              )}
              Export CSV
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#f4f4f5]">
          <Badge variant="outline" className="font-normal text-[#52525b]">
            {formatMonthLabel(month)}
          </Badge>
          <Badge variant="outline" className="font-normal text-[#52525b]">
            {selectedAgencyName}
          </Badge>
          <span className="text-sm text-[#71717a]">
            Showing <span className="font-medium text-[#18181b]">{filteredRows.length}</span> of{' '}
            <span className="font-medium text-[#18181b]">{rows.length}</span> records
          </span>
        </div>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#f4f4f5] flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#18181b]">Attendance preview</h2>
            <p className="text-sm text-[#71717a] mt-0.5">
              Verify totals before exporting. CSV includes picker name, days worked, regular hours, OT hours, and agency.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[#71717a] shrink-0">
            <FileSpreadsheet size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">Payroll export</span>
          </div>
        </div>

        <div className="overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-[#f9fafb] z-10">
              <TableRow>
                <TableHead>Picker</TableHead>
                <TableHead>Agency</TableHead>
                <TableHead className="text-right">Days worked</TableHead>
                <TableHead className="text-right">Regular hrs</TableHead>
                <TableHead className="text-right">OT hrs</TableHead>
                <TableHead>Period</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingRows ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-[#71717a]">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={20} className="animate-spin text-[#a1a1aa]" />
                      <span>Loading attendance records…</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-[#71717a]">
                      <CalendarDays size={28} className="text-[#d4d4d8]" />
                      <p className="font-medium text-[#52525b]">No attendance records found</p>
                      <p className="text-sm max-w-md">
                        Try a different month or agency. Records appear once pickers have punched in during the selected period.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((r, idx) => (
                  <TableRow key={`${r.pickerName}-${r.month}-${idx}`} className="hover:bg-[#fcfcfc]">
                    <TableCell className="font-medium text-[#18181b]">{r.pickerName || '—'}</TableCell>
                    <TableCell className="text-[#52525b]">{r.agency || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.daysWorked}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatHours(r.regularHours)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.otHours > 0 ? (
                        <span className="text-amber-700 font-medium">{formatHours(r.otHours)}</span>
                      ) : (
                        formatHours(r.otHours)
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-[#71717a]">{formatMonthLabel(r.month || month)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!loadingRows && filteredRows.length > 0 && (
          <div className="px-5 py-3 border-t border-[#f4f4f5] bg-[#fafafa] flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#71717a]">
              Ready to export{' '}
              <span className="font-medium text-[#18181b]">{rows.length}</span> picker records for{' '}
              <span className="font-medium text-[#18181b]">{formatMonthLabel(month)}</span>
            </p>
            <Button size="sm" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <Loader2 size={14} className="mr-1.5 animate-spin" />
              ) : (
                <Download size={14} className="mr-1.5" />
              )}
              Download CSV
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
