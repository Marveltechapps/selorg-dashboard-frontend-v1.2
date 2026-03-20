import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../../../components/ui/dialog";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Loader2, Search, User } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import { Badge } from "../../../../components/ui/badge";
import { api as riderOverviewApi } from "../../rider/overview/riderApi";

interface RiderOption {
  id: string;
  name: string;
  distance?: string;
  status?: string;
  load?: number;
  /**
   * When present, indicates the rider currently has an active order.
   * We rely on this (not just load) to decide if the rider is truly "free".
   */
  currentOrderId?: string | null;
}

interface ReassignRiderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (riderId: string, riderName: string, overrideSla?: boolean) => Promise<void>;
  riders?: RiderOption[];
}

export function ReassignRiderModal({ isOpen, onClose, onConfirm, riders: ridersProp }: ReassignRiderModalProps) {
  const [search, setSearch] = useState("");
  const [selectedRider, setSelectedRider] = useState<RiderOption | null>(null);
  const [overrideSla, setOverrideSla] = useState(false);
  const [loading, setLoading] = useState(false);
  const [liveRiders, setLiveRiders] = useState<RiderOption[] | null>(null);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [ridersError, setRidersError] = useState<string | null>(null);

  // Reset selected rider when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedRider(null);
      setSearch("");
      setOverrideSla(false);
      setRidersError(null);
      setLiveRiders(null);
    }
  }, [isOpen]);

  // When the modal opens and no riders are passed from parent,
  // fetch the latest live rider list directly from the Rider Overview API.
  useEffect(() => {
    if (!isOpen) return;
    if (ridersProp && ridersProp.length > 0) return;

    let cancelled = false;
    const load = async () => {
      try {
        setLoadingRiders(true);
        const riders = await riderOverviewApi.getRiders();
        if (cancelled) return;
        const normalized: RiderOption[] = riders.map((r) => ({
          id: r.id,
          name: r.name,
          status: r.status,
          load: r.capacity?.currentLoad ?? 0,
          currentOrderId: r.currentOrderId ?? null,
        }));
        setLiveRiders(normalized);
        setRidersError(null);
      } catch (err: any) {
        if (cancelled) return;
        const message =
          (err && typeof err === "object" && (err as any).message) ||
          "Failed to load riders";
        setRidersError(String(message));
        setLiveRiders([]);
      } finally {
        if (!cancelled) {
          setLoadingRiders(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, ridersProp]);

  const sourceRiders: RiderOption[] =
    (ridersProp && ridersProp.length ? ridersProp : liveRiders || []) ?? [];

  const ridersList = sourceRiders
    // Normalise into a safe shape and filter out any malformed entries
    .filter((r): r is RiderOption => !!r && typeof r.id === 'string' && typeof r.name === 'string')
    .map((r) => ({
      id: r.id,
      name: r.name,
      distance: r.distance ?? undefined,
      status: r.status || 'online',
      load: r.load ?? 0,
      currentOrderId: r.currentOrderId ?? null,
    }));

  const filteredRiders = ridersList.filter(r => {
    const name = r.name || '';
    const status = (r.status || 'online').toLowerCase();
    // Show riders who are online, idle, or busy. If they are busy / have load,
    // they will still be visible in the list with the correct status/load,
    // instead of being hidden entirely.
    const isEligibleStatus = status === 'online' || status === 'idle' || status === 'busy';
    const matchesSearch = name.toLowerCase().includes((search || '').toLowerCase());
    return matchesSearch && isEligibleStatus;
  });

  const handleAssign = async () => {
    if (!selectedRider) return;
    setLoading(true);
    try {
      await onConfirm(selectedRider.id, selectedRider.name, overrideSla);
      toast.success(`Order reassigned to ${selectedRider.name}`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reassign failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reassign Order</DialogTitle>
          <DialogDescription>Select a new rider to take over this order.</DialogDescription>
        </DialogHeader>

        <div className="py-2">
           <div className="relative mb-4">
             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
             <Input 
               placeholder="Search riders..." 
               className="pl-9" 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
           </div>

           <div className="text-xs font-semibold text-gray-500 grid grid-cols-12 px-2 pb-2">
              <div className="col-span-6">Rider</div>
              <div className="col-span-3 text-center">Distance</div>
              <div className="col-span-3 text-right">Load</div>
           </div>

           <ScrollArea className="h-[250px] pr-4">
             <div className="space-y-2">
               {loadingRiders && !ridersProp && (
                 <div className="py-8 text-center text-gray-500 text-sm">
                   Loading riders...
                 </div>
               )}
               {!loadingRiders && filteredRiders.length === 0 && (
                 <div className="py-8 text-center text-gray-500 text-sm">
                   {ridersError
                     ? ridersError
                     : "No riders found. Ensure riders are online in the mobile app."}
                 </div>
               )}
               {filteredRiders.map((rider) => (
                 <div
                   key={rider.id}
                   onClick={() => setSelectedRider(rider)}
                   className={`grid grid-cols-12 items-center p-3 rounded border cursor-pointer transition-colors ${
                     selectedRider?.id === rider.id
                       ? "bg-blue-50 border-blue-500"
                       : "bg-white border-gray-200 hover:border-blue-300"
                   }`}
                 >
                   <div className="col-span-6 flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                       <User size={16} />
                     </div>
                     <div>
                       <p className="text-sm font-medium text-gray-900">{rider.name}</p>
                       <Badge variant="outline" className="text-[10px] h-5 px-1">
                         {rider.status}
                       </Badge>
                     </div>
                   </div>
                   <div className="col-span-3 text-center text-sm text-gray-600">
                     {rider.distance}
                   </div>
                   <div className="col-span-3 text-right text-sm text-gray-600">
                     {rider.load} orders
                   </div>
                 </div>
               ))}
             </div>
           </ScrollArea>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3 items-center sm:justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="override-sla"
              checked={overrideSla}
              onCheckedChange={(c) => setOverrideSla(!!c)}
            />
            <label htmlFor="override-sla" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Override SLA deadline
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button onClick={handleAssign} disabled={loading || !selectedRider} className="bg-blue-600 hover:bg-blue-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Reassignment
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
