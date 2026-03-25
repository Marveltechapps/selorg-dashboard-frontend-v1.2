import React, { useEffect, useState } from 'react';
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
import { fetchLoginSessions, revokeSession } from './userManagementApi';
import type { LoginSession } from './userManagementApi';
import { toast } from 'sonner';
import { KeyRound, RefreshCw, Unlock } from 'lucide-react';

export function FraudRiskHub() {
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    void loadSessions();
  }, []);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const sessionData = await fetchLoginSessions();
      setSessions(sessionData);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
      toast.success('Session revoked');
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      toast.error('Failed to revoke session');
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Session Management</h1>
          <p className="text-[#71717a] text-sm">Manage active login sessions and device access</p>
        </div>
        <Button size="sm" onClick={() => void loadSessions()} variant="outline">
          <RefreshCw size={14} className="mr-1.5" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Total Sessions</p>
            <KeyRound className="text-[#e11d48]" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{sessions.length}</p>
          <p className="text-xs text-[#71717a] mt-1">all devices</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Active Sessions</p>
            <KeyRound className="text-emerald-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">
            {sessions.filter((s) => s.status === 'active').length}
          </p>
          <p className="text-xs text-[#71717a] mt-1">currently active</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Inactive Sessions</p>
            <Unlock className="text-amber-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">
            {sessions.filter((s) => s.status !== 'active').length}
          </p>
          <p className="text-xs text-[#71717a] mt-1">revoked / expired</p>
        </div>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
          <h3 className="font-bold text-[#18181b]">Session Management</h3>
          <p className="text-xs text-[#71717a] mt-1">Active login sessions and device access</p>
        </div>
        {sessionsLoading ? (
          <div className="p-8 text-center text-[#71717a]">Loading sessions...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-[#71717a]">
                      No sessions found
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#18181b]">{session.userName}</p>
                          <p className="text-xs text-[#71717a]">{session.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{session.deviceType}</Badge>
                        <p className="text-xs text-[#71717a] mt-1 truncate max-w-[200px]" title={session.device}>
                          {session.device}
                        </p>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{session.ipAddress}</TableCell>
                      <TableCell className="text-xs text-[#71717a]">
                        {new Date(session.lastActivity).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={session.status === 'active' ? 'bg-emerald-500' : 'bg-gray-500'}>
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => handleRevokeSession(session.id)}>
                          <Unlock size={14} className="mr-1" /> Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
