import React from "react";
import { Clock, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { HrDashboardSummary } from "./types";

interface HrSummaryCardsProps {
  summary: HrDashboardSummary | null;
  loading: boolean;
  onFilterPending: () => void;
  onShowExpired: () => void;
  onShowActive: () => void;
}

export function HrSummaryCards({
  summary,
  loading,
  onFilterPending,
  onShowExpired,
  onShowActive,
}: HrSummaryCardsProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow border-[#E0E0E0]"
        onClick={onFilterPending}
      >
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center mb-3">
            <Clock size={24} className="text-yellow-600" />
          </div>
          <h3 className="text-2xl font-bold text-[#212121]">
            {summary.pendingVerifications}
          </h3>
          <p className="text-[#757575] text-sm">Pending Verifications</p>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer hover:shadow-md transition-shadow border-[#E0E0E0]"
        onClick={onShowExpired}
      >
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
            <ShieldAlert size={24} className="text-red-600" />
          </div>
          <h3 className="text-2xl font-bold text-[#212121]">
            {summary.expiredDocuments}
          </h3>
          <p className="text-[#757575] text-sm">Expired Documents</p>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer hover:shadow-md transition-shadow border-[#E0E0E0]"
        onClick={onShowActive}
      >
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
            <CheckCircle2 size={24} className="text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-[#212121]">
            {summary.activeCompliantRiders}
          </h3>
          <p className="text-[#757575] text-sm">Active & Compliant</p>
        </CardContent>
      </Card>
    </div>
  );
}
