import React, { useEffect, useState } from 'react';
import { AdminModal } from './AdminModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { User, AccessLog, fetchAccessLogs } from '../userManagementApi';
import { Activity, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UserActivityLogModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

export function UserActivityLogModal({ open, onClose, user }: UserActivityLogModalProps) {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) {
      setLogs([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchAccessLogs({ userId: user.id, limit: 50 });
        setLogs(data);
      } catch (error: any) {
        toast.error(error?.message || 'Failed to load activity log');
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [open, user?.id]);

  const formatTimeAgo = (timestamp: string) => {
    const diffSeconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Activity Log"
      subtitle={user ? `${user.name} · ${user.email}` : undefined}
      icon={<Activity size={20} />}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex w-full justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      }
    >
      {!user ? null : loading ? (
        <div className="flex min-h-[12rem] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#4F46E5]" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="w-12">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="text-sm">{formatTimeAgo(log.timestamp)}</div>
                      <div className="text-xs text-[#6B7280]">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.action.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-sm" title={log.details}>
                      {log.details}
                    </TableCell>
                    <TableCell>
                      {log.status === 'success' ? (
                        <CheckCircle size={16} className="text-emerald-500" />
                      ) : (
                        <XCircle size={16} className="text-rose-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-[#6B7280]">
                    No activity recorded for this user.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminModal>
  );
}
