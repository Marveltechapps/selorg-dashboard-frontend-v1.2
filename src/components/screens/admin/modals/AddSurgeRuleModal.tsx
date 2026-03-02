import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { createSurgeRule, updateSurgeRule, fetchReferencesCategories, fetchReferencesZones, type SurgeRule } from '../pricingApi';
import { toast } from 'sonner';
import { TrendingUp, Clock, MapPin, Calendar } from 'lucide-react';

interface AddSurgeRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editRule?: SurgeRule | null;
  duplicateRule?: SurgeRule | null;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultFormData = {
  name: '',
  description: '',
  type: 'time_based' as 'time_based' | 'demand_based' | 'zone_based' | 'event_based',
  multiplier: '1.2',
  startTime: '18:00',
  endTime: '21:00',
  selectedDays: [] as string[],
  selectedZones: [] as string[],
  selectedCategories: [] as string[],
  priority: '5',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
};

export function AddSurgeRuleModal({ open, onOpenChange, onSuccess, editRule, duplicateRule }: AddSurgeRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setRefsLoading(true);
      Promise.all([fetchReferencesCategories(), fetchReferencesZones()])
        .then(([cats, zs]) => {
          setCategories(cats);
          setZones(zs);
        })
        .catch(() => {
          setCategories([]);
          setZones([]);
        })
        .finally(() => setRefsLoading(false));
    }
  }, [open]);

  // Pre-fill form when editing or duplicating
  React.useEffect(() => {
    if (!open) return;
    if (editRule) {
      const slots = editRule.conditions?.timeSlots?.[0];
      setFormData({
        name: editRule.name,
        description: editRule.description || '',
        type: editRule.type,
        multiplier: String(editRule.multiplier),
        startTime: slots?.start || '18:00',
        endTime: slots?.end || '21:00',
        selectedDays: slots?.days || [],
        selectedZones: editRule.conditions?.zones || [],
        selectedCategories: editRule.applicableCategories?.filter(c => c !== 'All') || [],
        priority: String(editRule.priority || 5),
        startDate: editRule.startDate ? editRule.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: editRule.endDate ? editRule.endDate.split('T')[0] : '',
      });
    } else if (duplicateRule) {
      setFormData({
        name: `${duplicateRule.name} (Copy)`,
        description: duplicateRule.description || '',
        type: duplicateRule.type,
        multiplier: String(duplicateRule.multiplier),
        startTime: duplicateRule.conditions?.timeSlots?.[0]?.start || '18:00',
        endTime: duplicateRule.conditions?.timeSlots?.[0]?.end || '21:00',
        selectedDays: duplicateRule.conditions?.timeSlots?.[0]?.days || [],
        selectedZones: duplicateRule.conditions?.zones || [],
        selectedCategories: duplicateRule.applicableCategories?.filter(c => c !== 'All') || [],
        priority: String(duplicateRule.priority || 5),
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [open, editRule, duplicateRule]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(day)
        ? prev.selectedDays.filter(d => d !== day)
        : [...prev.selectedDays, day]
    }));
  };

  const toggleZone = (zoneId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedZones: prev.selectedZones.includes(zoneId)
        ? prev.selectedZones.filter(z => z !== zoneId)
        : [...prev.selectedZones, zoneId]
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(categoryId)
        ? prev.selectedCategories.filter(c => c !== categoryId)
        : [...prev.selectedCategories, categoryId]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Rule name is required');
      return;
    }

    const multiplier = parseFloat(formData.multiplier);
    if (!multiplier || multiplier < 1 || multiplier > 5) {
      toast.error('Multiplier must be between 1.0 and 5.0');
      return;
    }

    if (formData.type === 'time_based' && formData.selectedDays.length === 0) {
      toast.error('Please select at least one day');
      return;
    }

    if (formData.type === 'zone_based' && formData.selectedZones.length === 0) {
      toast.error('Please select at least one zone');
      return;
    }

    setLoading(true);
    try {
      const conditions: any = {};
      
      if (formData.type === 'time_based') {
        conditions.timeSlots = [{
          start: formData.startTime,
          end: formData.endTime,
          days: formData.selectedDays
        }];
      } else if (formData.type === 'zone_based') {
        conditions.zones = formData.selectedZones;
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        multiplier,
        conditions,
        applicableCategories: formData.selectedCategories.length > 0 ? formData.selectedCategories : [],
        applicableProducts: [] as string[],
        priority: parseInt(formData.priority),
        status: 'active' as const,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      };

      if (editRule) {
        await updateSurgeRule(editRule.id, payload);
        toast.success(`Surge rule "${formData.name}" updated successfully`);
      } else {
        await createSurgeRule(payload);
        toast.success(`Surge rule "${formData.name}" created successfully`);
      }

      onSuccess();
      onOpenChange(false);
      setFormData(defaultFormData);
    } catch (error) {
      toast.error(editRule ? 'Failed to update surge rule' : 'Failed to create surge rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="text-amber-600" size={20} />
            </div>
            <div>
            <DialogTitle>{editRule ? 'Edit Surge Pricing Rule' : duplicateRule ? 'Duplicate Surge Rule' : 'Create Surge Pricing Rule'}</DialogTitle>
            <DialogDescription>{editRule ? 'Update the surge rule' : 'Set up dynamic pricing based on time, demand, or zones'}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Rule Name */}
          <div className="space-y-2">
            <Label htmlFor="rule-name">Rule Name *</Label>
            <Input
              id="rule-name"
              placeholder="e.g., Evening Rush Hour Surge"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="rule-desc">Description</Label>
            <Textarea
              id="rule-desc"
              placeholder="Brief description of when this rule applies..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
            />
          </div>

          {/* Rule Type */}
          <div className="space-y-2">
            <Label>Surge Type *</Label>
            <Select value={formData.type} onValueChange={(val: any) => handleChange('type', val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time_based">
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>Time-Based (Peak Hours)</span>
                  </div>
                </SelectItem>
                <SelectItem value="zone_based">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    <span>Zone-Based (Location Premium)</span>
                  </div>
                </SelectItem>
                <SelectItem value="event_based">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <span>Event-Based (Special Occasions)</span>
                  </div>
                </SelectItem>
                <SelectItem value="demand_based">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} />
                    <span>Demand-Based (High Traffic)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Multiplier */}
          <div className="space-y-2">
            <Label htmlFor="multiplier">Price Multiplier *</Label>
            <div className="flex items-center gap-3">
              <Input
                id="multiplier"
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={formData.multiplier}
                onChange={(e) => handleChange('multiplier', e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-[#71717a]">×</span>
              <div className="flex-1 p-3 bg-[#f4f4f5] rounded-lg">
                <p className="text-sm text-[#52525b]">
                  Base Price: <span className="font-bold">₹100</span> → Surge Price: <span className="font-bold text-amber-600">₹{(100 * parseFloat(formData.multiplier || '1')).toFixed(0)}</span>
                </p>
              </div>
            </div>
            <p className="text-xs text-[#71717a]">Multiplier range: 1.0× (no surge) to 5.0× (5x price)</p>
          </div>

          {/* Time-Based Settings */}
          {formData.type === 'time_based' && (
            <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="font-bold text-[#18181b] text-sm">Time Settings</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleChange('startTime', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Active Days *</Label>
                <div className="grid grid-cols-4 gap-2">
                  {DAYS.map(day => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day}`}
                        checked={formData.selectedDays.includes(day)}
                        onCheckedChange={() => toggleDay(day)}
                      />
                      <Label htmlFor={`day-${day}`} className="text-xs cursor-pointer">{day.slice(0, 3)}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Zone-Based Settings */}
          {formData.type === 'zone_based' && (
            <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-bold text-[#18181b] text-sm">Zone Settings</h4>
              <Label>Premium Zones *</Label>
              {refsLoading ? (
                <p className="text-sm text-[#71717a]">Loading zones...</p>
              ) : zones.length === 0 ? (
                <p className="text-sm text-amber-600">No zones available. Add zones in Master Data first.</p>
              ) : (
              <div className="grid grid-cols-2 gap-2">
                {zones.map(zone => (
                  <div key={zone.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`zone-${zone.id}`}
                      checked={formData.selectedZones.includes(zone.id)}
                      onCheckedChange={() => toggleZone(zone.id)}
                    />
                    <Label htmlFor={`zone-${zone.id}`} className="text-sm cursor-pointer">{zone.name}</Label>
                  </div>
                ))}
              </div>
              )}
            </div>
          )}

          {/* Applicable Categories */}
          <div className="space-y-3">
            <Label>Applicable Categories (Leave empty for all)</Label>
            {refsLoading ? (
              <p className="text-sm text-[#71717a]">Loading categories...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-amber-600">No categories available. Add categories in Catalog first.</p>
            ) : (
            <div className="grid grid-cols-2 gap-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cat-${cat.id}`}
                    checked={formData.selectedCategories.includes(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                  />
                  <Label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer">{cat.name}</Label>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Priority & Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="10"
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
              />
              <p className="text-xs text-[#71717a]">1 = Highest</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date *</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#e4e4e7]">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
            {loading ? (editRule ? 'Updating...' : 'Creating...') : (editRule ? 'Update Rule' : 'Create Surge Rule')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
