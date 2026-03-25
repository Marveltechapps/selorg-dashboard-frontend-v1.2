import React, { useState } from 'react';
import { History, Sliders, UserPlus, AlertTriangle, Video } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PickerApprovals } from './PickerApprovals';
import { PickerActivityLogs } from './PickerActivityLogs';
import { PickerConfigManagement } from './PickerConfigManagement';
import { TrainingContentManagement } from './TrainingContentManagement';
import { OperationsAlerts } from '../darkstore/OperationsAlerts';

const TABS = [
  { value: 'picker-approvals', label: 'Picker Approvals', icon: UserPlus },
  { value: 'picker-activity-logs', label: 'Picker Activity Logs', icon: History },
  { value: 'picker-config', label: 'Picker Config', icon: Sliders },
  { value: 'training-content', label: 'Training Content', icon: Video },
  { value: 'ops-alerts', label: 'Operations Alerts', icon: AlertTriangle },
] as const;

type PickerManagementTab = (typeof TABS)[number]['value'];

export function PickerManagement() {
  const [activeTab, setActiveTab] = useState<PickerManagementTab>('picker-approvals');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18181b]">Picker Management</h1>
        <p className="text-[#71717a] text-sm">
          Manage picker approvals, activity, configuration, training content, and operational alerts.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PickerManagementTab)} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                <Icon size={14} className="mr-1.5" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="picker-approvals">
          <PickerApprovals />
        </TabsContent>
        <TabsContent value="picker-activity-logs">
          <PickerActivityLogs />
        </TabsContent>
        <TabsContent value="picker-config">
          <PickerConfigManagement />
        </TabsContent>
        <TabsContent value="training-content">
          <TrainingContentManagement />
        </TabsContent>
        <TabsContent value="ops-alerts">
          <OperationsAlerts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
