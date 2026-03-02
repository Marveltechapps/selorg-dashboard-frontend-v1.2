import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Plus, Trash2, Loader2, Save, Send } from "lucide-react";
import { toast } from 'sonner';
import { createInvoice, CreateInvoicePayload, InvoiceItem } from './invoicingApi';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InvoiceFormModal({ open, onClose, onSuccess }: Props) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  
  const [items, setItems] = useState<Omit<InvoiceItem, 'id'>[]>([
      { description: 'Professional Services', quantity: 1, unitPrice: 0, taxPercent: 0 }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-set due date 30 days out when issue date changes
  useEffect(() => {
      if (issueDate) {
          const d = new Date(issueDate);
          d.setDate(d.getDate() + 30);
          setDueDate(d.toISOString().split('T')[0]);
      }
  }, [issueDate]);

  // Reset
  useEffect(() => {
      if (open) {
        setCustomerName('');
        setCustomerEmail('');
        setIssueDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setItems([{ description: 'Professional Services', quantity: 1, unitPrice: 0, taxPercent: 0 }]);
      }
  }, [open]);

  const handleAddItem = () => {
      setItems([...items, { description: '', quantity: 1, unitPrice: 0, taxPercent: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
      if (items.length <= 1) return;
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
  };

  const updateItem = (index: number, field: keyof Omit<InvoiceItem, 'id'>, value: any) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [field]: value };
      setItems(newItems);
  };

  const calculateTotal = () => {
      return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (1 + item.taxPercent/100)), 0);
  };

  const handleSubmit = async (asDraft: boolean, e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // Validate required fields
      if (!customerName || !customerEmail) {
          toast.error("Please fill in customer name and email");
          return;
      }
      
      // Filter out empty items and validate
      const validItems = items.filter(i => i.description && i.unitPrice > 0);
      if (validItems.length === 0) {
          toast.error("Please add at least one item with description and price");
          return;
      }

      setIsSubmitting(true);
      try {
          const payload: CreateInvoicePayload = {
              customerName,
              customerEmail,
              issueDate,
              dueDate,
              items: validItems, // Use only valid items
              notes
          };
          const createdInvoice = await createInvoice(payload, asDraft);
          toast.success(asDraft ? "Draft saved successfully" : "Invoice sent successfully");
          
          // Reset form before closing
          setCustomerName('');
          setCustomerEmail('');
          setIssueDate(new Date().toISOString().split('T')[0]);
          setDueDate('');
          setNotes('');
          setItems([{ description: 'Professional Services', quantity: 1, unitPrice: 0, taxPercent: 0 }]);
          
          // Reload data to show the new invoice
          onSuccess();
          onClose();
      } catch (e) {
          console.error('Failed to create invoice:', e);
          toast.error("Failed to create invoice");
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>Create and send a new invoice to a customer.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
             {/* Customer Details */}
             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                     <Label>Customer Name</Label>
                     <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Acme Corp" />
                 </div>
                 <div className="space-y-2">
                     <Label>Customer Email</Label>
                     <Input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="billing@acme.com" />
                 </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                     <Label>Issue Date</Label>
                     <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                 </div>
                 <div className="space-y-2">
                     <Label>Due Date</Label>
                     <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                 </div>
             </div>

             {/* Line Items */}
             <div className="border rounded-md">
                 <div className="grid grid-cols-[2fr,1fr,1fr,1fr,40px] gap-2 p-3 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                     <div>Description</div>
                     <div className="text-right">Qty</div>
                     <div className="text-right">Price</div>
                     <div className="text-right">Tax %</div>
                     <div></div>
                 </div>
                 <div className="p-2 space-y-2 max-h-[200px] overflow-y-auto">
                     {items.map((item, idx) => (
                         <div key={idx} className="grid grid-cols-[2fr,1fr,1fr,1fr,40px] gap-2 items-start">
                             <Input 
                                className="h-9" 
                                placeholder="Item description" 
                                value={item.description}
                                onChange={e => updateItem(idx, 'description', e.target.value)}
                             />
                             <Input 
                                className="h-9 text-right" 
                                type="number" min="1"
                                value={item.quantity}
                                onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value))}
                             />
                             <Input 
                                className="h-9 text-right" 
                                type="number" min="0" step="0.01"
                                value={item.unitPrice}
                                onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value))}
                             />
                             <Input 
                                className="h-9 text-right" 
                                type="number" min="0" max="100"
                                value={item.taxPercent}
                                onChange={e => updateItem(idx, 'taxPercent', parseFloat(e.target.value))}
                             />
                             <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-9 w-9 text-gray-400 hover:text-red-500"
                                onClick={() => handleRemoveItem(idx)}
                             >
                                 <Trash2 size={16} />
                             </Button>
                         </div>
                     ))}
                 </div>
                 <div className="p-2 border-t bg-gray-50 flex justify-between items-center">
                     <Button variant="ghost" size="sm" onClick={handleAddItem} className="text-[#14B8A6]">
                         <Plus size={16} className="mr-2" /> Add Item
                     </Button>
                     <div className="pr-4 text-sm font-bold text-gray-900">
                         Total: ${calculateTotal().toFixed(2)}
                     </div>
                 </div>
             </div>

             <div className="space-y-2">
                 <Label>Notes / Payment Terms</Label>
                 <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Net 30. Please include invoice number on check." />
             </div>
        </div>

        <DialogFooter className="gap-2">
            <Button 
                variant="outline" 
                onClick={(e) => handleSubmit(true, e)} 
                disabled={isSubmitting}
                type="button"
            >
                Save as Draft
            </Button>
            <Button 
                onClick={(e) => handleSubmit(false, e)} 
                disabled={isSubmitting}
                className="bg-[#212121] text-white hover:bg-black"
                type="button"
            >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Save & Send
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
