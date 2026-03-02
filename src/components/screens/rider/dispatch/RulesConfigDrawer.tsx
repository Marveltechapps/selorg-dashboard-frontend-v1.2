import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { AutoAssignRule } from "./types";
import { updateAutoAssignRule } from "./dispatchApi";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface RulesConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rules: AutoAssignRule[];
  onRulesUpdate: () => void;
}

export function RulesConfigDrawer({ isOpen, onClose, rules, onRulesUpdate }: RulesConfigDrawerProps) {
  const [activeRule, setActiveRule] = useState<AutoAssignRule | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rules.length > 0) {
      setActiveRule({ ...rules[0] });
    } else if (isOpen) {
      setActiveRule({
        id: 'default',
        name: 'Default Rule',
        isActive: false,
        criteria: {
          maxRadiusKm: 5,
          maxOrdersPerRider: 3,
          preferSameZone: true,
          priorityWeight: 5,
          distanceWeight: 5,
          etaWeight: 5,
        },
        createdBy: 'system',
        updatedAt: new Date().toISOString(),
      });
    }
  }, [rules, isOpen]);

  const handleSave = async () => {
    if (!activeRule) return;
    setLoading(true);
    try {
      await updateAutoAssignRule(activeRule);
      toast.success("Auto-assign rules updated");
      onRulesUpdate();
      onClose();
    } catch (error) {
      toast.error("Failed to update rules");
    } finally {
      setLoading(false);
    }
  };

  const updateCriteria = (key: keyof AutoAssignRule['criteria'], value: any) => {
    if (activeRule) {
      setActiveRule({
        ...activeRule,
        criteria: {
          ...activeRule.criteria,
          [key]: value
        }
      });
    }
  };

  if (!activeRule) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Auto-Assign Configuration</SheetTitle>
          <SheetDescription>
            Configure the logic used by the auto-assignment engine to distribute orders.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-8">
          {/* Main Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="space-y-0.5">
              <Label className="text-base">Rule Active</Label>
              <p className="text-xs text-gray-500">Enable this rule set for auto-assignment</p>
            </div>
            <Switch 
              checked={activeRule.isActive}
              onCheckedChange={(c) => setActiveRule({...activeRule, isActive: c})}
            />
          </div>

          {/* Hard Constraints */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-900 border-b pb-2">Constraints</h4>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Max Radius (km)</Label>
                <span className="text-sm font-medium">{activeRule.criteria.maxRadiusKm} km</span>
              </div>
              <Slider 
                value={[activeRule.criteria.maxRadiusKm]} 
                max={20} 
                step={0.5} 
                onValueChange={([v]) => updateCriteria('maxRadiusKm', v)}
              />
              <p className="text-xs text-gray-500">Maximum distance a rider can be from pickup.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Max Orders Per Rider</Label>
                <span className="text-sm font-medium">{activeRule.criteria.maxOrdersPerRider}</span>
              </div>
              <Slider 
                value={[activeRule.criteria.maxOrdersPerRider]} 
                max={10} 
                step={1} 
                onValueChange={([v]) => updateCriteria('maxOrdersPerRider', v)}
              />
            </div>

            <div className="flex items-center justify-between">
               <Label>Prefer Same Zone</Label>
               <Switch 
                 checked={activeRule.criteria.preferSameZone} 
                 onCheckedChange={(c) => updateCriteria('preferSameZone', c)}
               />
            </div>
          </div>

          {/* Scoring Weights */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-900 border-b pb-2">Scoring Weights (0-10)</h4>
            
            <div className="space-y-3">
              <div className="space-y-1">
                 <div className="flex justify-between">
                   <Label>Distance Weight</Label>
                   <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{activeRule.criteria.distanceWeight}</span>
                 </div>
                 <Slider 
                   value={[activeRule.criteria.distanceWeight]} 
                   max={10} 
                   step={1}
                   onValueChange={([v]) => updateCriteria('distanceWeight', v)}
                 />
                 <p className="text-[10px] text-gray-500">Higher weight prioritizes closest riders.</p>
              </div>

              <div className="space-y-1">
                 <div className="flex justify-between">
                   <Label>ETA Weight</Label>
                   <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{activeRule.criteria.etaWeight}</span>
                 </div>
                 <Slider 
                   value={[activeRule.criteria.etaWeight]} 
                   max={10} 
                   step={1}
                   onValueChange={([v]) => updateCriteria('etaWeight', v)}
                 />
                 <p className="text-[10px] text-gray-500">Prioritizes riders who can arrive soonest.</p>
              </div>

              <div className="space-y-1">
                 <div className="flex justify-between">
                   <Label>Priority Weight</Label>
                   <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{activeRule.criteria.priorityWeight}</span>
                 </div>
                 <Slider 
                   value={[activeRule.criteria.priorityWeight]} 
                   max={10} 
                   step={1}
                   onValueChange={([v]) => updateCriteria('priorityWeight', v)}
                 />
                 <p className="text-[10px] text-gray-500">Ensures high priority orders get best riders.</p>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter>
           <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
           <Button onClick={handleSave} className="bg-[#F97316] hover:bg-[#EA580C]" disabled={loading}>
             {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : "Save Configuration"}
           </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
