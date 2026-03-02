import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ApprovalRequest } from './types';

interface ApprovalQueueTableProps {
  requests: ApprovalRequest[];
  selectedIds: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onApprove: (request: ApprovalRequest) => void;
  onReject: (request: ApprovalRequest) => void;
  onRowClick: (request: ApprovalRequest) => void;
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Price Change': return 'bg-purple-100 text-purple-700';
    case 'New Campaign': return 'bg-blue-100 text-blue-700';
    case 'Zone Change': return 'bg-orange-100 text-orange-700';
    case 'Policy Override': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getRiskBadge = (level: string) => {
  switch (level) {
    case 'High': return <Badge variant="destructive" className="ml-2 text-[10px] h-5">High Risk</Badge>;
    case 'Medium': return <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 text-[10px] h-5 hover:bg-yellow-200">Medium Risk</Badge>;
    default: return null;
  }
};

export function ApprovalQueueTable({
  requests,
  selectedIds,
  onSelect,
  onSelectAll,
  onApprove,
  onReject,
  onRowClick
}: ApprovalQueueTableProps) {
  const allSelected = requests.length > 0 && selectedIds.size === requests.length;

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
        <h3 className="font-bold text-[#212121]">Approval Queue</h3>
        <span className="text-xs text-gray-500">{requests.length} items</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
            <tr>
              <th className="px-4 py-3 w-[40px]">
                <Checkbox 
                  checked={allSelected}
                  onCheckedChange={(c) => onSelectAll(c as boolean)}
                />
              </th>
              <th className="px-6 py-3">Request Type</th>
              <th className="px-6 py-3">Details</th>
              <th className="px-6 py-3">Requested By</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E0E0E0]">
            {requests.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No pending approvals found matching your filters.
                    </td>
                </tr>
            ) : (
                requests.map((req) => (
                <tr 
                    key={req.id} 
                    className="hover:bg-[#FAFAFA] cursor-pointer group"
                    onClick={() => onRowClick(req)}
                >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                        checked={selectedIds.has(req.id)}
                        onCheckedChange={(c) => onSelect(req.id, c as boolean)}
                    />
                    </td>
                    <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(req.type)}`}>
                        {req.type}
                    </span>
                    {getRiskBadge(req.riskLevel)}
                    </td>
                    <td className="px-6 py-4">
                    <p className="font-medium text-[#212121]">{req.title}</p>
                    <p className="text-xs text-[#757575]">{req.description}</p>
                    </td>
                    <td className="px-6 py-4 text-[#616161]">{req.requestedBy}</td>
                    <td className="px-6 py-4 text-[#616161]">
                        <div className="flex flex-col">
                            <span>{new Date(req.requestedAt).toLocaleDateString()}</span>
                            <span className="text-xs flex items-center gap-1 text-orange-600">
                                {new Date() < new Date(req.slaDeadline) && (
                                    <>
                                        <Clock size={10} /> 
                                        {/* Simple formatting since date-fns might not be avail in env, but using it as placeholder */}
                                        due {new Date(req.slaDeadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </>
                                )}
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {req.status === 'Pending' && (
                        <div className="flex justify-end gap-2">
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 hover:bg-green-50 text-green-600"
                                onClick={() => onApprove(req)}
                                title="Approve"
                            >
                                <CheckCircle2 size={18} />
                            </Button>
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 hover:bg-red-50 text-red-600"
                                onClick={() => onReject(req)}
                                title="Reject"
                            >
                                <XCircle size={18} />
                            </Button>
                        </div>
                    )}
                    {req.status !== 'Pending' && (
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                            req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                            req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                            {req.status}
                        </span>
                    )}
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
