import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../ui/sheet";
import { Badge } from "../../ui/badge";
import { ScrollArea } from "../../ui/scroll-area";
import { Separator } from "../../ui/separator";
import { Button } from "../../ui/button";
import { Skeleton } from "../../ui/skeleton";
import { format, parseISO } from "date-fns";
import { 
    FileText, 
    Download, 
    Send, 
    CheckCircle2, 
    Bell,
    Mail,
    MapPin,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Invoice, sendReminder, markInvoicePaid } from './invoicingApi';

interface Props {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void; // Trigger refresh parent
}

export function InvoiceDetailsDrawer({ invoice, open, onClose, onUpdate }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!invoice) return null;

  const handleAction = async (action: () => Promise<void>, successMsg: string) => {
      setIsProcessing(true);
      try {
          await action();
          toast.success(successMsg);
          await new Promise(resolve => setTimeout(resolve, 100));
          onUpdate(); // Refresh parent to update list and summary
          // Don't close drawer - keep it open to show updated status
      } catch (e) {
          console.error('Action failed:', e);
          toast.error("Action failed");
      } finally {
          setIsProcessing(false);
      }
  };

  const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalTax = invoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.taxPercent / 100)), 0);

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-[400px] sm:w-[600px] p-0 flex flex-col h-full bg-white">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-[#FAFAFA]">
             <div className="flex justify-between items-start mb-2">
                 <div>
                    <SheetTitle className="text-2xl font-bold text-gray-900 leading-tight font-mono">
                        {invoice.invoiceNumber}
                    </SheetTitle>
                    <SheetDescription className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <FileText size={14} /> Created on {format(parseISO(invoice.createdAt), "PPP")}
                    </SheetDescription>
                 </div>
                 <Badge 
                    className={`
                        uppercase px-3 py-1 text-xs border-0
                        ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' : ''}
                        ${invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                        ${invoice.status === 'overdue' ? 'bg-red-100 text-red-700' : ''}
                        ${invoice.status === 'sent' ? 'bg-blue-100 text-blue-700' : ''}
                        ${invoice.status === 'draft' ? 'bg-gray-100 text-gray-700' : ''}
                    `}
                 >
                     {invoice.status}
                 </Badge>
             </div>

             {/* Action Bar */}
             <div className="flex gap-2 mt-4">
                 <Button 
                     variant="outline" 
                     size="sm" 
                     className="flex-1 bg-white" 
                     onClick={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         // Generate and download PDF
                         const htmlContent = `
                             <html>
                               <head>
                                 <title>Invoice ${invoice.invoiceNumber}</title>
                                 <style>
                                   body { font-family: Arial, sans-serif; margin: 40px; }
                                   .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                                   .invoice-number { font-size: 24px; font-weight: bold; }
                                   .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
                                   .bill-to, .dates { width: 45%; }
                                   .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                                   .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                                   .table th { background-color: #f5f5f5; font-weight: bold; }
                                   .text-right { text-align: right; }
                                   .totals { margin-top: 20px; float: right; width: 300px; }
                                   .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
                                   .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
                                   @media print {
                                     body { margin: 0; }
                                     .no-print { display: none; }
                                   }
                                 </style>
                               </head>
                               <body>
                                 <div class="header">
                                   <div class="invoice-number">Invoice ${invoice.invoiceNumber}</div>
                                   <div style="margin-top: 10px; color: #666;">Status: ${invoice.status.toUpperCase()}</div>
                                 </div>
                                 
                                 <div class="info-section">
                                   <div class="bill-to">
                                     <h3 style="margin-bottom: 10px;">Bill To:</h3>
                                     <p style="font-weight: bold; margin: 5px 0;">${invoice.customerName}</p>
                                     <p style="margin: 5px 0;">${invoice.customerEmail}</p>
                                     <p style="margin: 5px 0;">123 Business Rd, Tech City</p>
                                   </div>
                                   <div class="dates">
                                     <p style="margin: 5px 0;"><strong>Issue Date:</strong> ${format(parseISO(invoice.issueDate), "MMM dd, yyyy")}</p>
                                     <p style="margin: 5px 0;"><strong>Due Date:</strong> ${format(parseISO(invoice.dueDate), "MMM dd, yyyy")}</p>
                                   </div>
                                 </div>
                                 
                                 <table class="table">
                                   <thead>
                                     <tr>
                                       <th>Item</th>
                                       <th class="text-right">Qty</th>
                                       <th class="text-right">Price</th>
                                       <th class="text-right">Total</th>
                                     </tr>
                                   </thead>
                                   <tbody>
                                     ${invoice.items.map(item => `
                                       <tr>
                                         <td>${item.description}</td>
                                         <td class="text-right">${item.quantity}</td>
                                         <td class="text-right">₹${item.unitPrice.toFixed(2)}</td>
                                         <td class="text-right">₹${(item.quantity * item.unitPrice).toFixed(2)}</td>
                                       </tr>
                                     `).join('')}
                                   </tbody>
                                 </table>
                                 
                                 <div class="totals">
                                   <div class="totals-row">
                                     <span>Subtotal:</span>
                                     <span>₹${subtotal.toFixed(2)}</span>
                                   </div>
                                   <div class="totals-row">
                                     <span>Tax:</span>
                                     <span>₹${totalTax.toFixed(2)}</span>
                                   </div>
                                   <div class="totals-row grand-total">
                                     <span>Grand Total:</span>
                                     <span>₹${invoice.amount.toFixed(2)}</span>
                                   </div>
                                 </div>
                                 
                                 ${invoice.notes ? `
                                   <div style="margin-top: 40px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
                                     <strong>Notes:</strong><br>
                                     ${invoice.notes}
                                   </div>
                                 ` : ''}
                                 
                                 <script>window.onload = () => window.print();</script>
                               </body>
                             </html>
                         `;
                         const blob = new Blob([htmlContent], { type: 'text/html' });
                         const url = window.URL.createObjectURL(blob);
                         const a = document.createElement('a');
                         a.href = url;
                         a.download = `Invoice-${invoice.invoiceNumber}.html`;
                         document.body.appendChild(a);
                         a.click();
                         document.body.removeChild(a);
                         window.URL.revokeObjectURL(url);
                         toast.success("PDF downloaded successfully");
                     }}
                 >
                     <Download className="mr-2 h-4 w-4" /> PDF
                 </Button>
                 
                 {(invoice.status === 'sent' || invoice.status === 'pending' || invoice.status === 'overdue') && (
                     <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1 bg-[#212121] hover:bg-black"
                        disabled={isProcessing}
                        onClick={() => handleAction(() => markInvoicePaid(invoice.id), "Marked as Paid")}
                     >
                         {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                         Mark Paid
                     </Button>
                 )}

                 {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                     <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1 bg-amber-100 text-amber-900 hover:bg-amber-200"
                        disabled={isProcessing}
                        onClick={() => handleAction(() => sendReminder(invoice.id), "Reminder Sent")}
                     >
                         <Bell className="mr-2 h-4 w-4" /> Remind
                     </Button>
                 )}
             </div>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 200px)', maxHeight: 'calc(100vh - 200px)' }}>
             <div className="p-6 space-y-8">
                 {/* Customer Info */}
                 <div className="grid grid-cols-2 gap-8">
                     <div>
                         <h4 className="text-xs uppercase text-gray-500 font-semibold mb-3">Bill To</h4>
                         <div className="space-y-1 text-sm">
                             <p className="font-bold text-gray-900 text-base">{invoice.customerName}</p>
                             <div className="flex items-center gap-2 text-gray-600">
                                 <Mail size={14} /> {invoice.customerEmail}
                             </div>
                             <div className="flex items-center gap-2 text-gray-600">
                                 <MapPin size={14} /> 123 Business Rd, Tech City
                             </div>
                         </div>
                     </div>
                     <div className="text-right">
                         <h4 className="text-xs uppercase text-gray-500 font-semibold mb-3">Dates</h4>
                         <div className="space-y-2 text-sm">
                             <div>
                                 <span className="text-gray-500 mr-2">Issued:</span>
                                 <span className="font-medium">{format(parseISO(invoice.issueDate), "MMM dd, yyyy")}</span>
                             </div>
                             <div>
                                 <span className="text-gray-500 mr-2">Due:</span>
                                 <span className="font-medium">{format(parseISO(invoice.dueDate), "MMM dd, yyyy")}</span>
                             </div>
                         </div>
                     </div>
                 </div>

                 <Separator />

                 {/* Line Items */}
                 <div>
                     <h4 className="text-xs uppercase text-gray-500 font-semibold mb-4">Line Items</h4>
                     <div className="border rounded-lg overflow-hidden">
                         <div className="grid grid-cols-[3fr,1fr,1fr,1fr] gap-2 p-3 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                             <div>Item</div>
                             <div className="text-right">Qty</div>
                             <div className="text-right">Price</div>
                             <div className="text-right">Total</div>
                         </div>
                         <div className="divide-y">
                             {invoice.items.map((item, idx) => (
                                 <div key={idx} className="grid grid-cols-[3fr,1fr,1fr,1fr] gap-2 p-3 text-sm">
                                     <div className="font-medium text-gray-900">
                                         {item.description}
                                     </div>
                                     <div className="text-right text-gray-600">
                                         {item.quantity}
                                     </div>
                                     <div className="text-right text-gray-600">
                                         ₹{item.unitPrice.toFixed(2)}
                                     </div>
                                     <div className="text-right font-medium text-gray-900">
                                         ₹{(item.quantity * item.unitPrice).toFixed(2)}
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>

                 {/* Totals */}
                 <div className="flex justify-end">
                     <div className="w-1/2 space-y-3">
                         <div className="flex justify-between text-sm text-gray-600">
                             <span>Subtotal</span>
                             <span>₹{subtotal.toFixed(2)}</span>
                         </div>
                         <div className="flex justify-between text-sm text-gray-600">
                             <span>Tax</span>
                             <span>₹{totalTax.toFixed(2)}</span>
                         </div>
                         <Separator />
                         <div className="flex justify-between text-base font-bold text-gray-900">
                             <span>Grand Total</span>
                             <span>₹{invoice.amount.toFixed(2)}</span>
                         </div>
                     </div>
                 </div>

                 {/* Notes */}
                 {invoice.notes && (
                     <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                         <span className="font-bold text-gray-900 block mb-1">Notes</span>
                         {invoice.notes}
                     </div>
                 )}
             </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
