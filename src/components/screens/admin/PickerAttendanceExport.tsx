import React, { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { downloadAttendanceCsv, fetchAgencies, type AgencyItem } from '@/api/admin/pickerOpsApi';

function getDefaultMonth(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

export function PickerAttendanceExport() {
  const [agencies, setAgencies] = useState<AgencyItem[]>([]);
  const [agencyId, setAgencyId] = useState<string>('all');
  const [month, setMonth] = useState<string>(getDefaultMonth());
  const [loading, setLoading] = useState(false);

  const loadAgencies = async () => {
    setLoading(true);
    try {
      const data = await fetchAgencies();
      setAgencies(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load agencies');
      setAgencies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgencies();
  }, []);

  const selectedAgencyName = useMemo(() => {
    if (agencyId === 'all') return 'All agencies';
    return agencies.find((a) => a.agencyId === agencyId)?.name || 'Selected agency';
  }, [agencyId, agencies]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Attendance Export</h1>
          <p className="text-sm text-[#71717a]">Export picker attendance CSV by month and agency.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAgencies} disabled={loading}>
          <RefreshCw size={14} className="mr-1.5" /> Refresh
        </Button>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-sm space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-[#71717a]">
            Export: <span className="font-medium text-[#18181b]">{selectedAgencyName}</span> •{' '}
            <span className="font-medium text-[#18181b]">{month}</span>
          </div>
          <Button
            onClick={async () => {
              if (!month) {
                toast.error('Pick a month');
                return;
              }
              try {
                await downloadAttendanceCsv({ month, agencyId });
                toast.success('Export started');
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed to export CSV');
              }
            }}
          >
            <Download size={14} className="mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>
    </div>
  );
}

