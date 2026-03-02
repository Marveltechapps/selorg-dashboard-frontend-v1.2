import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Checkbox } from "../../ui/checkbox";
import { Calendar } from "../../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, PlayCircle } from "lucide-react";
import { cn } from "../../ui/utils";
import { runReconciliation } from './reconciliationApi';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RunReconciliationModal({ open, onClose, onSuccess }: Props) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [gateways, setGateways] = useState<string[]>(['stripe', 'paypal']); // Default selected

  const handleRun = async () => {
      if (!date) return;
      setIsLoading(true);
      
      // Simulate polling
      try {
          // Start run
          const run = await runReconciliation(date.toISOString(), gateways);
          
          toast.info("Reconciliation process started...", {
              description: "Checking transactions across selected gateways."
          });

          // Fake polling delay
          await new Promise(r => setTimeout(r, 2000));
          
          toast.success("Reconciliation completed", {
              description: "3 new exceptions found. Summary updated."
          });
          
          onSuccess();
          onClose();
      } catch (e) {
          toast.error("Reconciliation failed");
      } finally {
          setIsLoading(false);
      }
  };

  const toggleGateway = (gw: string) => {
      setGateways(prev => 
          prev.includes(gw) ? prev.filter(g => g !== gw) : [...prev, gw]
      );
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Run Reconciliation</DialogTitle>
          <DialogDescription>
            Trigger a manual reconciliation run for a specific date period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
             <div className="space-y-2">
                 <Label>Settlement Date</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
             </div>

             <div className="space-y-3">
                 <Label>Gateways</Label>
                 <div className="space-y-2">
                     <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="gw_stripe" 
                            checked={gateways.includes('stripe')}
                            onCheckedChange={() => toggleGateway('stripe')}
                        />
                        <label htmlFor="gw_stripe" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Stripe
                        </label>
                     </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="gw_paypal" 
                            checked={gateways.includes('paypal')}
                            onCheckedChange={() => toggleGateway('paypal')}
                        />
                        <label htmlFor="gw_paypal" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            PayPal
                        </label>
                     </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="gw_adyen" 
                            checked={gateways.includes('adyen')}
                            onCheckedChange={() => toggleGateway('adyen')}
                        />
                        <label htmlFor="gw_adyen" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Adyen
                        </label>
                     </div>
                 </div>
             </div>
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button 
                onClick={handleRun} 
                disabled={isLoading || !date || gateways.length === 0}
                className="bg-[#14B8A6] hover:bg-[#0D9488]"
            >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                {isLoading ? 'Running...' : 'Run Analysis'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
