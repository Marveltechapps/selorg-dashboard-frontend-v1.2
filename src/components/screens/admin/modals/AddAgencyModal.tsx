import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AddAgencyModal({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { name: string; contactPerson?: string; phone?: string }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(() => name.trim().length > 1 && !saving, [name, saving]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setName('');
          setContactPerson('');
          setPhone('');
          setSaving(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Agency</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="agency-name">Agency name</Label>
            <Input id="agency-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Staffing" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agency-contact">Contact person</Label>
            <Input
              id="agency-contact"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agency-phone">Phone</Label>
            <Input id="agency-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!canSave) return;
              setSaving(true);
              try {
                await onSubmit({
                  name: name.trim(),
                  contactPerson: contactPerson.trim() || undefined,
                  phone: phone.trim() || undefined,
                });
                onOpenChange(false);
              } finally {
                setSaving(false);
              }
            }}
            disabled={!canSave}
          >
            {saving ? 'Saving…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

