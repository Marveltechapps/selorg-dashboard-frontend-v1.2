import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { decideOtRequest, fetchOtRequests, type OtRequestItem } from '@/api/admin/pickerOpsApi';

export function OTRequestApprovals() {
  const [rows, setRows] = useState<OtRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchOtRequests();
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load OT requests');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">OT Approvals</h1>
          <p className="text-sm text-[#71717a]">Approve or reject picker overtime requests.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw size={14} className="mr-1.5" /> Refresh
        </Button>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-[#f9fafb] z-10">
              <TableRow>
                <TableHead>Picker</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Requested OT</TableHead>
                <TableHead>Shift end time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-[#71717a]">
                    Loading requests…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-[#71717a]">
                    No pending OT requests
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.requestId} className="hover:bg-[#fcfcfc]">
                    <TableCell className="font-medium">{r.pickerName}</TableCell>
                    <TableCell>{r.storeName}</TableCell>
                    <TableCell>{Math.round(r.requestedOtMinutes / 60)}h {r.requestedOtMinutes % 60}m</TableCell>
                    <TableCell className="text-sm text-[#52525b]">
                      {r.shiftEndTime ? new Date(r.shiftEndTime).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={async () => {
                            try {
                              await decideOtRequest(r.requestId, 'approve');
                              toast.success('OT approved');
                              await load();
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : 'Failed to approve');
                            }
                          }}
                        >
                          <CheckCircle2 size={14} className="mr-1.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            const reason = window.prompt('Rejection reason') || 'Rejected by admin';
                            try {
                              await decideOtRequest(r.requestId, 'reject', reason);
                              toast.success('OT rejected');
                              await load();
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : 'Failed to reject');
                            }
                          }}
                        >
                          <XCircle size={14} className="mr-1.5" /> Reject
                        </Button>
                      </div>
                    </TableCell>
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

