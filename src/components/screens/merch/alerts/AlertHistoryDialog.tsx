import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert } from './types';
import { alertsApi } from './alertsApi';
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';

interface AlertHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  resolvedAlerts?: Alert[];
}

export function AlertHistoryDialog({ isOpen, onClose, resolvedAlerts: sessionResolved = [] }: AlertHistoryDialogProps) {
  const [apiResolved, setApiResolved] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      alertsApi.getAlerts({ status: 'resolved' })
        .then((r) => setApiResolved(r?.data ?? []))
        .catch(() => setApiResolved([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const resolvedAlerts = apiResolved.length > 0 ? apiResolved : sessionResolved;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Clock className="text-gray-400" size={20} />
            Alert Resolution History
          </DialogTitle>
          <DialogDescription>
            Audit log of all resolved and dismissed alerts.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-gray-500">Loading resolved alerts...</p>
            </div>
          ) : resolvedAlerts.length > 0 ? (
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Alert</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Type</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Resolved At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvedAlerts.map((alert) => (
                    <TableRow key={alert.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="py-3">
                        <div className="font-bold text-xs text-gray-900">{alert.title}</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[300px]">{alert.description}</div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="text-[9px] h-4 font-bold uppercase px-1.5 border-gray-200">
                          {alert.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge className={`text-[9px] h-4 font-bold uppercase px-1.5 ${
                          alert.status === 'Resolved' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
                        }`}>
                          {alert.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-[10px] text-gray-500 font-medium">
                        {new Date(alert.updatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-100">
                <CheckCircle2 size={40} className="mb-4 opacity-20" />
                <p className="text-sm font-bold">No resolved alerts yet.</p>
                <p className="text-xs">Resolved alerts will appear here for audit purposes.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

