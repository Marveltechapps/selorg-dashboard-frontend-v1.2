export type Granularity = 'hour' | 'day' | 'week';

export interface RiderPerformancePoint {
  timestamp: string;
  deliveriesCompleted: number;
  averageRating: number;
  attendancePercent: number;
  activeRiders: number;
}

export interface SlaAdherencePoint {
  timestamp: string;
  onTimePercent: number;
  slaBreaches: number;
  avgDelayMinutes: number;
  breachReasonBreakdown?: {
    traffic: number;
    no_show: number;
    address_issue: number;
    other: number;
  };
}

export interface FleetUtilizationPoint {
  timestamp: string;
  activeVehicles: number;
  idleVehicles: number;
  maintenanceVehicles: number;
  evUtilizationPercent: number;
  avgKmPerVehicle: number;
}

export interface ExceptionSummaryPoint {
  timestamp: string;
  alertCountByType: {
    sla_breach: number;
    rider_no_show: number;
    zone_deviation: number;
    breakdown: number;
  };
}

// Mock Data Generators

const generateDates = (count: number, granularity: Granularity): string[] => {
  const dates = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    if (granularity === 'hour') d.setHours(d.getHours() - i);
    else if (granularity === 'day') d.setDate(d.getDate() - i);
    else d.setDate(d.getDate() - i * 7);
    dates.push(d.toISOString());
  }
  return dates;
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

export const fetchRiderPerformance = async (granularity: Granularity = 'day'): Promise<RiderPerformancePoint[]> => {
  await new Promise(r => setTimeout(r, 600)); // Mock delay
  const count = granularity === 'hour' ? 24 : 30;
  const dates = generateDates(count, granularity);
  
  return dates.map(date => ({
    timestamp: date,
    deliveriesCompleted: randomInt(120, 300),
    averageRating: parseFloat(randomFloat(4.2, 4.9).toFixed(1)),
    attendancePercent: randomInt(85, 100),
    activeRiders: randomInt(40, 60)
  }));
};

export const fetchSlaAdherence = async (granularity: Granularity = 'day'): Promise<SlaAdherencePoint[]> => {
  await new Promise(r => setTimeout(r, 700));
  const count = granularity === 'hour' ? 24 : 30;
  const dates = generateDates(count, granularity);

  return dates.map(date => ({
    timestamp: date,
    onTimePercent: randomFloat(88, 98),
    slaBreaches: randomInt(2, 15),
    avgDelayMinutes: randomFloat(2, 8),
    breachReasonBreakdown: {
      traffic: randomInt(1, 10),
      no_show: randomInt(0, 3),
      address_issue: randomInt(0, 5),
      other: randomInt(0, 2)
    }
  }));
};

export const fetchFleetUtilization = async (granularity: Granularity = 'day'): Promise<FleetUtilizationPoint[]> => {
  await new Promise(r => setTimeout(r, 500));
  const count = granularity === 'hour' ? 24 : 30;
  const dates = generateDates(count, granularity);

  return dates.map(date => {
    const active = randomInt(50, 70);
    const maintenance = randomInt(2, 8);
    const idle = 85 - active - maintenance;
    return {
      timestamp: date,
      activeVehicles: active,
      idleVehicles: idle,
      maintenanceVehicles: maintenance,
      evUtilizationPercent: randomFloat(40, 75),
      avgKmPerVehicle: randomFloat(20, 45)
    };
  });
};

export const exportReport = async (payload: { metric: string, format: string, from: Date, to: Date }): Promise<string> => {
  await new Promise(r => setTimeout(r, 1500));
  return "https://example.com/report.pdf"; // Mock URL
};
