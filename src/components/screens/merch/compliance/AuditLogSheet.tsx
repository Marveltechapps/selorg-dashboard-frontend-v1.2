import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, History, Loader2 } from 'lucide-react';
import { complianceApi } from './complianceApi';
import { AuditLogEntry } from './types';

interface AuditLogSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuditLogSheet({ isOpen, onClose }: AuditLogSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const resp = await complianceApi.getAudits({});
        const data = resp?.data ?? [];
        if (!mounted) return;
        const mapped: AuditLogEntry[] = (Array.isArray(data) ? data : []).map((a: any) => ({
          id: a._id ?? a.id ?? String(Math.random()),
          eventType: (a.action === 'Violation' ? 'Violation' : a.action === 'Approval' ? 'Approval' : 'System Check') as AuditLogEntry['eventType'],
          entity: a.entityType && a.entityId ? `${a.entityType} #${a.entityId}` : a.entityType ?? 'Unknown',
          user: a.userId?.toString?.() ?? 'System',
          timestamp: a.createdAt ?? new Date().toISOString(),
          summary: a.details?.summary ?? a.details ?? 'No details',
          result: a.severity === 'info' ? 'Pass' : a.severity === 'error' || a.severity === 'warning' ? 'Fail' : 'Pass',
          scope: a.details?.scope ?? 'Global'
        }));
        setLogs(mapped);
      } catch {
        setLogs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [isOpen]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchQuery || 
        log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesResult = resultFilter === 'all' || log.result === resultFilter;
      const matchesType = typeFilter === 'all' || log.eventType === typeFilter;

      return matchesSearch && matchesResult && matchesType;
    });
  }, [logs, searchQuery, resultFilter, typeFilter]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1584px] h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 shrink-0 border-b">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-50 rounded-lg">
                <History className="h-5 w-5 text-blue-600" />
            </div>
            <div>
                <DialogTitle className="text-xl font-bold">Audit Log Summary</DialogTitle>
                <DialogDescription className="text-xs">
                    Comprehensive record of all approval events, system checks, and policy overrides.
                </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 flex items-center gap-3 border-b bg-gray-50/50 shrink-0">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                    placeholder="Search entities, users, or summaries..." 
                    className="pl-9 h-9 bg-white border-gray-200 text-xs focus:ring-primary" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px] h-9 text-[10px] font-bold uppercase tracking-wider bg-white">
                    <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="Approval">Approval</SelectItem>
                    <SelectItem value="Violation">Violation</SelectItem>
                    <SelectItem value="System Check">System Check</SelectItem>
                </SelectContent>
            </Select>

            <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger className="w-[120px] h-9 text-[10px] font-bold uppercase tracking-wider bg-white">
                    <SelectValue placeholder="Result" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Results</SelectItem>
                    <SelectItem value="Pass">Pass</SelectItem>
                    <SelectItem value="Fail">Fail</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-gray-500 mt-2">Loading audit logs...</p>
            </div>
          ) : (
          <div className="h-full w-full overflow-auto" style={{ height: 'calc(95vh - 180px)' }}>
            <div className="px-6 py-4">
                <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[1000px] w-full">
                        <TableHeader className="bg-gray-50/90 sticky top-0 z-10 backdrop-blur-md border-b">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-3 whitespace-nowrap min-w-[120px]">Event Type</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-3 whitespace-nowrap min-w-[300px]">Entity Details</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-3 whitespace-nowrap min-w-[150px]">Responsible</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-3 whitespace-nowrap min-w-[100px]">Status</TableHead>
                                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-3 whitespace-nowrap min-w-[150px]">Timestamp</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                                <TableRow key={log.id} className="hover:bg-gray-50/50 transition-colors border-b last:border-0">
                                    <TableCell className="py-4 whitespace-nowrap min-w-[120px]">
                                        <Badge variant="secondary" className={`text-[9px] font-black uppercase tracking-tighter px-2 h-5 rounded-full ${
                                            log.eventType === 'Violation' ? 'bg-red-100 text-red-700' :
                                            log.eventType === 'Approval' ? 'bg-green-100 text-green-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {log.eventType}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-4 min-w-[300px]">
                                        <div className="font-bold text-xs text-gray-900">{log.entity}</div>
                                        <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{log.summary}</div>
                                    </TableCell>
                                    <TableCell className="py-4 whitespace-nowrap min-w-[150px]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                                {log.user.charAt(0)}
                                            </div>
                                            <span className="text-xs font-medium text-gray-700">{log.user}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 whitespace-nowrap min-w-[100px]">
                                         <Badge variant="outline" className={`text-[10px] font-black uppercase px-2 h-5 ${
                                             log.result === 'Pass' ? 'text-green-600 border-green-200 bg-green-50/50' :
                                             'text-red-600 border-red-200 bg-red-50/50'
                                         }`}>
                                             {log.result}
                                         </Badge>
                                    </TableCell>
                                    <TableCell className="text-right py-4 whitespace-nowrap min-w-[150px]">
                                        <div className="text-[10px] font-bold text-gray-900">{new Date(log.timestamp).toLocaleDateString()}</div>
                                        <div className="text-[9px] text-gray-400 font-medium">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <Search size={40} className="mb-4 opacity-20" />
                                            <p className="text-sm font-bold">No audit logs found</p>
                                            <p className="text-xs">Try adjusting your search or filters</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
          </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
