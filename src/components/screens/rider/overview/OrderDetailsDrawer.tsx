import React, { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter,
  SheetClose
} from '../../../../components/ui/sheet';
import { Button } from '../../../../components/ui/button';
import { Separator } from '../../../../components/ui/separator';
import { Badge } from '../../../../components/ui/badge';
import { Order, Rider } from './types';
import { MapPin, Clock, User, Package, Calendar, AlertTriangle } from 'lucide-react';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '../../../../components/ui/select';
import { Switch } from '../../../../components/ui/switch';
import { toast } from 'sonner';

interface OrderDetailsDrawerProps {
  order: Order | null;
  rider: Rider | undefined;
  isOpen: boolean;
  onClose: () => void;
  onReassign: (order: Order) => void;
  onAlert: (orderId: string, reason: string) => Promise<void>;
}

export function OrderDetailsDrawer({ 
  order, 
  rider,
  isOpen, 
  onClose,
  onReassign,
  onAlert
}: OrderDetailsDrawerProps) {
  if (!order) return null;

  const [isAlertMode, setIsAlertMode] = useState(false);
  const [alertReason, setAlertReason] = useState('Traffic');
  const [alertNote, setAlertNote] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);

  const handleAlertSubmit = async () => {
      await onAlert(order.id, `${alertReason}: ${alertNote}`);
      setIsAlertMode(false);
      setAlertNote('');
      toast.success("Alert sent successfully");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">Order #{order.id}</SheetTitle>
            <Badge variant="outline" className="text-sm">
                {order.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <SheetDescription>
            Created on {new Date().toLocaleDateString()}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status & ETA */}
          <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500 uppercase font-medium mb-1">Estimated Arrival</div>
                  <div className={`text-2xl font-bold ${order.etaMinutes && order.etaMinutes > 45 ? 'text-red-600' : 'text-green-600'}`}>
                      {order.etaMinutes || 0} mins
                  </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500 uppercase font-medium mb-1">SLA Deadline</div>
                  <div className="text-xl font-bold text-gray-800">
                      {new Date(order.slaDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
              </div>
          </div>

          {/* Locations */}
          <div className="space-y-4">
              <div className="flex gap-3">
                  <div className="mt-1">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <MapPin size={16} />
                      </div>
                  </div>
                  <div>
                      <h4 className="font-medium text-sm text-gray-900">Pickup Location</h4>
                      <p className="text-sm text-gray-500">{order.pickupLocation}</p>
                  </div>
              </div>
              <div className="pl-4 ml-4 border-l-2 border-dashed border-gray-200 h-6"></div>
              <div className="flex gap-3">
                  <div className="mt-1">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                          <MapPin size={16} />
                      </div>
                  </div>
                  <div>
                      <h4 className="font-medium text-sm text-gray-900">Dropoff Location</h4>
                      <p className="text-sm text-gray-500">{order.dropLocation}</p>
                      <p className="text-xs text-gray-400 mt-1">Customer: {order.customerName}</p>
                  </div>
              </div>
          </div>

          <Separator />

          {/* Rider Info */}
          <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                  <User size={16} /> Current Rider
              </h3>
              {rider ? (
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                              {rider.avatarInitials}
                          </div>
                          <div>
                              <p className="font-medium text-sm">{rider.name}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>⭐ {rider.rating.toFixed(1)}</span>
                                  <span>•</span>
                                  <span>{rider.status}</span>
                              </div>
                          </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => onReassign(order)}>
                          Reassign
                      </Button>
                  </div>
              ) : (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 flex justify-between items-center">
                      <span className="text-sm text-yellow-800">No rider assigned yet</span>
                      <Button size="sm" onClick={() => onReassign(order)}>Assign Now</Button>
                  </div>
              )}
          </div>

          <Separator />

          {/* Alert Section (Conditional) */}
          {isAlertMode ? (
              <div className="bg-red-50 p-4 rounded-lg border border-red-100 space-y-4">
                  <h3 className="font-medium text-red-800 flex items-center gap-2">
                      <AlertTriangle size={16} /> Report Issue
                  </h3>
                  
                  <div className="space-y-2">
                      <Label>Reason</Label>
                      <Select value={alertReason} onValueChange={setAlertReason}>
                          <SelectTrigger className="bg-white">
                              <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="Traffic">Traffic Congestion</SelectItem>
                              <SelectItem value="Rider Breakdown">Rider Vehicle Issue</SelectItem>
                              <SelectItem value="Customer Unreachable">Customer Unreachable</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  
                  <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea 
                          value={alertNote} 
                          onChange={(e) => setAlertNote(e.target.value)} 
                          placeholder="Describe the issue..." 
                          className="bg-white"
                      />
                  </div>

                  <div className="flex items-center justify-between">
                      <Label htmlFor="notify-customer" className="text-sm cursor-pointer">Notify Customer</Label>
                      <Switch 
                          id="notify-customer" 
                          checked={notifyCustomer} 
                          onCheckedChange={setNotifyCustomer} 
                      />
                  </div>

                  <div className="flex gap-2 pt-2">
                      <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleAlertSubmit}>
                          Send Alert
                      </Button>
                      <Button variant="outline" onClick={() => setIsAlertMode(false)}>
                          Cancel
                      </Button>
                  </div>
              </div>
          ) : (
              <div className="flex justify-end">
                  <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setIsAlertMode(true)}>
                      <AlertTriangle className="mr-2 h-4 w-4" /> Report Issue
                  </Button>
              </div>
          )}

          <Separator />

          {/* Timeline */}
          <div>
              <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Clock size={16} /> Timeline
              </h3>
              <div className="space-y-4 relative pl-2">
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200"></div>
                  {order.timeline.map((event, index) => (
                      <div key={index} className="relative pl-6">
                          <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white ${index === 0 ? 'bg-green-500 ring-2 ring-green-100' : 'bg-gray-300'}`}></div>
                          <p className="text-sm font-medium text-gray-900 capitalize">{event.status.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500">{new Date(event.time).toLocaleTimeString()}</p>
                          {event.note && <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">{event.note}</p>}
                      </div>
                  ))}
              </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
