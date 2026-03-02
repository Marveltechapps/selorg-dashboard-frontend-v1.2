import React from "react";
import { Rider } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Clock } from "lucide-react";
import { sendReminderToRider } from "./hrApi";
import { toast } from "sonner";

interface OnboardingStatusTabProps {
  riders: Rider[];
  loading: boolean;
  onRefresh?: () => void;
}

export function OnboardingStatusTab({ riders, loading, onRefresh }: OnboardingStatusTabProps) {
  const onboardingRiders = riders.filter(r => r.status === "onboarding");

  const handleRemind = async (riderId: string, riderName: string) => {
    try {
      const result = await sendReminderToRider(riderId);
      toast.success(result?.message ?? `Reminder sent to ${riderName}`);
      // Background refresh to sync with server (non-blocking)
      onRefresh?.().catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reminder");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Onboarding Pipeline</h3>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {onboardingRiders.length} in progress
        </Badge>
      </div>

      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-[#F5F7FA]">
            <TableRow>
              <TableHead>Rider Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Days Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow>
                 <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
               </TableRow>
            ) : onboardingRiders.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={5} className="text-center py-8 text-gray-500">No riders currently onboarding</TableCell>
               </TableRow>
            ) : (
              onboardingRiders.map((rider) => (
                <TableRow key={rider.id}>
                  <TableCell className="font-medium">{rider.name}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{rider.email}</TableCell>
                  <TableCell>
                    <Badge className={`
                      ${rider.onboardingStatus === 'invited' ? 'bg-gray-100 text-gray-800' : ''}
                      ${rider.onboardingStatus === 'docs_pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${rider.onboardingStatus === 'under_review' ? 'bg-blue-100 text-blue-800' : ''}
                      ${rider.onboardingStatus === 'approved' ? 'bg-green-100 text-green-800' : ''}
                    `}>
                      {rider.onboardingStatus.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {Math.floor(Math.random() * 10) + 1} days
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 gap-2" onClick={() => handleRemind(rider.id, rider.name)}>
                      <Mail size={14} /> Remind
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
