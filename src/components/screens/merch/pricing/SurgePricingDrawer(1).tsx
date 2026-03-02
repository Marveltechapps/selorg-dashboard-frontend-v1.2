import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../../ui/sheet";
import { Switch } from "../../../ui/switch";
import { Button } from "../../../ui/button";
import { Badge } from "../../../ui/badge";
import { Separator } from "../../../ui/separator";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { Zap, Clock, TrendingUp, AlertCircle, Plus, Trash2, Edit2, Play, Pause } from "lucide-react";
import { Card, CardContent } from "../../../ui/card";
import { toast } from "sonner";

interface SurgePricingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SurgePricingDrawer({ open, onOpenChange }: SurgePricingDrawerProps) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);

  // Mock data
  const [rules, setRules] = useState([
    { id: 1, zone: 'Downtown', trigger: 'Rain > 5mm', multiplier: '1.2x', active: true, minMult: '1.1x', maxMult: '1.3x' },
    { id: 2, zone: 'North End', trigger: 'Orders > 500/hr', multiplier: '1.15x', active: false, minMult: '1.1x', maxMult: '1.2x' },
  ]);

  const [newRule, setNewRule] = useState({
    zone: 'downtown',
    trigger: 'demand',
    minMult: '1.1x',
    maxMult: '1.5x'
  });

  const handleDelete = (id: number) => {
    setRules(rules.filter(r => r.id !== id));
    toast.error("Surge rule deleted");
  };

  const toggleRule = (id: number) => {
    setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const handleCreateOrUpdate = () => {
    if (editingRule) {
        setRules(rules.map(r => r.id === editingRule.id ? { 
            ...r, 
            zone: newRule.zone.charAt(0).toUpperCase() + newRule.zone.slice(1),
            trigger: newRule.trigger === 'demand' ? 'Orders > 500/hr' : 'Condition Met',
            multiplier: newRule.maxMult,
            minMult: newRule.minMult,
            maxMult: newRule.maxMult
        } : r));
        toast.success("Surge rule updated");
    } else {
        const rule = {
            id: Date.now(),
            zone: newRule.zone.charAt(0).toUpperCase() + newRule.zone.slice(1),
            trigger: newRule.trigger === 'demand' ? 'Orders > 500/hr' : 'Condition Met',
            multiplier: newRule.maxMult,
            active: true,
            minMult: newRule.minMult,
            maxMult: newRule.maxMult
        };
        setRules([...rules, rule]);
        toast.success("Surge rule created");
    }
    setShowCreateForm(false);
    setEditingRule(null);
  };

  const handleEditClick = (rule: any) => {
    setEditingRule(rule);
    setNewRule({
        zone: rule.zone.toLowerCase(),
        trigger: 'demand', // Simplified for mock
        minMult: rule.minMult,
        maxMult: rule.maxMult
    });
    setShowCreateForm(true);
  };

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
                    <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">Active Rules</h3>
                        <Button type="button" size="sm" onClick={() => setShowCreateForm(true)}>
                            <Plus size={16} className="mr-2" /> Add Rule
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {rules.map(rule => (
                            <Card key={rule.id}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{rule.zone}</span>
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
                                        <Button type="button" variant="ghost" size="icon" onClick={() => toggleRule(rule.id)}>
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
                    <Button type="button" variant="ghost" size="sm" onClick={() => {
                        setShowCreateForm(false);
                        setEditingRule(null);
                    }}>Cancel</Button>
                </div>
                
                <div className="space-y-2">
                    <Label>Zone/Region</Label>
                    <Select value={newRule.zone} onValueChange={(v) => setNewRule({...newRule, zone: v})}>
                        <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="downtown">Downtown</SelectItem>
                            <SelectItem value="northend">North End</SelectItem>
                            <SelectItem value="westside">West Side</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Trigger Type</Label>
                    <Select value={newRule.trigger} onValueChange={(v) => setNewRule({...newRule, trigger: v})}>
                        <SelectTrigger><SelectValue placeholder="Select trigger" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="demand">High Demand</SelectItem>
                            <SelectItem value="weather">Bad Weather</SelectItem>
                            <SelectItem value="traffic">Heavy Traffic</SelectItem>
                            <SelectItem value="time">Time of Day</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Min Multiplier</Label>
                        <Input value={newRule.minMult} onChange={(e) => setNewRule({...newRule, minMult: e.target.value})} placeholder="1.1x" />
                    </div>
                    <div className="space-y-2">
                        <Label>Max Multiplier</Label>
                        <Input value={newRule.maxMult} onChange={(e) => setNewRule({...newRule, maxMult: e.target.value})} placeholder="1.5x" />
                    </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border mt-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <TrendingUp size={14} /> Preview Impact
                    </h4>
                    <div className="text-xs space-y-1 text-slate-600">
                        <p>Sample SKU: Burger Combo</p>
                        <p>Base Price: ₹12.00</p>
                        <p className="font-bold text-slate-900">Surge Price: ₹13.20 - ₹18.00</p>
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
