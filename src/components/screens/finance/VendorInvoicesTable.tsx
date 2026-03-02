import React from 'react';
import { MoreHorizontal, FileText, Check, Clock, AlertTriangle, XCircle, CreditCard } from 'lucide-react';
import { VendorInvoice } from './payablesApi';
import { Button } from "../../ui/button";
import { Skeleton } from "../../ui/skeleton";
import { Checkbox } from "../../ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

interface Props {
  data: VendorInvoice[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onApprove: (id: string) => void;
  onBulkApprove?: () => void;
  onViewDetails: (invoice: VendorInvoice) => void;
  onSchedule: (invoice: VendorInvoice) => void;
  onMarkPaid: (id: string) => void;
  onReject: (invoice: VendorInvoice) => void;
}

export function VendorInvoicesTable({ 
  data, 
  isLoading, 
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onApprove, 
  onBulkApprove,
  onViewDetails, 
  onSchedule, 
  onMarkPaid, 
  onReject 
}: Props) {

  const getStatusBadge = (status: string) => {
    const styles = {
        pending_approval: "bg-[#FEF3C7] text-[#92400E]",
        approved: "bg-[#DCFCE7] text-[#166534]",
        scheduled: "bg-blue-100 text-blue-700",
        paid: "bg-gray-100 text-gray-700",
        overdue: "bg-[#FEE2E2] text-[#991B1B]",
        rejected: "bg-red-50 text-red-600"
    }[status] || "bg-gray-100 text-gray-700";

    const label = status.replace('_', ' ');

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles}`}>
            {label}
        </span>
    );
  };

  if (isLoading) {
    return (
        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm p-4 space-y-4">
            {[1,2,3,4,5].map(i => (
                <div key={i} className="flex gap-4">
                    <Skeleton className="h-12 w-full" />
                </div>
            ))}
        </div>
    );
  }

  if (data.length === 0) {
      return (
          <div className="bg-white border border-[#E0E0E0] rounded-xl p-12 text-center shadow-sm">
              <div className="bg-gray-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="text-gray-400" size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No invoices found</h3>
              <p className="text-gray-500 max-w-sm mx-auto mt-2">
                  No vendor invoices match your filters.
              </p>
          </div>
      );
  }

  const pendingApprovalInvoices = data.filter((inv) => inv.status === 'pending_approval');
  const allPendingSelected = pendingApprovalInvoices.length > 0 && pendingApprovalInvoices.every((inv) => selectedIds.has(inv.id));
  const somePendingSelected = pendingApprovalInvoices.some((inv) => selectedIds.has(inv.id));

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3 w-10">
                  {pendingApprovalInvoices.length > 0 && (
                    <Checkbox
                      checked={allPendingSelected}
                      aria-checked={allPendingSelected ? 'true' : somePendingSelected ? 'mixed' : 'false'}
                      onCheckedChange={(checked) => onSelectAll(Boolean(checked))}
                    />
                  )}
                </th>
                <th className="px-6 py-3">Vendor</th>
                <th className="px-6 py-3">Invoice #</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Due Date</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {data.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-[#FAFAFA] group transition-colors">
                    <td className="px-6 py-4 w-10">
                      {invoice.status === 'pending_approval' && (
                        <Checkbox
                          checked={selectedIds.has(invoice.id)}
                          onCheckedChange={(checked) => onToggleSelect(invoice.id, Boolean(checked))}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-[#212121]">
                        {invoice.vendorName}
                    </td>
                    <td className="px-6 py-4 text-[#616161] font-mono text-xs">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 text-[#616161]">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-[#616161]">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                        {new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid' && (
                             <span className="text-red-500 ml-2 text-xs font-bold">!</span>
                        )}
                    </td>
                    <td className="px-6 py-4 font-bold text-[#212121]">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.amount)}
                    </td>
                    <td className="px-6 py-4">
                       {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                            {invoice.status === 'pending_approval' ? (
                                <button 
                                    onClick={() => onApprove(invoice.id)}
                                    className="text-[#14B8A6] hover:text-[#0D9488] font-medium text-xs border border-[#14B8A6] rounded px-2 py-1 hover:bg-teal-50"
                                >
                                    Approve
                                </button>
                            ) : null}
                            
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => onViewDetails(invoice)}>
                                        <FileText className="mr-2 h-4 w-4" /> View Details
                                    </DropdownMenuItem>
                                    {(invoice.status === 'approved' || invoice.status === 'overdue') && (
                                        <DropdownMenuItem onClick={() => onSchedule(invoice)}>
                                            <Clock className="mr-2 h-4 w-4" /> Schedule Payment
                                        </DropdownMenuItem>
                                    )}
                                    {invoice.status !== 'paid' && invoice.status !== 'rejected' && (
                                        <DropdownMenuItem onClick={() => onMarkPaid(invoice.id)}>
                                            <CreditCard className="mr-2 h-4 w-4" /> Mark as Paid
                                        </DropdownMenuItem>
                                    )}
                                    {invoice.status !== 'paid' && invoice.status !== 'rejected' && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem 
                                              className="text-red-600" 
                                              onSelect={(e) => {
                                                e.preventDefault();
                                                onReject(invoice);
                                              }}
                                            >
                                                <XCircle className="mr-2 h-4 w-4" /> Reject Invoice
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </td>
                  </tr>
              ))}
            </tbody>
        </table>
      </div>
      
       <div className="px-6 py-4 border-t border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-xs text-gray-500">Showing {data.length} invoices</p>
            {selectedIds.size > 0 && onBulkApprove && (
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs bg-[#14B8A6] hover:bg-[#0D9488]"
                onClick={onBulkApprove}
              >
                Approve Selected ({selectedIds.size})
              </Button>
            )}
          </div>
          <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled>Previous</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled>Next</Button>
          </div>
      </div>
    </div>
  );
}
