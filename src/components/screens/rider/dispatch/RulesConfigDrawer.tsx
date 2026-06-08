import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { AutoAssignRule } from "./types";
import { updateAutoAssignRule, simulateAutoAssignOrders } from "./dispatchApi";
import { toast } from "sonner";
import { Loader2, PlayCircle } from "lucide-react";

const DEFAULT_CRITERIA: AutoAssignRule["criteria"] = {
  maxRadiusKm: 5,
  maxOrdersPerRider: 3,
  preferSameZone: true,
};

interface RulesConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rules: AutoAssignRule[];
  onRulesUpdate: () => void;
}

export function RulesConfigDrawer({ isOpen, onClose, rules, onRulesUpdate }: RulesConfigDrawerProps) {
  const [activeRule, setActiveRule] = useState<AutoAssignRule | null>(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  useEffect(() => {
    if (rules.length > 0) {
      setActiveRule({
        ...rules[0],
        criteria: { ...DEFAULT_CRITERIA, ...rules[0].criteria },
      });
    } else if (isOpen) {
      setActiveRule({
        id: "default",
        name: "Default Rule",
        isActive: false,
        criteria: { ...DEFAULT_CRITERIA },
        createdBy: "system",
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
    } catch {
      toast.error("Failed to update rules");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    setSimulationResult(null);
    try {
      const result = await simulateAutoAssignOrders([]);
      const preview = result.assignments?.slice(0, 5).map((a) =>
        a.riderName ? `${a.orderId} → ${a.riderName}` : `${a.orderId} (unassigned)`
      ).join(', ') || 'No matches';
      setSimulationResult(
        `${result.message || 'Simulation complete'} — ${preview}${(result.assignments?.length ?? 0) > 5 ? '…' : ''}`
      );
      toast.info(result.message || `Would assign ${result.assigned} order(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const updateCriteria = (key: keyof AutoAssignRule["criteria"], value: number | boolean) => {
    if (activeRule) {
      setActiveRule({
        ...activeRule,
        criteria: {
          ...activeRule.criteria,
          [key]: value,
        },
      });
    }
  };

  if (!activeRule) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[520px] p-0 flex flex-col h-full gap-0 overflow-hidden">
        <SheetHeader className="shrink-0 px-6 pt-6 pb-4 pr-14 border-b border-[#E0E0E0] space-y-1.5 text-left">
          <SheetTitle className="text-lg text-[#212121]">Auto-Assign Configuration</SheetTitle>
          <SheetDescription className="text-sm text-[#757575] leading-relaxed">
            Configure constraints used by auto-assign and rider recommendations in Dispatch Operations.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-8">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="space-y-0.5">
              <Label className="text-base">Rule Active</Label>
              <p className="text-xs text-gray-500">When on, pending orders are auto-assigned on a schedule</p>
            </div>
            <Switch
              checked={activeRule.isActive}
              onCheckedChange={(c) => setActiveRule({ ...activeRule, isActive: c })}
            />
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-900 border-b border-[#E0E0E0] pb-2">Constraints</h4>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Max Radius (km)</Label>
                <span className="text-sm font-medium">{activeRule.criteria.maxRadiusKm} km</span>
              </div>
              <Slider
                value={[activeRule.criteria.maxRadiusKm]}
                max={20}
                step={0.5}
                onValueChange={([v]) => updateCriteria("maxRadiusKm", v)}
              />
              <p className="text-xs text-gray-500">Riders farther than this from pickup are excluded.</p>
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
                onValueChange={([v]) => updateCriteria("maxOrdersPerRider", v)}
              />
              <p className="text-xs text-gray-500">Cap on concurrent assignments per rider during auto-assign.</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Prefer Same Zone</Label>
                <p className="text-xs text-gray-500 mt-0.5">Only match riders in the order zone when set</p>
              </div>
              <Switch
                checked={activeRule.criteria.preferSameZone}
                onCheckedChange={(c) => updateCriteria("preferSameZone", c)}
              />
            </div>

            {simulationResult && (
              <p className="text-xs text-[#757575] bg-[#FAFAFA] border rounded-lg p-3">{simulationResult}</p>
            )}
          </div>
        </div>

        <SheetFooter className="shrink-0 flex-col sm:flex-row gap-2 border-t border-[#E0E0E0] px-6 py-4">
          <Button
            variant="outline"
            onClick={() => void handleSimulate()}
            disabled={simulating || loading}
            className="w-full sm:w-auto"
          >
            {simulating ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <PlayCircle className="w-4 h-4 mr-2" />}
            Simulate Now
          </Button>
          <div className="flex gap-2 flex-1 justify-end w-full">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1 sm:flex-none bg-[#F97316] hover:bg-[#EA580C]" disabled={loading}>
            {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
            Save Configuration
          </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
