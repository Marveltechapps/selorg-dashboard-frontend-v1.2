import React from "react";
import { FleetSummary } from "./fleetApi";
import { Bike, Wrench, Zap, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface FleetSummaryCardsProps {
  summary: FleetSummary | null;
  loading: boolean;
  onFilterClick: (filterType: "all" | "maintenance" | "ev" | "scheduled") => void;
}

export function FleetSummaryCards({ summary, loading, onFilterClick }: FleetSummaryCardsProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Fleet",
      value: summary.totalFleet,
      subtext: "vehicles",
      icon: Bike,
      color: "bg-blue-50 text-blue-600",
      filter: "all" as const,
    },
    {
      label: "Maintenance",
      value: summary.inMaintenance,
      subtext: "in service",
      icon: Wrench,
      color: "bg-red-50 text-red-600",
      filter: "maintenance" as const,
    },
    {
      label: "EV Usage",
      value: `${summary.evUsagePercent}%`,
      subtext: "of fleet",
      icon: Zap,
      color: "bg-green-50 text-green-600",
      filter: "ev" as const,
    },
    {
      label: "Scheduled",
      value: summary.scheduledServicesNextWeek,
      subtext: "next week",
      icon: CalendarClock,
      color: "bg-orange-50 text-orange-600",
      filter: "scheduled" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card 
          key={card.label} 
          className="cursor-pointer hover:shadow-md transition-shadow border-none shadow-sm"
          onClick={() => onFilterClick(card.filter)}
        >
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{card.value}</h3>
              <p className="text-xs text-gray-400 mt-1">{card.subtext}</p>
            </div>
            <div className={`p-3 rounded-full ${card.color}`}>
              <card.icon size={24} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
