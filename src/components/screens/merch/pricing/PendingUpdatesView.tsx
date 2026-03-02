import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../ui/table";
import { Badge } from "../../../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { History, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { pricingApi } from './pricingApi';

interface PendingUpdatesViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PendingUpdatesView({ open, onOpenChange }: PendingUpdatesViewProps) {
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      loadUpdates();
    }
  }, [open]);

  const loadUpdates = async () => {
    try {
      setLoading(true);
      const response = await pricingApi.getPendingUpdates();
      if (response.success && Array.isArray(response.data)) {
        setUpdates(response.data);
      } else {
        setUpdates([]);
      }
    } catch (error) {
      console.error('Error loading pending updates:', error);
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUpdates = updates.filter(u => {
    const matchesUser = userFilter === 'all' || u.user === userFilter;
    const matchesSource = sourceFilter === 'all' || u.source === sourceFilter;
    const matchesPriority = priorityFilter === 'all' || u.priority === priorityFilter;
    return matchesUser && matchesSource && matchesPriority;
  });

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      const response = await pricingApi.handlePendingUpdate(id, 'approved');
      
      if (response.success) {
        // Optimistic update - remove from list
        setUpdates(prev => prev.filter(u => u.id !== id));
        toast.success("Price change approved and queued.");
      } else {
        toast.error("Failed to approve price change");
        // Reload to get latest data
        await loadUpdates();
      }
    } catch (error) {
      console.error('Error approving update:', error);
      toast.error("Failed to approve price change");
      await loadUpdates();
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    
    try {
      setProcessingId(rejectId);
      const response = await pricingApi.handlePendingUpdate(rejectId, 'rejected', rejectReason);
      
      if (response.success) {
        // Optimistic update - remove from list
        setUpdates(prev => prev.filter(u => u.id !== rejectId));
        setRejectId(null);
        setRejectReason("");
        toast.success("Price change request rejected.");
      } else {
        toast.error("Failed to reject price change");
        // Reload to get latest data
        await loadUpdates();
      }
    } catch (error) {
      console.error('Error rejecting update:', error);
      toast.error("Failed to reject price change");
      await loadUpdates();
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[85vh] max-h-[85vh] flex flex-col" style={{ margin: '2.5vh auto' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <History className="text-blue-500" /> Pending Price Updates
          </DialogTitle>
          <DialogDescription>
            Review and approve price changes requested manually or by the rule engine.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-lg border">
                <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Requested By" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="jane">Jane Doe</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Source" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="rule">Rule Engine</SelectItem>
                        <SelectItem value="campaign">Campaign</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="border rounded-md overflow-auto flex-1">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-[#7C3AED]" size={32} />
                    </div>
                ) : filteredUpdates.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                        No pending updates found.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>SKU</TableHead>
                                <TableHead>Current Price</TableHead>
                                <TableHead>Proposed Price</TableHead>
                                <TableHead>Margin Impact</TableHead>
                                <TableHead>Effective Date</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUpdates.map((update) => (
                                <TableRow key={update.id}>
                                    <TableCell className="font-medium">{update.sku}</TableCell>
                                    <TableCell className="text-slate-500">₹{update.oldPrice.toFixed(2)}</TableCell>
                                    <TableCell className="font-bold text-slate-900">₹{update.newPrice.toFixed(2)}</TableCell>
                                    <TableCell className={update.marginImpact.startsWith('+') ? "text-green-600" : "text-red-600"}>
                                        {update.marginImpact}
                                    </TableCell>
                                    <TableCell>{update.date}</TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={update.reason}>{update.reason}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{update.source}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                size="sm" 
                                                className="bg-green-600 hover:bg-green-700" 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleApprove(update.id);
                                                }}
                                                disabled={processingId === update.id}
                                            >
                                                {processingId === update.id ? (
                                                    <Loader2 className="animate-spin mr-2" size={14} />
                                                ) : null}
                                                Approve
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="destructive" 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setRejectId(update.id);
                                                }}
                                                disabled={processingId === update.id}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>

        {/* Reject Dialog */}
        <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Reject Price Change</DialogTitle>
                    <DialogDescription>
                        Please provide a reason for rejecting this price change request.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Reason for rejection</Label>
                        <Input 
                            value={rejectReason} 
                            onChange={(e) => setRejectReason(e.target.value)} 
                            placeholder="Enter reason..." 
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button 
                            variant="ghost" 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setRejectId(null);
                                setRejectReason("");
                            }}
                            disabled={processingId !== null}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleReject();
                            }}
                            disabled={processingId !== null || !rejectReason.trim()}
                        >
                            {processingId ? (
                                <>
                                    <Loader2 className="animate-spin mr-2" size={14} />
                                    Processing...
                                </>
                            ) : (
                                'Confirm Rejection'
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
