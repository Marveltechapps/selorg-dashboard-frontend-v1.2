import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Clock, MapPin, CreditCard, Truck, RotateCcw } from 'lucide-react';

type OrderItem = {
  productName?: string;
  variantSize?: string;
  quantity?: number;
  price?: number;
  originalPrice?: number;
  image?: string;
  itemStatus?: string;
};

type CustomerOrder = {
  _id?: string;
  orderNumber?: string;
  order_id?: string;
  orderId?: string;
  status?: string;
  createdAt?: string;
  timeline?: Array<{ status?: string; timestamp?: string; note?: string; actor?: string }>;
  deliveryAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
  };
  deliveryNotes?: string;
  paymentMethod?: { methodType?: string; last4?: string };
  paymentStatus?: string;
  itemTotal?: number;
  handlingCharge?: number;
  deliveryFee?: number;
  discount?: number;
  deliveryTip?: number;
  totalBill?: number;
  items?: OrderItem[];
  cancellationReason?: string;
  refundStatus?: string;
  refundAmount?: number;
  refundId?: string;
  storeId?: string;
  riderId?: string;
};

export function CustomerOrderDetailsDrawer({
  open,
  onOpenChange,
  order,
  loading,
  onRefresh,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: CustomerOrder | null;
  loading?: boolean;
  onRefresh?: () => void | Promise<void>;
}) {
  if (!order) return null;

  const orderId =
    order.orderNumber || order.order_id || order.orderId || (order._id ? order._id.slice(-8) : '—');

  const status = (order.status || '—').replace(/-/g, ' ');
  const statusLabel = typeof status === 'string' ? status.toUpperCase() : String(status);

  const created = order.createdAt ? new Date(order.createdAt) : null;
  const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[560px] p-0 flex flex-col h-full gap-0 overflow-hidden" side="right">
        <SheetHeader className="shrink-0 px-6 pt-6 pb-4 pr-14 border-b border-[#E0E0E0] space-y-1.5 text-left">
          <div className="flex items-center justify-between gap-2 pr-2">
            <SheetTitle className="flex flex-wrap items-center gap-2 text-lg text-[#212121]">
              Order {orderId}
              <Badge variant="outline" className="capitalize">
                {statusLabel}
              </Badge>
            </SheetTitle>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRefresh()}
                disabled={Boolean(loading)}
              >
                <RotateCcw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </Button>
            )}
          </div>
          <SheetDescription className="text-sm text-[#757575]">
            {created ? `Created ${formatDate(created)}` : '—'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">
          {loading ? (
            <p className="text-sm text-gray-500">Loading order details...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Store</p>
                  <p className="font-medium">{order.storeId ? String(order.storeId).slice(-8) : '—'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Rider</p>
                  <p className="font-medium">{order.riderId ? String(order.riderId).slice(-8) : '—'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <MapPin size={16} /> Delivery
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-100">
                  <div className="text-sm text-gray-900">
                    {(order.deliveryAddress?.line1 || '') || '—'}
                    {order.deliveryAddress?.line2 ? `, ${order.deliveryAddress.line2}` : ''}
                  </div>
                  <div className="text-sm text-gray-600">
                    {[order.deliveryAddress?.city, order.deliveryAddress?.state]
                      .filter(Boolean)
                      .join(', ') || '—'}{' '}
                    {order.deliveryAddress?.pincode ? `- ${order.deliveryAddress.pincode}` : ''}
                  </div>
                  {order.deliveryAddress?.landmark ? (
                    <div className="text-xs text-gray-500">Landmark: {order.deliveryAddress.landmark}</div>
                  ) : null}
                  {order.deliveryNotes ? (
                    <div className="text-xs text-gray-500">Notes: {order.deliveryNotes}</div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <CreditCard size={16} /> Payment
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-100">
                  <div className="text-sm text-gray-900">
                    {order.paymentMethod?.methodType || 'cash'}{' '}
                    {order.paymentMethod?.last4 ? `••${order.paymentMethod.last4}` : ''}
                  </div>
                  <div className="text-sm text-gray-600">
                    Status: {(order.paymentStatus || '—').replace(/-/g, ' ')}
                  </div>
                  {order.refundStatus && order.refundStatus !== 'none' ? (
                    <div className="text-xs text-gray-500">
                      Refund: {order.refundStatus} {order.refundAmount != null ? `₹${order.refundAmount}` : ''}
                    </div>
                  ) : null}
                  {order.refundId ? (
                    <div className="text-xs text-gray-500">Refund ID: {order.refundId}</div>
                  ) : null}
                </div>
              </div>

              {order.items && order.items.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <Truck size={16} /> Items
                  </h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="px-4 py-2 font-medium">Product</th>
                          <th className="px-4 py-2 font-medium">Qty</th>
                          <th className="px-4 py-2 font-medium">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {order.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2">
                              <div className="font-medium text-gray-900">{it.productName || '—'}</div>
                              {it.variantSize ? (
                                <div className="text-xs text-gray-500">Variant: {it.variantSize}</div>
                              ) : null}
                              {it.itemStatus ? (
                                <div className="text-xs text-gray-500 capitalize">
                                  Item status: {String(it.itemStatus).replace(/_/g, ' ')}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-2">{it.quantity ?? '—'}</td>
                            <td className="px-4 py-2">
                              {it.price != null ? `₹${Number(it.price).toFixed(2)}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Clock size={16} /> Timeline
                </h3>
                {order.timeline && order.timeline.length > 0 ? (
                  <div className="space-y-4 relative pl-2">
                    <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200"></div>
                    {order.timeline.map((event, index) => (
                      <div key={index} className="relative pl-6">
                        <div
                          className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white ${
                            index === 0 ? 'bg-green-500 ring-2 ring-green-100' : 'bg-gray-300'
                          }`}
                        ></div>
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {(event.status || '—').replace(/-/g, ' ').replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {event.timestamp ? new Date(event.timestamp).toLocaleString() : '—'}
                        </p>
                        {event.note ? (
                          <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">{event.note}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No timeline events</p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-medium">Pricing</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Items</p>
                    <p className="font-medium">₹{Number(order.itemTotal || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Delivery Fee</p>
                    <p className="font-medium">₹{Number(order.deliveryFee || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Handling</p>
                    <p className="font-medium">₹{Number(order.handlingCharge || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Discount</p>
                    <p className="font-medium">₹{Number(order.discount || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-sm">
                  <p className="text-xs text-emerald-700 uppercase">Total</p>
                  <p className="text-lg font-bold text-emerald-800">₹{Number(order.totalBill || 0).toFixed(2)}</p>
                </div>
                {order.cancellationReason ? (
                  <p className="text-xs text-rose-700 mt-3">
                    Cancellation reason: {order.cancellationReason}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

