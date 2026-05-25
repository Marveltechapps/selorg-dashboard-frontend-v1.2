import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../../ui/sheet";
import { Switch } from "../../../ui/switch";
import { Button } from "../../../ui/button";
import { Badge } from "../../../ui/badge";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { Zap, TrendingUp, AlertCircle, Plus, Trash2, Edit2, Play, Pause } from "lucide-react";
import { Card, CardContent } from "../../../ui/card";
import { toast } from "sonner";
import { pricingApi, buildSurgeRulePayload, toSurgeRuleDisplay } from './pricingApi';

interface SurgePricingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultForm = {
  name: '',
  type: 'demand_based',
  multiplier: '1.2',
  zoneId: '',
  priority: '5',
  startDate: new Date().toISOString().split('T')[0],
};

export function SurgePricingDrawer({ open, onOpenChange }: SurgePricingDrawerProps) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [previewSku, setPreviewSku] = useState<{ name: string; base: number } | null>(null);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [enabled, rulesResp, zonesResp, skusResp] = await Promise.all([
        pricingApi.getSurgeEnabled(),
        pricingApi.getSurgeRules(),
        pricingApi.getReferencesZones(),
        pricingApi.getPricingSKUs(),
      ]);
      setIsEnabled(enabled);
      if (rulesResp.success && Array.isArray(rulesResp.data)) {
        setRules(rulesResp.data.map(toSurgeRuleDisplay));
      } else {
        setRules([]);
      }
      if (zonesResp.success && Array.isArray(zonesResp.data)) {
        setZones(zonesResp.data);
      }
      if (skusResp.success && Array.isArray(skusResp.data) && skusResp.data.length > 0) {
        const sku = skusResp.data[0];
        setPreviewSku({ name: sku.name, base: sku.sell ?? sku.base ?? 0 });
      }
    } catch (error) {
      console.error('Error loading surge pricing data:', error);
      setRules([]);
    }
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingRule(null);
    setShowCreateForm(false);
  };

  const handleDelete = async (id: string | number) => {
    try {
      await pricingApi.deleteSurgeRule(String(id));
      setRules(rules.filter(r => r.id !== id));
      toast.success("Surge rule deleted");
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error("Failed to delete rule");
    }
  };

  const toggleRule = async (rule: any) => {
    try {
      const nextStatus = rule.active ? 'inactive' : 'active';
      const payload = buildSurgeRulePayload({
        name: rule.name,
        type: rule.type,
        multiplier: rule.multiplier,
        status: nextStatus,
      });
      await pricingApi.updateSurgeRule(String(rule.id), payload);
      await loadData();
      toast.success(`Rule ${nextStatus === 'active' ? 'activated' : 'paused'}`);
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error("Failed to update rule");
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!form.name.trim()) {
      toast.error('Rule name is required');
      return;
    }
    if (form.type === 'zone_based' && !form.zoneId) {
      toast.error('Please select a zone');
      return;
    }
    try {
      const payload = buildSurgeRulePayload(form);
      if (editingRule) {
        await pricingApi.updateSurgeRule(String(editingRule.id), payload);
        toast.success("Surge rule updated");
      } else {
        await pricingApi.createSurgeRule(payload);
        toast.success("Surge rule created");
      }
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error creating/updating rule:', error);
      toast.error(error instanceof Error ? error.message : "Failed to save rule");
    }
  };

  const handleEditClick = (rule: any) => {
    setEditingRule(rule);
    setForm({
      name: rule.name || '',
      type: rule.type || 'demand_based',
      multiplier: String(rule.multiplier ?? '1.2').replace(/x/gi, ''),
      zoneId: rule.conditions?.zones?.[0] || '',
      priority: String(rule.priority ?? 5),
      startDate: rule.startDate ? rule.startDate.split('T')[0] : defaultForm.startDate,
    });
    setShowCreateForm(true);
  };

  const previewMultiplier = parseFloat(form.multiplier) || 1.2;
  const previewBase = previewSku?.base ?? 12;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[1500px] sm:w-[1400px] overflow-y-auto pr-32">
        <SheetHeader className="mb-6 mr-32">
          <SheetTitle className="flex items-center gap-2 text-3xl">
            <Zap className="text-purple-600" /> Surge Pricing
          </SheetTitle>
          <SheetDescription className="text-lg">
            Dynamic pricing rules based on real-time demand and conditions.
          </SheetDescription>
        </SheetHeader>

        {!showCreateForm ? (
            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                    <div>
                        <h3 className="font-medium text-slate-900">Region Status</h3>
                        <p className="text-sm text-slate-500">{isEnabled ? "Surge pricing is active" : "Surge pricing is disabled"}</p>
                    </div>
                    <Switch 
                      checked={isEnabled} 
                      onCheckedChange={async (checked) => {
                        try {
                          setIsEnabled(checked);
                          await pricingApi.setSurgeEnabled(checked);
                          toast.success(`Surge pricing ${checked ? 'enabled' : 'disabled'}`);
                        } catch {
                          setIsEnabled(!checked);
                          toast.error('Failed to update surge config');
                        }
                      }} 
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">Active Rules</h3>
                        <Button type="button" size="sm" onClick={() => { setForm(defaultForm); setShowCreateForm(true); }}>
                            <Plus size={16} className="mr-2" /> Add Rule
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {rules.length === 0 && (
                          <p className="text-sm text-slate-500 py-4 text-center">No surge rules yet. Add one to get started.</p>
                        )}
                        {rules.map(rule => (
                            <Card key={rule.id}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{rule.name || rule.zone}</span>
                                            <Badge variant={rule.active ? "default" : "secondary"}>
                                                {rule.active ? "Active" : "Paused"}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-slate-500 flex items-center gap-2">
                                            <AlertCircle size={14} /> {rule.trigger}
                                        </div>
                                        <div className="text-sm font-semibold text-purple-600">
                                            {rule.multiplier}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => toggleRule(rule)}>
                                            {rule.active ? <Pause size={16} /> : <Play size={16} />}
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => handleEditClick(rule)}>
                                            <Edit2 size={16} />
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(rule.id)}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        ) : (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">{editingRule ? "Edit Surge Rule" : "New Surge Rule"}</h3>
                    <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
                </div>

                <div className="space-y-2">
                    <Label>Rule Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Evening Demand Surge" />
                </div>
                
                <div className="space-y-2">
                    <Label>Trigger Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                        <SelectTrigger><SelectValue placeholder="Select trigger" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="demand_based">High Demand</SelectItem>
                            <SelectItem value="time_based">Time of Day</SelectItem>
                            <SelectItem value="zone_based">Zone Based</SelectItem>
                            <SelectItem value="event_based">Special Event</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {form.type === 'zone_based' && (
                  <div className="space-y-2">
                    <Label>Zone</Label>
                    <Select value={form.zoneId} onValueChange={(v) => setForm({ ...form, zoneId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                      <SelectContent>
                        {zones.map(z => (
                          <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                        ))}
                        {zones.length === 0 && (
                          <SelectItem value="none" disabled>No zones configured</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Multiplier (1.0 – 5.0)</Label>
                        <Input value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: e.target.value })} placeholder="1.2" type="number" min="1" max="5" step="0.1" />
                    </div>
                    <div className="space-y-2">
                        <Label>Priority</Label>
                        <Input value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} placeholder="5" type="number" min="1" max="10" />
                    </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border mt-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <TrendingUp size={14} /> Preview Impact
                    </h4>
                    <div className="text-xs space-y-1 text-slate-600">
                        <p>Sample SKU: {previewSku?.name ?? '—'}</p>
                        <p>Base Price: ₹{previewBase.toFixed(2)}</p>
                        <p className="font-bold text-slate-900">Surge Price: ₹{(previewBase * previewMultiplier).toFixed(2)}</p>
                    </div>
                </div>

                <Button type="button" onClick={handleCreateOrUpdate} className="w-full bg-purple-600 hover:bg-purple-700 mt-4">
                    {editingRule ? "Update Rule" : "Create Rule"}
                </Button>
            </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
