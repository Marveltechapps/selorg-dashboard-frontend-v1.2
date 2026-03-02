import React, { useState } from 'react';
import { Invoice, InvoiceStatus, sendReminder, markInvoicePaid } from './invoicingApi';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../ui/table";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Skeleton } from "../../ui/skeleton";
import { format, isPast, parseISO } from "date-fns";
import { Search, Eye, Bell, CheckCircle2, MoreHorizontal } from "lucide-react";
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

interface Props {
  invoices: Invoice[];
  isLoading: boolean;
  activeStatus: InvoiceStatus | null;
  onViewInvoice: (invoice: Invoice) => void;
  onRefresh: () => void;
  onSearch: (term: string) => void;
}

export function InvoiceListPanel({ invoices, isLoading, activeStatus, onViewInvoice, onRefresh, onSearch }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      onSearch(e.target.value);
  };

  const handleSendReminder = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setActionLoading(id);
      try {
          await sendReminder(id);
          toast.success("Reminder sent successfully");
          onRefresh(); // Refresh to update lastReminderAt (if we were showing it)
      } catch (err) {
          toast.error("Failed to send reminder");
      } finally {
          setActionLoading(null);
      }
  };

  const handleMarkPaid = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      setActionLoading(id);
      try {
          await markInvoicePaid(id);
          toast.success("Invoice marked as paid");
          await new Promise(resolve => setTimeout(resolve, 100));
          onRefresh();
      } catch (err) {
          console.error('Failed to mark invoice as paid:', err);
          await new Promise(resolve => setTimeout(resolve, 100));
          onRefresh();
      } finally {
          setActionLoading(null);
      }
  };

  // --- Render ---

  if (!activeStatus) {
      return (
        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm flex items-center justify-center min-h-[400px]">
            <div className="text-center text-[#9E9E9E]">
                <div className="bg-gray-50 p-6 rounded-full inline-flex mb-4">
                    <Search size={48} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-700">No Status Selected</h3>
                <p className="mt-1">Select a card above to view invoices.</p>
            </div>
        </div>
      );
  }

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[600px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
            <h3 className="font-bold text-[#212121] capitalize">{activeStatus} Invoices</h3>
            <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input 
                    placeholder="Search invoices..." 
                    className="pl-9 bg-white" 
                    value={searchTerm}
                    onChange={handleSearch}
                />
            </div>
        </div>

        {/* Content */}
        {isLoading ? (
             <div className="p-4 space-y-4">
                 {[1, 2, 3, 4, 5, 6].map(i => (
                     <Skeleton key={i} className="h-12 w-full" />
                 ))}
             </div>
        ) : invoices.length === 0 ? (
             <div className="flex-1 flex items-center justify-center text-gray-500 min-h-[300px]">
                 No {activeStatus} invoices found.
             </div>
        ) : (
             <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader className="bg-[#F5F7FA] sticky top-0 z-10">
                    <TableRow>
                        <TableHead className="w-[140px]">Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-[100px] text-center">Status</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {invoices.map((inv) => {
                        const isOverdue = inv.status === 'overdue' || (inv.status !== 'paid' && isPast(parseISO(inv.dueDate)));
                        return (
                            <TableRow 
                                key={inv.id} 
                                className="cursor-pointer hover:bg-gray-50 group"
                                onClick={() => onViewInvoice(inv)}
                            >
                            <TableCell className="font-mono text-xs font-medium text-[#212121]">
                                {inv.invoiceNumber}
                            </TableCell>
                            <TableCell className="font-medium text-[#212121]">
                                {inv.customerName}
                                <div className="text-[10px] text-gray-500">{inv.customerEmail}</div>
                            </TableCell>
                            <TableCell className="text-[#616161]">
                                {format(parseISO(inv.issueDate), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell className={`text-[#616161] ${isOverdue && inv.status !== 'paid' ? 'text-red-600 font-medium' : ''}`}>
                                {format(parseISO(inv.dueDate), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell className="text-right font-bold text-[#212121]">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: inv.currency }).format(inv.amount)}
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge 
                                    variant="outline" 
                                    className={`
                                        uppercase text-[10px] h-5 border-0
                                        ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : ''}
                                        ${inv.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                                        ${inv.status === 'overdue' ? 'bg-red-100 text-red-700' : ''}
                                        ${inv.status === 'sent' ? 'bg-blue-100 text-blue-700' : ''}
                                        ${inv.status === 'draft' ? 'bg-gray-100 text-gray-700' : ''}
                                    `}
                                >
                                    {inv.status}
                                </Badge>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                                            <MoreHorizontal size={16} />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onViewInvoice(inv)}>
                                            <Eye className="mr-2 h-4 w-4" /> View Details
                                        </DropdownMenuItem>
                                        {(inv.status === 'pending' || inv.status === 'overdue') && (
                                            <DropdownMenuItem onClick={(e) => handleSendReminder(e, inv.id)}>
                                                <Bell className="mr-2 h-4 w-4" /> Send Reminder
                                            </DropdownMenuItem>
                                        )}
                                        {(inv.status === 'sent' || inv.status === 'pending' || inv.status === 'overdue') && (
                                            <DropdownMenuItem onClick={(e) => handleMarkPaid(e, inv.id)}>
                                                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Paid
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            </TableRow>
                        );
                    })}
                    </TableBody>
                </Table>
             </div>
        )}
    </div>
  );
}
