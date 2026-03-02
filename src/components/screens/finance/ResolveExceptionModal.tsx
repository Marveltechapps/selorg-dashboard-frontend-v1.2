import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Loader2, CheckCircle2 } from "lucide-react";
import { ReconciliationException, resolveException } from './reconciliationApi';
import { toast } from 'sonner';

interface Props {
  exception: ReconciliationException | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResolveExceptionModal({ exception, open, onClose, onSuccess }: Props) {
  const [resolutionType, setResolutionType] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResolve = async () => {
      if (!exception || !resolutionType) return;
      setIsLoading(true);
      try {
          await resolveException(exception.id, resolutionType, note);
          toast.success("Exception resolved successfully");
          onSuccess();
          onClose();
          setNote('');
          setResolutionType('');
      } catch (e) {
          toast.error("Failed to resolve exception");
      } finally {
          setIsLoading(false);
      }
  };

  if (!exception) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
       <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Resolve Exception</DialogTitle>
          <DialogDescription>
            Applying resolution for {exception.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
             <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex justify-between items-center text-sm">
                 <span className="text-gray-500">Amount to Resolve:</span>
                 <span className={`font-mono font-bold ${exception.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: exception.currency }).format(exception.amount)}
                 </span>
             </div>

             <div className="space-y-2">
                 <Label>Resolution Type</Label>
                 <Select value={resolutionType} onValueChange={setResolutionType}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="adjust_accounting">Adjust Accounting Entry</SelectItem>
                        <SelectItem value="mark_duplicate">Mark as Duplicate</SelectItem>
                        <SelectItem value="write_off">Write-off (Small Balance)</SelectItem>
                        <SelectItem value="force_match">Force Match to Bank</SelectItem>
                    </SelectContent>
                 </Select>
             </div>

             <div className="space-y-2">
                 <Label>Resolution Note</Label>
                 <Textarea 
                    placeholder="Enter details about this resolution..." 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                 />
             </div>
        </div>

        <DialogFooter>
             <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
             <Button 
                onClick={handleResolve} 
                disabled={isLoading || !resolutionType}
                className="bg-[#14B8A6] hover:bg-[#0D9488]"
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Resolution
            </Button>
        </DialogFooter>
       </DialogContent>
    </Dialog>
  );
}
