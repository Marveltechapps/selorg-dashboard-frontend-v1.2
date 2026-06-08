import React, { useEffect, useMemo, useState } from 'react';
import { AdminModal } from './AdminModal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DIALOG_SELECT_CONTENT_CLASS } from '@/components/ui/dialogSelect';
import { toast } from 'sonner';
import { fetchAgencies, fetchStoreShiftSlots, type AgencyItem, type ShiftSlotItem } from '@/api/admin/pickerOpsApi';
import { fetchStores, type Store } from '@/components/screens/admin/storeWarehouseApi';

export function AssignPickerModal({
  open,
  onOpenChange,
  pickerName,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickerName: string;
  initial?: { agencyId?: string | null; storeId?: string | null; shiftSlotId?: string | null };
  onSubmit: (payload: { agencyId?: string | null; storeId?: string | null; shiftSlotId?: string | null }) => Promise<void>;
}) {
  const [agencies, setAgencies] = useState<AgencyItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [slots, setSlots] = useState<ShiftSlotItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [agencyId, setAgencyId] = useState<string>(initial?.agencyId || 'none');
  const [storeId, setStoreId] = useState<string>(initial?.storeId || 'none');
  const [shiftSlotId, setShiftSlotId] = useState<string>(initial?.shiftSlotId || 'none');

  useEffect(() => {
    if (!open) return;
    setAgencyId(initial?.agencyId || 'none');
    setStoreId(initial?.storeId || 'none');
    setShiftSlotId(initial?.shiftSlotId || 'none');
  }, [open, initial?.agencyId, initial?.storeId, initial?.shiftSlotId]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetchAgencies().catch(() => [] as AgencyItem[]),
      fetchStores({ limit: 200, type: 'store' }).then((r) => r.data).catch(() => [] as Store[]),
    ])
      .then(([a, s]) => {
        setAgencies(a);
        setStores(s);
      })
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!storeId || storeId === 'none') {
      setSlots([]);
      setShiftSlotId('none');
      return;
    }
    fetchStoreShiftSlots(storeId)
      .then((data) => setSlots(data))
      .catch(() => {
        setSlots([]);
        setShiftSlotId('none');
      });
  }, [open, storeId]);

  const canSave = useMemo(() => !loading, [loading]);

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title="Assign picker"
      subtitle={`Set agency, store, and shift slot for ${pickerName}.`}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!canSave) return;
              try {
                await onSubmit({
                  agencyId: agencyId === 'none' ? null : agencyId,
                  storeId: storeId === 'none' ? null : storeId,
                  shiftSlotId: shiftSlotId === 'none' ? null : shiftSlotId,
                });
                onOpenChange(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed to assign picker');
              }
            }}
            disabled={!canSave}
          >
            Save
          </Button>
        </>
      }
    >
        <div className="space-y-4 px-6 py-4">
          <div className="space-y-1.5">
            <Label>Agency</Label>
            <Select value={agencyId} onValueChange={setAgencyId} modal={false}>
              <SelectTrigger>
                <SelectValue placeholder="Select agency" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className={DIALOG_SELECT_CONTENT_CLASS}>
                <SelectItem value="none">Unassigned</SelectItem>
                {agencies.map((a) => (
                  <SelectItem key={a.agencyId} value={a.agencyId}>
                    {a.name} {a.isActive ? '' : '(inactive)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Store</Label>
            <Select value={storeId} onValueChange={setStoreId} modal={false}>
              <SelectTrigger>
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className={DIALOG_SELECT_CONTENT_CLASS}>
                <SelectItem value="none">Unassigned</SelectItem>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Shift slot</Label>
            <Select
              value={shiftSlotId}
              onValueChange={setShiftSlotId}
              disabled={storeId === 'none' || slots.length === 0}
              modal={false}
            >
              <SelectTrigger>
                <SelectValue placeholder={storeId === 'none' ? 'Pick store first' : 'Select shift slot'} />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className={DIALOG_SELECT_CONTENT_CLASS}>
                <SelectItem value="none">Unassigned</SelectItem>
                {slots.map((slot) => (
                  <SelectItem key={slot.shiftSlotId} value={slot.shiftSlotId}>
                    {String(slot.type).toUpperCase()} • {slot.startTime} - {slot.endTime}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

    </AdminModal>
  );
}

