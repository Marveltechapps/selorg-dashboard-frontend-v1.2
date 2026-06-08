import React, { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
} from '../../../../components/ui/sheet';
import { Button } from '../../../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Checkbox } from '../../../../components/ui/checkbox';
import { ScrollArea } from '../../../../components/ui/scroll-area';
import { Order, Rider } from './types';
import { toast } from 'sonner';
import { useRiderPermissions } from '@/components/rider/useRiderPermissions';

interface DispatchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  unassignedOrders: Order[];
  riders: Rider[];
  onAssign: (orderId: string, riderId: string) => Promise<void>;
  preselectedOrder?: Order | null;
}

export function DispatchDrawer({ 
  isOpen, 
  onClose, 
  unassignedOrders, 
  riders, 
  onAssign,
  preselectedOrder 
}: DispatchDrawerProps) {
  const { can } = useRiderPermissions();
  const canAssign = can('dispatch.assign');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedRider, setSelectedRider] = useState<string>('');
  const [batchZone, setBatchZone] = useState<string>('');

  React.useEffect(() => {
    if (isOpen && preselectedOrder) {
      setSelectedOrders([preselectedOrder.id]);
    } else if (isOpen && !preselectedOrder) {
      setSelectedOrders([]);
    }
  }, [isOpen, preselectedOrder?.id]);

  const handleOrderToggle = (id: string) => {
    if (selectedOrders.includes(id)) {
      setSelectedOrders(selectedOrders.filter(o => o !== id));
    } else {
      setSelectedOrders([...selectedOrders, id]);
    }
  };

  const handleBatchAssign = async () => {
    if (!canAssign) {
      toast.error('You do not have permission to assign orders');
      return;
    }
    if (selectedOrders.length === 0 || !selectedRider) return;
    for (const orderId of selectedOrders) {
      await onAssign(orderId, selectedRider);
    }
    toast.success(selectedOrders.length === 1 ? 'Order assigned successfully' : `Assigned ${selectedOrders.length} orders successfully`);
    setSelectedOrders([]);
    setSelectedRider('');
    onClose();
  };

  // Eligible riders for manual assignment:
  // - Must be online or idle (actively working)
  // - Must be free (no currentOrderId set)
  const availableRiders = riders.filter((r) => {
    const isEligibleStatus = r.status === 'online' || r.status === 'idle';
    const isFree = !r.currentOrderId;
    return isEligibleStatus && isFree;
  });

  const zoneOptions = Array.from(
    new Set(
      unassignedOrders
        .map((o) => (o as Order & { zone?: string }).zone)
        .filter(Boolean) as string[]
    )
  );

  const selectOrdersByZone = () => {
    if (!batchZone) {
      toast.error('Select a delivery zone first');
      return;
    }
    const ids = unassignedOrders
      .filter((o) => (o as Order & { zone?: string }).zone === batchZone)
      .map((o) => o.id);
    setSelectedOrders(ids);
    toast.success(`Selected ${ids.length} order(s) in zone ${batchZone}`);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Dispatch Operations</SheetTitle>
          <SheetDescription>
            Manage manual assignments and batch dispatching.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
            <Tabs defaultValue="unassigned">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="unassigned">Unassigned Orders ({unassignedOrders.length})</TabsTrigger>
                    <TabsTrigger value="batch">Batch Dispatch</TabsTrigger>
                </TabsList>
                
                <TabsContent value="unassigned" className="mt-4">
                    <ScrollArea className="h-[500px] rounded-md border p-4">
                        {unassignedOrders.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                No unassigned orders.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {unassignedOrders.map((order, index) => (
                                    <div
                                      key={order.id || `unassigned-order-${index}`}
                                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50"
                                    >
                                        <Checkbox 
                                            id={order.id} 
                                            checked={selectedOrders.includes(order.id)}
                                            onCheckedChange={() => handleOrderToggle(order.id)}
                                        />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <label htmlFor={order.id} className="font-medium cursor-pointer">
                                                    Order {order.id}
                                                </label>
                                                <span className="text-xs text-orange-600 font-medium">PENDING</span>
                                            </div>
                                            <p className="text-sm text-gray-500">{order.pickupLocation} → {order.dropLocation}</p>
                                            <p className="text-xs text-gray-400 mt-1">Due: {new Date(order.slaDeadline).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                    
                    <div className="mt-4 pt-4 border-t">
                        <div className="mb-4">
                            <label className="text-sm font-medium mb-2 block">Assign Selected To:</label>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {availableRiders.map((rider, index) => (
                                    <button 
                                        key={rider.id || `available-rider-${index}`}
                                        onClick={() => setSelectedRider(rider.id)}
                                        className={`flex-shrink-0 p-2 border rounded-lg w-[120px] text-left transition-colors ${selectedRider === rider.id ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="font-medium text-sm truncate">{rider.name}</div>
                                        <div className="text-xs text-gray-500">{rider.status}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Button 
                            className="w-full bg-[#F97316] hover:bg-[#EA580C]" 
                            disabled={!canAssign || selectedOrders.length === 0 || !selectedRider}
                            title={canAssign ? undefined : 'You do not have permission to assign orders'}
                            onClick={handleBatchAssign}
                        >
                            Assign {selectedOrders.length} Order{selectedOrders.length !== 1 ? 's' : ''}
                        </Button>
                    </div>
                </TabsContent>
                
                <TabsContent value="batch" className="mt-4">
                    <div className="p-6 border rounded-lg space-y-4">
                        <h3 className="font-medium text-lg text-gray-900">Batch by delivery zone</h3>
                        <p className="text-sm text-gray-500">
                          Select a zone to bulk-select unassigned orders, then assign from the Unassigned tab.
                        </p>
                        <div className="flex gap-2">
                          <select
                            className="flex-1 border rounded-lg px-3 py-2 text-sm"
                            value={batchZone}
                            onChange={(e) => setBatchZone(e.target.value)}
                          >
                            <option value="">Choose zone…</option>
                            {zoneOptions.map((z) => (
                              <option key={z} value={z}>{z}</option>
                            ))}
                          </select>
                          <Button variant="outline" onClick={selectOrdersByZone} disabled={!canAssign || !batchZone}>
                            Select zone orders
                          </Button>
                        </div>
                        {selectedOrders.length > 0 && (
                          <p className="text-xs text-[#757575]">
                            {selectedOrders.length} order(s) selected — switch to Unassigned tab to assign.
                          </p>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
