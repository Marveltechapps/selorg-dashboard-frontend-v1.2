import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, Loader2 } from 'lucide-react';
import { fetchOnlineRiders } from './dispatch/dispatchApi';
import type { DispatchRider } from './dispatch/types';
import { useRiderPermissions } from '@/components/rider/useRiderPermissions';

interface AssignGroupRiderModalProps {
  open: boolean;
  onClose: () => void;
  orderIds: string[];
  groupLabel: string;
  onConfirm: (riderId: string, overrideSla: boolean) => Promise<void>;
  saving?: boolean;
}

export function AssignGroupRiderModal({
  open,
  onClose,
  orderIds,
  groupLabel,
  onConfirm,
  saving = false,
}: AssignGroupRiderModalProps) {
  const { can } = useRiderPermissions();
  const canAssign = can('dispatch.assign');
  const [search, setSearch] = useState('');
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [overrideSla, setOverrideSla] = useState(false);
  const [riders, setRiders] = useState<DispatchRider[]>([]);
  const [loadingRiders, setLoadingRiders] = useState(false);

  const orderCount = orderIds.length;

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedRiderId(null);
      setOverrideSla(false);
      return;
    }

    let cancelled = false;
    setLoadingRiders(true);
    fetchOnlineRiders()
      .then((list) => {
        if (!cancelled) setRiders(list);
      })
      .catch(() => {
        if (!cancelled) setRiders([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRiders(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const filteredRiders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return riders
      .filter((r) => {
        const status = String(r.status).toLowerCase();
        const eligibleStatus = status === 'online' || status === 'idle';
        if (!eligibleStatus) return false;

        const spare = r.maxCapacity - r.activeOrdersCount;
        if (spare < orderCount) return false;

        if (!q) return true;
        return `${r.name} ${r.zone || ''} ${r.id}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const spareA = a.maxCapacity - a.activeOrdersCount;
        const spareB = b.maxCapacity - b.activeOrdersCount;
        return spareB - spareA;
      });
  }, [riders, search, orderCount]);

  const handleConfirm = async () => {
    if (!selectedRiderId) return;
    await onConfirm(selectedRiderId, overrideSla);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Assign group to rider</DialogTitle>
          <DialogDescription>
            Select a rider with enough capacity for all {orderCount} orders in {groupLabel}.
            Same flow as Dispatch Operations manual assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-gray-50 px-6 py-3 border-y border-gray-100 text-sm text-gray-600">
          <p>
            Assigning <strong>{orderCount} orders</strong> to one rider. Each order is dispatched
            individually on confirm.
          </p>
        </div>

        <div className="p-4 flex-1 flex flex-col overflow-hidden min-h-[280px]">
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search riders…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loadingRiders ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading riders…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-2 pb-2 text-xs font-semibold text-gray-500 px-2">
                <div className="col-span-5">Rider</div>
                <div className="col-span-3">Status</div>
                <div className="col-span-4">Spare capacity</div>
              </div>
              <ScrollArea className="flex-1 -mx-4 px-4">
                <div className="space-y-2">
                  {filteredRiders.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 text-sm">
                      No riders with spare capacity for {orderCount} orders.
                    </div>
                  ) : (
                    filteredRiders.map((rider) => {
                      const spare = rider.maxCapacity - rider.activeOrdersCount;
                      const isSelected = selectedRiderId === rider.id;
                      return (
                        <div
                          key={rider.id}
                          onClick={() => setSelectedRiderId(rider.id)}
                          className={`grid grid-cols-12 gap-2 p-3 rounded-lg border cursor-pointer items-center transition-colors ${
                            isSelected
                              ? 'bg-orange-50 border-orange-500 shadow-sm'
                              : 'bg-white border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          <div className="col-span-5 flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isSelected ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              <User size={16} />
                            </div>
                            <div>
                              <div className="font-medium text-sm text-gray-900">{rider.name}</div>
                              <div className="text-xs text-gray-500">{rider.zone || rider.id}</div>
                            </div>
                          </div>
                          <div className="col-span-3">
                            <Badge
                              variant="outline"
                              className={
                                rider.status === 'online'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-gray-100'
                              }
                            >
                              {rider.status}
                            </Badge>
                          </div>
                          <div className="col-span-4 text-sm text-gray-600">
                            {spare} of {rider.maxCapacity} free
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter className="p-6 pt-2 border-t border-gray-100 flex-col sm:flex-row gap-3 items-center sm:justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="group-sla-override"
              checked={overrideSla}
              onCheckedChange={(c) => setOverrideSla(!!c)}
            />
            <label htmlFor="group-sla-override" className="text-sm font-medium">
              Override SLA warnings
            </label>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button
              className="bg-[#F97316] hover:bg-[#EA580C] flex-1 sm:flex-none"
              disabled={!canAssign || !selectedRiderId || saving}
              title={canAssign ? undefined : 'You do not have permission to assign orders'}
              onClick={() => void handleConfirm()}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning…
                </>
              ) : (
                `Assign ${orderCount} orders`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
