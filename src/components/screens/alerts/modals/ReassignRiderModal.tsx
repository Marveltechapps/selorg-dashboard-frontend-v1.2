import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../../../components/ui/dialog";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Loader2, Search, User } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import { Badge } from "../../../../components/ui/badge";

interface RiderOption {
  id: string;
  name: string;
  distance?: string;
  status?: string;
  load?: number;
}

interface ReassignRiderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (riderId: string, riderName: string) => Promise<void>;
  riders?: RiderOption[];
}

const FALLBACK_RIDERS: RiderOption[] = [
  { id: "r1", name: "Raj K", distance: "0.5km", status: "online", load: 0 },
  { id: "r2", name: "Priya M", distance: "1.2km", status: "online", load: 1 },
  { id: "r3", name: "Amit S", distance: "2.0km", status: "idle", load: 0 },
];

export function ReassignRiderModal({ isOpen, onClose, onConfirm, riders: ridersProp }: ReassignRiderModalProps) {
  const [search, setSearch] = useState("");
  const [selectedRider, setSelectedRider] = useState<RiderOption | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset selected rider when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedRider(null);
      setSearch("");
    }
  }, [isOpen]);

  const ridersList = ridersProp?.length ? ridersProp.map(r => ({ 
    id: r.id, 
    name: r.name, 
    distance: `${Math.floor(Math.random() * 2) + 0.5}km`, 
    status: r.status || "online", 
    load: r.load ?? 0 
  })) : FALLBACK_RIDERS;
  const filteredRiders = ridersList.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) && (r.status !== "offline")
  );

  const handleAssign = async () => {
    if (!selectedRider) return;
    setLoading(true);
    try {
      await onConfirm(selectedRider.id, selectedRider.name);
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
                         <Badge variant="outline" className="text-[10px] h-5 px-1">{rider.status}</Badge>
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleAssign} disabled={loading || !selectedRider} className="bg-blue-600 hover:bg-blue-700">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Reassignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
