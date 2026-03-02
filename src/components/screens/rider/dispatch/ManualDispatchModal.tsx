import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { createOrder } from "./dispatchApi";

export interface ManualOrderPayload {
  id: string;
  orderId: string;
  pickup: string;
  drop: string;
  customer: string;
}

interface ManualDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (order: ManualOrderPayload) => void;
}

export function ManualDispatchModal({ isOpen, onClose, onSuccess }: ManualDispatchModalProps) {
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [customer, setCustomer] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup.trim() || !drop.trim()) {
      toast.error("Please fill Pickup and Drop locations.");
      return;
    }
    setLoading(true);
    try {
      const created = await createOrder({
        orderId: orderId.trim() || undefined,
        pickup: pickup.trim(),
        drop: drop.trim(),
        customer: customer.trim() || "Customer",
      });
      const payload: ManualOrderPayload = {
        id: created.id || created.orderId || `ORD-${Date.now()}`,
        orderId: created.id || created.orderId || `ORD-${Date.now()}`,
        pickup: created.pickupLocation || created.pickup || pickup.trim(),
        drop: created.dropLocation || created.drop || drop.trim(),
        customer: created.customerName || created.customer || customer.trim() || "Customer",
      };
      onSuccess(payload);
      toast.success("Order created. Assign a rider from the queue.");
      setOrderId(""); setPickup(""); setDrop(""); setCustomer("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Manual Dispatch</DialogTitle>
          <DialogDescription>Create a new order and assign it from the queue.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="orderId">Order ID</Label>
            <Input id="orderId" placeholder="e.g. ORD-101" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pickup">Pickup Location</Label>
            <Input id="pickup" placeholder="Hub or address" value={pickup} onChange={(e) => setPickup(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="drop">Drop Location</Label>
            <Input id="drop" placeholder="Customer address" value={drop} onChange={(e) => setDrop(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer">Customer Name (optional)</Label>
            <Input id="customer" placeholder="Name" value={customer} onChange={(e) => setCustomer(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-[#16A34A] hover:bg-[#15803D]">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send size={14} className="mr-2" />}
              Create & Queue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
