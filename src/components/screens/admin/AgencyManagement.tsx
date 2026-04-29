import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { AddAgencyModal } from './modals/AddAgencyModal';
import { createAgency, deactivateAgency, fetchAgencies, type AgencyItem } from '@/api/admin/pickerOpsApi';

export function AgencyManagement() {
  const [rows, setRows] = useState<AgencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAgencies();
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load agencies');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((a) => (a.name || '').toLowerCase().includes(query) || (a.phone || '').includes(query));
  }, [rows, q]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Agencies</h1>
          <p className="text-sm text-[#71717a]">Create and manage staffing agencies for pickers.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={14} className="mr-1.5" /> Add Agency
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agencies…" className="max-w-sm" />
        <Button variant="outline" size="sm" onClick={load}>
          Refresh
        </Button>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-[#f9fafb] z-10">
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Active pickers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-[#71717a]">
                    Loading agencies…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-[#71717a]">
                    No agencies found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((a) => (
                  <TableRow key={a.agencyId} className="hover:bg-[#fcfcfc]">
                    <TableCell>
                      <div className="font-medium text-[#18181b]">{a.name}</div>
                      <div className="text-xs text-[#a1a1aa] font-mono">{a.agencyId}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-[#52525b]">{a.contactPerson || '—'}</div>
                      <div className="text-xs text-[#71717a]">{a.phone || '—'}</div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{a.activePickersCount ?? 0}</span>
                    </TableCell>
                    <TableCell>
                      {a.isActive ? (
                        <Badge className="bg-emerald-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-rose-200 text-rose-700 hover:bg-rose-50"
                        disabled={!a.isActive}
                        onClick={async () => {
                          if (!confirm(`Deactivate agency "${a.name}"?`)) return;
                          try {
                            await deactivateAgency(a.agencyId);
                            toast.success('Agency deactivated');
                            await load();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : 'Failed to deactivate agency');
                          }
                        }}
                      >
                        <Power size={14} className="mr-1.5" />
                        Deactivate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AddAgencyModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={async (payload) => {
          await createAgency(payload);
          toast.success('Agency created');
          await load();
        }}
      />
    </div>
  );
}

