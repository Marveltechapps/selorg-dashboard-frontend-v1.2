import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { fetchStores, type Store } from './storeWarehouseApi';
import { createShiftSlot, fetchStoreShiftSlots, type ShiftSlotItem } from '@/api/admin/pickerOpsApi';

const SHIFT_TYPES = ['morning', 'evening', 'night'] as const;

export function ShiftSlotManagement() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<string>('none');
  const [slots, setSlots] = useState<ShiftSlotItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState<(typeof SHIFT_TYPES)[number]>('morning');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  useEffect(() => {
    setLoading(true);
    fetchStores({ limit: 200, type: 'store' })
      .then((r) => setStores(r.data))
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  }, []);

  const loadSlots = async (id: string) => {
    if (!id || id === 'none') {
      setSlots([]);
      return;
    }
    try {
      const data = await fetchStoreShiftSlots(id);
      setSlots(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load shift slots');
      setSlots([]);
    }
  };

  useEffect(() => {
    loadSlots(storeId);
  }, [storeId]);

  const selectedStoreName = useMemo(
    () => stores.find((s) => s.id === storeId)?.name || '—',
    [stores, storeId]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Shift Slots</h1>
          <p className="text-sm text-[#71717a]">Create and manage shift slots per store.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadSlots(storeId)} disabled={storeId === 'none'}>
          <RefreshCw size={14} className="mr-1.5" /> Refresh
        </Button>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Store</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select store…</SelectItem>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)} disabled={storeId === 'none'}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIFT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Start</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={storeId === 'none'} />
          </div>
          <div className="space-y-1.5">
            <Label>End</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={storeId === 'none'} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            disabled={storeId === 'none'}
            onClick={async () => {
              if (storeId === 'none') return;
              try {
                await createShiftSlot(storeId, { type, startTime, endTime });
                toast.success(`Shift slot created for ${selectedStoreName}`);
                await loadSlots(storeId);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed to create shift slot');
              }
            }}
          >
            <Plus size={14} className="mr-1.5" /> Create slot
          </Button>
        </div>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-[#f9fafb] z-10">
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Geofence</TableHead>
                <TableHead>Grace</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-[#71717a]">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : storeId === 'none' ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-[#71717a]">
                    Select a store to view shift slots
                  </TableCell>
                </TableRow>
              ) : slots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-[#71717a]">
                    No shift slots for this store
                  </TableCell>
                </TableRow>
              ) : (
                slots.map((s) => (
                  <TableRow key={s.shiftSlotId} className="hover:bg-[#fcfcfc]">
                    <TableCell className="font-medium">{String(s.type).toUpperCase()}</TableCell>
                    <TableCell>{s.startTime}</TableCell>
                    <TableCell>{s.endTime}</TableCell>
                    <TableCell>{typeof s.geofenceRadiusMeters === 'number' ? `${s.geofenceRadiusMeters} m` : '—'}</TableCell>
                    <TableCell>{typeof s.gracePeriodMinutes === 'number' ? `${s.gracePeriodMinutes} min` : '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

