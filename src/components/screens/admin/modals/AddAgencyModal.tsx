import React, { useMemo, useState } from 'react';
import { AdminModal } from './AdminModal';
import { AdminField, AdminForm } from './AdminForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setName('');
      setContactPerson('');
      setPhone('');
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Add Agency"
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            form="agency-form"
            type="submit"
            disabled={!canSave}
          >
            {saving ? 'Saving...' : 'Create'}
          </Button>
        </>
      }
    >
      <AdminForm
        id="agency-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSave) return;
          setSaving(true);
          try {
            await onSubmit({
              name: name.trim(),
              contactPerson: contactPerson.trim() || undefined,
              phone: phone.trim() || undefined,
            });
            handleOpenChange(false);
          } finally {
            setSaving(false);
          }
        }}
      >
        <AdminField label="Agency name" htmlFor="agency-name">
          <Input id="agency-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Staffing" />
        </AdminField>
        <AdminField label="Contact person" htmlFor="agency-contact">
          <Input
            id="agency-contact"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="John Doe"
          />
        </AdminField>
        <AdminField label="Phone" htmlFor="agency-phone">
          <Input id="agency-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." />
        </AdminField>
      </AdminForm>
    </AdminModal>
  );
}
