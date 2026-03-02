import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../ui/sheet";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { ScrollArea } from "../../ui/scroll-area";
import { Separator } from "../../ui/separator";
import { Skeleton } from "../../ui/skeleton";
import { format } from "date-fns";
import { FileText, ExternalLink, User } from 'lucide-react';
import { toast } from 'sonner';
import { LedgerEntry, JournalEntry, fetchJournalDetails } from './accountingApi';

interface Props {
  entry: LedgerEntry | null;
  open: boolean;
  onClose: () => void;
}

export function LedgerEntryDrawer({ entry, open, onClose }: Props) {
  const [details, setDetails] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      if (open && entry) {
          // Show entry details immediately
          setDetails({
            id: entry.journalId,
            date: entry.date,
            reference: entry.reference,
            memo: entry.description,
            lines: [{
              accountCode: entry.accountCode,
              accountName: entry.accountName,
              debit: entry.debit,
              credit: entry.credit,
              description: entry.description
            }],
            status: 'posted',
            createdBy: entry.createdBy,
            createdAt: entry.createdAt
          });
          
          // Try to fetch full journal details in background (non-blocking)
          setLoading(true);
          fetchJournalDetails(entry.journalId)
            .then(data => {
              if (data && data.lines && data.lines.length > 1) {
                // Only update if we got more complete data
                setDetails(data);
              }
              setLoading(false);
            })
            .catch(error => {
              console.error('Failed to fetch journal details:', error);
              // Keep the entry-based details we already set
              setLoading(false);
            });
      } else {
          setDetails(null);
          setLoading(false);
      }
  }, [open, entry]);

  if (!entry) return null;

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-[400px] sm:w-[600px] p-0 flex flex-col h-full bg-white">
        <div className="p-6 border-b border-gray-100 bg-[#FAFAFA]">
             <div className="flex items-center gap-2 mb-2">
                 <Badge variant="outline" className="font-mono text-xs text-gray-500 border-gray-300">
                     {entry.reference}
                 </Badge>
                 <Badge className={`bg-green-100 text-green-700 hover:bg-green-200 border-0 shadow-none uppercase text-[10px]`}>
                     Posted
                 </Badge>
             </div>
             <SheetTitle className="text-xl font-bold text-gray-900 leading-tight">
                 {entry.description}
             </SheetTitle>
             <SheetDescription className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                 <FileText size={14} /> Journal Entry • {format(new Date(entry.date), "PPP")}
             </SheetDescription>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 200px)', maxHeight: 'calc(100vh - 200px)' }}>
             <div className="p-6 space-y-8">
                 {/* Audit Info */}
                 <div className="grid grid-cols-2 gap-4 text-sm">
                     <div>
                         <span className="text-gray-500 block text-xs uppercase mb-1">Created By</span>
                         <div className="flex items-center gap-2 font-medium text-gray-900">
                             <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                <User size={12} />
                             </div>
                             {loading ? <Skeleton className="h-4 w-20" /> : details?.createdBy || entry.createdBy}
                         </div>
                     </div>
                     <div>
                         <span className="text-gray-500 block text-xs uppercase mb-1">Source Module</span>
                         <span className="capitalize font-medium text-gray-900">{entry.sourceModule}</span>
                     </div>
                 </div>

                 <Separator />

                 {/* Entry Details */}
                 <div>
                     <h3 className="font-semibold text-gray-900 mb-4">Entry Details</h3>
                     <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3 text-sm">
                         <div className="flex justify-between">
                             <span className="text-gray-500">Account Code</span>
                             <span className="font-mono font-medium text-gray-900">{entry.accountCode}</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-gray-500">Account Name</span>
                             <span className="font-medium text-gray-900">{entry.accountName}</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-gray-500">Date</span>
                             <span className="font-medium text-gray-900">{format(new Date(entry.date), "PPP")}</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-gray-500">Reference</span>
                             <span className="font-mono font-medium text-gray-900">{entry.reference}</span>
                         </div>
                         <Separator />
                         <div className="flex justify-between">
                             <span className="text-gray-500">Debit Amount</span>
                             <span className="font-mono font-bold text-gray-900">
                                 {entry.debit > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(entry.debit) : '-'}
                             </span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-gray-500">Credit Amount</span>
                             <span className="font-mono font-bold text-gray-900">
                                 {entry.credit > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(entry.credit) : '-'}
                             </span>
                         </div>
                     </div>
                 </div>

                 {/* Journal Lines - Show if details are loaded */}
                 {details && details.lines && details.lines.length > 1 && (
                 <div>
                     <h3 className="font-semibold text-gray-900 mb-4">All Journal Lines</h3>
                     
                     {loading ? (
                         <div className="space-y-3">
                             <Skeleton className="h-12 w-full" />
                             <Skeleton className="h-12 w-full" />
                         </div>
                     ) : (
                         <div className="border rounded-lg overflow-hidden">
                             <div className="grid grid-cols-[3fr,1fr,1fr] gap-2 p-3 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                                 <div>Account / Description</div>
                                 <div className="text-right">Debit</div>
                                 <div className="text-right">Credit</div>
                             </div>
                             <div className="divide-y max-h-[400px] overflow-y-auto">
                                 {details.lines.map((line, idx) => (
                                     <div key={idx} className="grid grid-cols-[3fr,1fr,1fr] gap-2 p-3 text-sm">
                                         <div>
                                             <div className="font-medium text-gray-900 flex items-center gap-2">
                                                 <span className="font-mono text-gray-400 text-xs">{line.accountCode}</span>
                                                 {line.accountName || 'Unknown Account'}
                                             </div>
                                             {line.description && (
                                                 <p className="text-gray-500 text-xs mt-0.5">{line.description}</p>
                                             )}
                                         </div>
                                         <div className="text-right font-mono text-gray-900">
                                             {line.debit > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(line.debit) : '-'}
                                         </div>
                                         <div className="text-right font-mono text-gray-900">
                                             {line.credit > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(line.credit) : '-'}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                             {/* Totals Row */}
                             <div className="grid grid-cols-[3fr,1fr,1fr] gap-2 p-3 bg-gray-50 text-sm font-bold border-t">
                                 <div className="text-right pr-4 text-gray-500 uppercase text-xs pt-1">Totals</div>
                                 <div className="text-right font-mono">
                                     {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(
                                         details.lines.reduce((s, l) => s + (l.debit || 0), 0)
                                     )}
                                 </div>
                                 <div className="text-right font-mono">
                                     {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(
                                         details.lines.reduce((s, l) => s + (l.credit || 0), 0)
                                     )}
                                 </div>
                             </div>
                         </div>
                     )}
                 </div>
                 )}

                 {entry.sourceModule === 'vendor' && (
                     <div className="bg-blue-50 p-4 rounded border border-blue-100 flex items-start gap-3">
                         <ExternalLink className="text-blue-600 mt-0.5" size={18} />
                         <div>
                             <h4 className="font-bold text-blue-900 text-sm">Related Bill</h4>
                             <p className="text-blue-700 text-xs mt-1">
                                 This journal entry was automatically generated from Vendor Bill #BILL-005.
                             </p>
                             <Button
                                 type="button"
                                 variant="link"
                                 className="text-blue-600 text-xs font-bold mt-2 p-0 h-auto hover:underline"
                                 onClick={(e) => {
                                   e.preventDefault();
                                   e.stopPropagation();
                                   // Navigate to vendor payments tab
                                   const event = new CustomEvent('navigateToTab', { detail: { tab: 'vendor-payments' } });
                                   window.dispatchEvent(event);
                                   toast.success("Opening Vendor Payments");
                                   onClose();
                                 }}
                             >
                                 View Source Bill <ExternalLink className="ml-1 inline" size={12} />
                             </Button>
                         </div>
                     </div>
                 )}
             </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
