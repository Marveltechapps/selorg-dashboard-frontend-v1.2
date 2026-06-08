import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MapPin, Clock, User, Package, AlertTriangle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatOrderStatusLabel, buildMobileWorkflowTimeline } from './orderStatusLabels';
import type { Order, Rider } from '../screens/rider/overview/types';
import { findFleetRider } from '../screens/rider/overview/orderAssignment';
import { useRiderPermissions } from './useRiderPermissions';

export interface OrderCommandDrawerProps {
  order: Order | null;
  rider?: Rider;
  riders?: Rider[];
  isOpen: boolean;
  onClose: () => void;
  onReassign: (order: Order) => void;
  onAlert?: (orderId: string, reason: string) => Promise<void>;
  onOpenDispatch?: (orderId: string) => void;
  onEscalate?: (orderId: string) => void;
  codAmount?: number | null;
}

export function OrderCommandDrawer({
  order,
  rider,
  riders = [],
  isOpen,
  onClose,
  onReassign,
  onAlert,
  onOpenDispatch,
  onEscalate,
  codAmount,
}: OrderCommandDrawerProps) {
  const { can } = useRiderPermissions();
  const canAssign = can('dispatch.assign');
  const [isAlertMode, setIsAlertMode] = useState(false);
  const [alertReason, setAlertReason] = useState('Traffic');
  const [alertNote, setAlertNote] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);

  if (!order) return null;

  const resolvedRider =
    rider ||
    findFleetRider(riders, order.riderId) ||
    (order.riderId
      ? ({
          id: order.riderId,
          name: order.riderName || order.riderId,
          avatarInitials: (order.riderName || order.riderId).slice(0, 2).toUpperCase(),
          status: 'online' as const,
          capacity: { currentLoad: 1, maxLoad: 5 },
          avgEtaMins: 10,
          rating: 4.5,
        } satisfies Rider)
      : undefined);

  const workflowSteps = buildMobileWorkflowTimeline(order.status);
  const slaDeadline = order.slaDeadline ? new Date(order.slaDeadline) : null;
  const slaBreached = slaDeadline ? slaDeadline.getTime() < Date.now() : false;

  const handleAlertSubmit = async () => {
    if (!onAlert) return;
    await onAlert(order.id, `${alertReason}: ${alertNote}`);
    setIsAlertMode(false);
    setAlertNote('');
    toast.success('Alert sent successfully');
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[420px] sm:w-[560px] p-0 flex flex-col h-full gap-0 overflow-hidden">
        <SheetHeader className="shrink-0 px-6 pt-6 pb-4 pr-14 border-b border-[#E0E0E0] space-y-1.5 text-left">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-xl text-[#212121]">Order #{order.id}</SheetTitle>
            <Badge variant="outline" className={slaBreached ? 'border-red-300 text-red-700' : ''}>
              {formatOrderStatusLabel(order.status)}
            </Badge>
          </div>
          <SheetDescription className="text-sm text-[#757575]">
            Unified order command — assign, track, and resolve
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">
          {slaDeadline && (
            <div
              className={`rounded-lg p-3 flex items-center gap-3 ${
                slaBreached ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'
              }`}
            >
              <Clock size={18} className={slaBreached ? 'text-red-600' : 'text-orange-600'} />
              <div>
                <p className="text-sm font-medium">{slaBreached ? 'SLA breached' : 'SLA deadline'}</p>
                <p className="text-xs text-gray-600">{slaDeadline.toLocaleString()}</p>
              </div>
            </div>
          )}

          {codAmount != null && codAmount > 0 && (
            <div className="rounded-lg p-3 bg-amber-50 border border-amber-200 text-sm">
              COD order — collect ₹{codAmount.toLocaleString()} from customer
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">Delivery workflow</h4>
            <div className="space-y-2">
              {workflowSteps.map((step, i) => (
                <div key={step.step} className="flex items-center gap-2 text-sm">
                  <CheckCircle2
                    size={16}
                    className={step.done ? 'text-green-600' : 'text-gray-300'}
                  />
                  <span className={step.done ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                    {i + 1}. {step.step}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-[#F97316] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Pickup</p>
                <p className="text-sm font-medium">{order.pickupLocation}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Drop</p>
                <p className="text-sm font-medium">{order.dropLocation}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User size={18} className="text-gray-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Customer</p>
                <p className="text-sm font-medium">{order.customerName}</p>
              </div>
            </div>
            {order.items?.length > 0 && (
              <div className="flex items-start gap-3">
                <Package size={18} className="text-gray-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Items</p>
                  <p className="text-sm">{order.items.join(', ')}</p>
                </div>
              </div>
            )}
          </div>

          {resolvedRider && (
            <>
              <Separator />
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500 mb-1">Assigned rider</p>
                <p className="font-medium">{resolvedRider.name}</p>
                <p className="text-xs text-gray-500">{resolvedRider.id}</p>
              </div>
            </>
          )}

          {isAlertMode && onAlert && (
            <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
              <Label>Alert reason</Label>
              <Select value={alertReason} onValueChange={setAlertReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Traffic">Traffic delay</SelectItem>
                  <SelectItem value="Customer unreachable">Customer unreachable</SelectItem>
                  <SelectItem value="Address issue">Address issue</SelectItem>
                  <SelectItem value="Vehicle breakdown">Vehicle breakdown</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Describe the issue..."
                value={alertNote}
                onChange={(e) => setAlertNote(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Switch checked={notifyCustomer} onCheckedChange={setNotifyCustomer} id="notify-customer" />
                <Label htmlFor="notify-customer">Notify customer</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setIsAlertMode(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAlertSubmit}>
                  Send alert
                </Button>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="shrink-0 px-6 py-4 border-t bg-white flex-row flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canAssign}
            title={canAssign ? undefined : 'You do not have permission to assign orders'}
            onClick={() => onReassign(order)}
          >
            {resolvedRider ? 'Reassign' : 'Assign rider'}
          </Button>
          {onAlert && !isAlertMode && (
            <Button variant="outline" size="sm" onClick={() => setIsAlertMode(true)}>
              <AlertTriangle size={14} className="mr-1" /> Alert
            </Button>
          )}
          {onOpenDispatch && (
            <Button variant="outline" size="sm" onClick={() => onOpenDispatch(order.id)}>
              <ExternalLink size={14} className="mr-1" /> Open in Dispatch
            </Button>
          )}
          {onEscalate && (
            <Button variant="outline" size="sm" onClick={() => onEscalate(order.id)}>
              Escalate
            </Button>
          )}
          <Button variant="secondary" size="sm" className="ml-auto" onClick={onClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
