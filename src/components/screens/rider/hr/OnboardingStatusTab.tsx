import React from "react";
import { Rider } from "./types";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock } from "lucide-react";

interface OnboardingStatusTabProps {
  riders: Rider[];
  loading: boolean;
}

export function OnboardingStatusTab({ riders, loading }: OnboardingStatusTabProps) {
  const onboardingRiders = riders.filter(r => r.status === "onboarding");

  const formatDaysActive = (rider: Rider): string => {
    const n = rider.onboardingDaysActive;
    if (typeof n === "number") {
      return `${n} ${n === 1 ? "day" : "days"}`;
    }
    return "—";
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow>
                 <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
               </TableRow>
            ) : onboardingRiders.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={4} className="text-center py-8 text-gray-500">No riders currently onboarding</TableCell>
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
                      {formatDaysActive(rider)}
                    </div>
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
