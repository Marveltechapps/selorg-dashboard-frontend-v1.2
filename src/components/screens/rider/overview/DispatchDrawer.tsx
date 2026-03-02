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
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedRider, setSelectedRider] = useState<string>('');

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
    if (selectedOrders.length === 0 || !selectedRider) return;
    for (const orderId of selectedOrders) {
      await onAssign(orderId, selectedRider);
    }
    toast.success(selectedOrders.length === 1 ? 'Order assigned successfully' : `Assigned ${selectedOrders.length} orders successfully`);
    setSelectedOrders([]);
    setSelectedRider('');
    onClose();
  };

  const availableRiders = riders.filter(r => r.status === 'idle' || r.status === 'online');

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
                                {unassignedOrders.map(order => (
                                    <div key={order.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
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
                                {availableRiders.map(rider => (
                                    <button 
                                        key={rider.id}
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
                            disabled={selectedOrders.length === 0 || !selectedRider}
                            onClick={handleBatchAssign}
                        >
                            Assign {selectedOrders.length} Order{selectedOrders.length !== 1 ? 's' : ''}
                        </Button>
                    </div>
                </TabsContent>
                
                <TabsContent value="batch" className="mt-4">
                    <div className="p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                        </div>
                        <h3 className="font-medium text-lg text-gray-900">Batch Dispatch Mode</h3>
                        <p className="text-sm text-gray-500 mt-2 max-w-xs">
                            Select a zone on the map to bulk assign orders to the nearest available fleet.
                        </p>
                        <Button variant="outline" className="mt-4">
                            Select Zone on Map
                        </Button>
                        
                        <div className="mt-8 w-full">
                            <h4 className="text-sm font-medium text-left mb-2">Load Distribution Preview</h4>
                            <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
                                <div className="h-full bg-green-500 w-[60%]" title="Optimal"></div>
                                <div className="h-full bg-yellow-500 w-[25%]" title="Heavy"></div>
                                <div className="h-full bg-red-500 w-[15%]" title="Overload"></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Optimal (60%)</span>
                                <span>Heavy (25%)</span>
                                <span>Overload (15%)</span>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
