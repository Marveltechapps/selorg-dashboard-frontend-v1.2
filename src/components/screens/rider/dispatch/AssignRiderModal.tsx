import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DispatchOrder, DispatchRider } from "./types";
import { Search, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchRecommendedRiders } from "./dispatchApi";

interface RiderWithEta extends DispatchRider {
  estimatedPickupMinutes?: number;
}

interface AssignRiderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: DispatchOrder | null; // Single order assignment
  batchOrders?: DispatchOrder[]; // Batch assignment
  riders: DispatchRider[];
  onConfirm: (riderId: string, overrideSla: boolean) => void;
}

export function AssignRiderModal({
  isOpen,
  onClose,
  order,
  batchOrders,
  riders,
  onConfirm,
}: AssignRiderModalProps) {
  const [search, setSearch] = useState("");
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [overrideSla, setOverrideSla] = useState(false);
  const [recommendedRiders, setRecommendedRiders] = useState<RiderWithEta[] | null>(null);

  const isBatch = !!batchOrders && batchOrders.length > 0;
  const targetOrders = isBatch ? batchOrders : (order ? [order] : []);

  // Fetch recommended riders with real ETA when single-order assign
  useEffect(() => {
    if (!isOpen || isBatch || !order) {
      setRecommendedRiders(null);
      return;
    }
    let cancelled = false;
    fetchRecommendedRiders(order.id, search)
      .then((apiRiders) => {
        if (cancelled) return;
        const withEta: RiderWithEta[] = apiRiders.map((r) => ({
          id: r.id,
          name: r.name,
          status: r.status as 'online' | 'offline' | 'busy' | 'idle',
          currentLocation: { lat: 0, lng: 0 },
          activeOrdersCount: r.load.current,
          maxCapacity: r.load.max,
          zone: r.zone,
          avgEtaMinutes: r.estimatedPickupMinutes ?? 0,
          estimatedPickupMinutes: r.estimatedPickupMinutes,
        }));
        setRecommendedRiders(withEta);
      })
      .catch(() => {
        if (!cancelled) setRecommendedRiders(null);
      });
    return () => { cancelled = true; };
  }, [isOpen, isBatch, order?.id, search]);

  // Use recommended riders (with real ETA) for single order, else riders prop
  const baseRiders: RiderWithEta[] = isBatch
    ? riders.map((r) => ({ ...r, estimatedPickupMinutes: r.avgEtaMinutes }))
    : (recommendedRiders ?? riders.map((r) => ({ ...r, estimatedPickupMinutes: r.avgEtaMinutes })));

  const filteredRiders = useMemo(() => {
    return baseRiders
      .filter((r) => r.status !== "offline" && r.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (a.activeOrdersCount !== b.activeOrdersCount) return a.activeOrdersCount - b.activeOrdersCount;
        return (b.maxCapacity - b.activeOrdersCount) - (a.maxCapacity - a.activeOrdersCount);
      });
  }, [baseRiders, search]);

  const handleConfirm = () => {
    if (selectedRiderId) {
      onConfirm(selectedRiderId, overrideSla);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>
            {isBatch ? `Batch Assign ${targetOrders?.length} Orders` : `Assign Order ${order?.id}`}
          </DialogTitle>
          <DialogDescription>
            Select a rider to assign the selected order(s). Recommended riders are shown first.
          </DialogDescription>
        </DialogHeader>

        {/* Order Summary */}
        <div className="bg-gray-50 px-6 py-3 border-y border-gray-100 flex gap-4 overflow-x-auto">
           {!isBatch && order && (
             <div className="text-sm space-y-1 w-full">
               <div className="flex justify-between">
                 <span className="font-semibold">Pickup:</span>
                 <span className="text-gray-600">{order.pickupLocation.address}</span>
               </div>
               <div className="flex justify-between">
                 <span className="font-semibold">Distance:</span>
                 <span className="text-gray-600">{order.distanceKm} km</span>
               </div>
               <div className="flex justify-between">
                 <span className="font-semibold">SLA Deadline:</span>
                 <span className="text-red-600">{new Date(order.slaDeadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
               </div>
             </div>
           )}
           {isBatch && (
             <div className="text-sm text-gray-600">
               <p>Assigning <strong>{targetOrders?.length} orders</strong> to a single rider.</p>
               <p>Total Estimated Distance: <strong>{targetOrders?.reduce((acc, o) => acc + o.distanceKm, 0).toFixed(1)} km</strong></p>
             </div>
           )}
        </div>

        {/* Rider Selection */}
        <div className="p-4 flex-1 flex flex-col overflow-hidden min-h-[300px]">
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search riders..." 
              className="pl-9" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-12 gap-2 pb-2 text-xs font-semibold text-gray-500 px-2">
            <div className="col-span-5">Rider</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-2">Load</div>
            <div className="col-span-2 text-right">Est. Pickup</div>
          </div>
          
          <ScrollArea className="flex-1 -mx-4 px-4">
            <div className="space-y-2">
              {filteredRiders.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">No riders available</div>
              ) : (
              filteredRiders.map((rider) => {
                const isSelected = selectedRiderId === rider.id;
                const isFull = rider.activeOrdersCount >= rider.maxCapacity;
                const etaMinutes = rider.estimatedPickupMinutes ?? rider.avgEtaMinutes;

                return (
                  <div
                    key={rider.id}
                    onClick={() => !isFull && setSelectedRiderId(rider.id)}
                    className={`grid grid-cols-12 gap-2 p-3 rounded-lg border cursor-pointer transition-colors items-center ${
                      isSelected 
                        ? "bg-orange-50 border-orange-500 shadow-sm" 
                        : isFull 
                          ? "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed" 
                          : "bg-white border-gray-200 hover:border-orange-300"
                    }`}
                  >
                    <div className="col-span-5 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}>
                        <User size={16} />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900">{rider.name}</div>
                        <div className="text-xs text-gray-500">{rider.zone}</div>
                      </div>
                    </div>
                    <div className="col-span-3">
                       <Badge variant="outline" className={`${
                         rider.status === "online" ? "bg-green-50 text-green-700 border-green-200" : 
                         rider.status === "busy" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-100"
                       }`}>
                         {rider.status}
                       </Badge>
                    </div>
                    <div className="col-span-2 text-sm text-gray-600">
                      {rider.activeOrdersCount} / {rider.maxCapacity}
                    </div>
                    <div className="col-span-2 text-right text-xs font-medium text-gray-600">
                      {etaMinutes != null && etaMinutes > 0 ? `${etaMinutes} min` : '—'}
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="p-6 pt-2 border-t border-gray-100 flex-col sm:flex-row gap-3 items-center sm:justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="sla" 
              checked={overrideSla} 
              onCheckedChange={(c) => setOverrideSla(!!c)} 
            />
            <label
              htmlFor="sla"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Override SLA Warnings
            </label>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">Cancel</Button>
            <Button 
              className="bg-[#F97316] hover:bg-[#EA580C] flex-1 sm:flex-none"
              disabled={!selectedRiderId}
              onClick={handleConfirm}
            >
              {isBatch ? "Assign Batch" : "Assign Rider"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
