import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Checkbox } from "../../ui/checkbox";
import { Calendar } from "../../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, PlayCircle } from "lucide-react";
import { cn } from "../../ui/utils";
import { runReconciliation, fetchAvailableGateways, fetchRunStatus } from './reconciliationApi';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface GatewayOption {
  id: string;
  label: string;
}

export function RunReconciliationModal({ open, onClose, onSuccess }: Props) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [gatewayOptions, setGatewayOptions] = useState<GatewayOption[]>([]);
  const [gateways, setGateways] = useState<string[]>(['worldline', 'cod']);

  useEffect(() => {
    if (!open) return;
    fetchAvailableGateways()
      .then((list) => {
        setGatewayOptions(list);
        if (list.length) {
          setGateways(list.map((g) => g.id));
        }
      })
      .catch(() => {
        setGatewayOptions([
          { id: 'worldline', label: 'Worldline' },
          { id: 'cod', label: 'Cash on Delivery' },
        ]);
      });
  }, [open]);

  const pollUntilDone = async (runId: string, maxAttempts = 30) => {
    for (let i = 0; i < maxAttempts; i += 1) {
      const run = await fetchRunStatus(runId);
      if (run.status === 'success' || run.status === 'failed') {
        return run;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    return fetchRunStatus(runId);
  };

  const handleRun = async () => {
    if (!date || gateways.length === 0) return;
    setIsLoading(true);

    try {
      const run = await runReconciliation(date.toISOString(), gateways);

      toast.info('Reconciliation started', {
        description: 'Matching live transactions with payments and gateway records.',
      });

      const finalRun =
        run.status === 'running' ? await pollUntilDone(run.id) : run;

      if (finalRun.status === 'failed') {
        toast.error('Reconciliation failed', {
          description: finalRun.errorMessage || 'See server logs for details.',
        });
        return;
      }

      const stats = finalRun.stats;
      const created = stats?.exceptionsCreated ?? 0;
      const updated = stats?.exceptionsUpdated ?? 0;
      const checked = stats?.transactionsChecked ?? 0;

      toast.success('Reconciliation completed', {
        description: `${checked} transactions checked. ${created} new exception(s), ${updated} updated.`,
      });

      onSuccess();
      onClose();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Reconciliation failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGateway = (gw: string) => {
    setGateways((prev) =>
      prev.includes(gw) ? prev.filter((g) => g !== gw) : [...prev, gw]
    );
  };

  const options =
    gatewayOptions.length > 0
      ? gatewayOptions
      : [
          { id: 'worldline', label: 'Worldline' },
          { id: 'cod', label: 'Cash on Delivery' },
        ];

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Run Reconciliation</DialogTitle>
          <DialogDescription>
            Compare live transactions, customer payments, and Worldline settlements for the selected date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Settlement Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-3">
            <Label>Gateways</Label>
            <div className="space-y-2">
              {options.map((gw) => (
                <div key={gw.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`gw_${gw.id}`}
                    checked={gateways.includes(gw.id)}
                    onCheckedChange={() => toggleGateway(gw.id)}
                  />
                  <label
                    htmlFor={`gw_${gw.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {gw.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleRun}
            disabled={isLoading || !date || gateways.length === 0}
            className="bg-[#14B8A6] hover:bg-[#0D9488]"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="mr-2 h-4 w-4" />
            )}
            {isLoading ? 'Running...' : 'Run Analysis'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
