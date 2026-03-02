import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, X } from "lucide-react";
import { createManualOrder, ManualOrderPayload, CreateManualOrderResult } from "./dispatchApi";
import { DispatchRider } from "./types";

interface ManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  riders: DispatchRider[];
  onSuccess: () => void;
}

export function ManualOrderModal({
  isOpen,
  onClose,
  riders,
  onSuccess,
}: ManualOrderModalProps) {
  const [orderType, setOrderType] = useState<"standard" | "express">("standard");
  const [items, setItems] = useState<string[]>([""]);
  const [pickupLocation, setPickupLocation] = useState("Default Warehouse");
  const [dropLocation, setDropLocation] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [zone, setZone] = useState("");
  const [riderId, setRiderId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => setItems([...items, ""]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, v: string) => {
    const next = [...items];
    next[idx] = v;
    setItems(next);
  };

  const resetForm = () => {
    setOrderType("standard");
    setItems([""]);
    setPickupLocation("Default Warehouse");
    setDropLocation("");
    setCustomerName("");
    setCustomerPhone("");
    setZone("");
    setRiderId("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    const trimmedItems = items.map((i) => i.trim()).filter(Boolean);
    if (trimmedItems.length === 0) {
      setError("Add at least one item");
      return;
    }
    if (!dropLocation.trim()) {
      setError("Customer address is required");
      return;
    }
    if (!customerName.trim()) {
      setError("Customer name is required");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const payload: ManualOrderPayload = {
        orderType,
        items: trimmedItems,
        pickupLocation: pickupLocation.trim() || undefined,
        dropLocation: dropLocation.trim(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        zone: zone.trim() || undefined,
        riderId: riderId || undefined,
      };
      const result: CreateManualOrderResult = await createManualOrder(payload);
      onSuccess();
      handleClose();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const availableRiders = riders.filter((r) => r.status !== "offline");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Manual Order</DialogTitle>
          <DialogDescription>
            Create a phone order or manual dispatch. Optionally assign to a rider immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Order Type</Label>
              <Select value={orderType} onValueChange={(v: "standard" | "express") => setOrderType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (60 min SLA)</SelectItem>
                  <SelectItem value="express">Express (30 min SLA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Zone (optional)</Label>
              <Input
                placeholder="e.g. Zone A"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addItem} className="h-8 gap-1">
                <Plus size={14} />
                Add item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    placeholder="Item name or description"
                    value={item}
                    onChange={(e) => updateItem(idx, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(idx)}
                    disabled={items.length <= 1}
                    className="shrink-0"
                  >
                    <X size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pickup Location (store/warehouse)</Label>
            <Input
              placeholder="Default Warehouse"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Customer Address (drop location) *</Label>
            <Textarea
              placeholder="Full delivery address"
              value={dropLocation}
              onChange={(e) => setDropLocation(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Phone (optional)</Label>
              <Input
                placeholder="Phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assign to Rider (optional)</Label>
            <Select value={riderId} onValueChange={setRiderId}>
              <SelectTrigger>
                <SelectValue placeholder="Leave unassigned for later dispatch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Leave unassigned</SelectItem>
                {availableRiders.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.zone})
                  </SelectItem>
                ))}
                {availableRiders.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No riders available
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="bg-[#16A34A] hover:bg-[#15803D]"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
                Creating...
              </>
            ) : (
              "Create Order"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
