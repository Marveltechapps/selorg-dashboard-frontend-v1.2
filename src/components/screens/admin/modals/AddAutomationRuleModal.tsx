import React, { useState, useEffect } from 'react';
import { AdminModal } from './AdminModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  createAutomationRule,
  updateAutomationRule,
  fetchTemplates,
  NotificationTemplate,
  AutomationRule,
} from '../notificationsApi';
import { toast } from 'sonner';
import { Zap } from 'lucide-react';

interface AddAutomationRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editRule?: AutomationRule | null;
}

const TRIGGERS = [
  { value: 'order_placed', label: 'Order Placed' },
  { value: 'order_delivered', label: 'Order Delivered' },
  { value: 'cart_abandoned', label: 'Cart Abandoned' },
  { value: 'user_signup', label: 'User Signup' },
  { value: 'payment_failed', label: 'Payment Failed' },
];

const CHANNELS = [
  { value: 'push', label: 'Push Notification' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'in-app', label: 'In-App' },
];

const emptyForm = () => ({
  name: '',
  trigger: '' as AutomationRule['trigger'] | '',
  templateId: '',
  delay: '0',
  channels: [] as ('push' | 'sms' | 'email' | 'in-app')[],
});

export function AddAutomationRuleModal({
  open,
  onOpenChange,
  onSuccess,
  editRule = null,
}: AddAutomationRuleModalProps) {
  const isEdit = Boolean(editRule?.id);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;

    loadTemplates();

    if (editRule) {
      setFormData({
        name: editRule.name,
        trigger: editRule.trigger,
        templateId: editRule.templateId,
        delay: String(editRule.delay ?? 0),
        channels: [...editRule.channels],
      });
    } else {
      setFormData(emptyForm());
    }
  }, [open, editRule]);

  const loadTemplates = async () => {
    try {
      const data = await fetchTemplates();
      setTemplates(data.filter((t) => t.status === 'active'));
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleChannel = (channel: 'push' | 'sms' | 'email' | 'in-app') => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Rule name is required');
      return;
    }
    if (!formData.trigger) {
      toast.error('Please select a trigger');
      return;
    }
    if (!formData.templateId) {
      toast.error('Please select a template');
      return;
    }
    if (formData.channels.length === 0) {
      toast.error('Please select at least one channel');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        trigger: formData.trigger,
        templateId: formData.templateId,
        delay: parseInt(formData.delay, 10) || 0,
        channels: formData.channels,
      };

      if (isEdit && editRule) {
        await updateAutomationRule(editRule.id, payload);
        toast.success('Automation rule updated successfully');
      } else {
        await createAutomationRule({ ...payload, status: 'active' });
        toast.success('Automation rule created successfully');
      }

      onSuccess();
      onOpenChange(false);
      setFormData(emptyForm());
    } catch (error) {
      console.error(isEdit ? 'Update automation rule error:' : 'Create automation rule error:', error);
      const msg = error instanceof Error ? error.message : 'Request failed';
      toast.error(isEdit ? `Failed to update rule: ${msg}` : `Failed to create rule: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Automation Rule' : 'Create Automation Rule'}
      subtitle={
        isEdit
          ? 'Update trigger, template, delay, or channels'
          : 'Set up automatic notifications based on triggers'
      }
      icon={<Zap size={20} />}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#e11d48] hover:bg-[#be123c]">
            {loading ? (isEdit ? 'Saving...' : 'Creating...') : isEdit ? 'Save Changes' : 'Create Rule'}
          </Button>
        </>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Welcome New Users"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delay">Delay (minutes)</Label>
              <Input
                id="delay"
                type="number"
                placeholder="0"
                value={formData.delay}
                onChange={(e) => handleChange('delay', e.target.value)}
                min="0"
              />
              <p className="text-xs text-gray-500">Delay before sending notification after trigger</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Trigger Event *</Label>
              <Select value={formData.trigger} onValueChange={(val) => handleChange('trigger', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger event" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      {trigger.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Template *</Label>
              <Select value={formData.templateId} onValueChange={(val) => handleChange('templateId', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} - {template.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Channels *</Label>
            <div className="grid grid-cols-2 gap-2 p-3 border border-[#e4e4e7] rounded-lg">
              {CHANNELS.map((channel) => (
                <div key={channel.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`channel-${channel.value}`}
                    checked={formData.channels.includes(channel.value as 'push' | 'sms' | 'email' | 'in-app')}
                    onCheckedChange={() => toggleChannel(channel.value as 'push' | 'sms' | 'email' | 'in-app')}
                  />
                  <Label htmlFor={`channel-${channel.value}`} className="text-sm cursor-pointer">
                    {channel.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminModal>
  );
}
