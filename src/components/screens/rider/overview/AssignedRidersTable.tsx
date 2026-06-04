import React, { useMemo } from 'react';
import { Rider } from './types';
import { Skeleton } from '../../../../components/ui/skeleton';

function statusLabel(rider: Rider): { text: string; className: string } {
  const avail = rider.availability ?? rider.status;
  if (avail === 'available' || rider.status === 'online' || rider.status === 'idle') {
    return { text: 'Online', className: 'bg-green-100 text-green-800' };
  }
  if (avail === 'busy' || rider.status === 'busy') {
    return { text: 'Busy', className: 'bg-orange-100 text-orange-800' };
  }
  return { text: 'Offline', className: 'bg-gray-100 text-gray-600' };
}

function availabilityLabel(rider: Rider): string {
  if (rider.currentOrderId) return 'On delivery';
  const avail = rider.availability ?? rider.status;
  if (avail === 'available' || rider.status === 'online') return 'Available';
  if (avail === 'busy' || rider.status === 'busy') return 'Busy';
  return 'Unavailable';
}

const statusRank = (r: Rider) => {
  const s = statusLabel(r).text;
  if (s === 'Online') return 0;
  if (s === 'Busy') return 1;
  return 2;
};

interface AssignedRidersTableProps {
  riders: Rider[];
  loading?: boolean;
}

export function AssignedRidersTable({ riders, loading }: AssignedRidersTableProps) {
  const sorted = useMemo(
    () => [...riders].sort((a, b) => statusRank(a) - statusRank(b) || a.name.localeCompare(b.name)),
    [riders]
  );

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
        <div>
          <h3 className="font-bold text-[#212121]">Assigned Riders</h3>
          <p className="text-xs text-[#757575] mt-0.5">
            Live from Rider App — online riders appear when availability is updated
          </p>
        </div>
        <span className="text-xs font-medium text-[#757575] tabular-nums">
          {loading ? '…' : `${sorted.length} rider${sorted.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#FAFAFA] z-10">
            <tr className="text-left text-xs text-[#757575] uppercase tracking-wider border-b border-[#E0E0E0]">
              <th className="px-4 py-3 font-medium">Rider</th>
              <th className="px-4 py-3 font-medium">Rider ID</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Hub</th>
              <th className="px-4 py-3 font-medium">Shift</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Availability</th>
            </tr>
          </thead>
          <tbody>
            {loading && sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8">
                  <Skeleton className="h-8 w-full mb-2" />
                  <Skeleton className="h-8 w-full mb-2" />
                  <Skeleton className="h-8 w-full" />
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#757575]">
                  No riders in fleet list. Riders appear after login, onboarding, and going online in the Rider App.
                </td>
              </tr>
            ) : (
              sorted.map((rider) => {
                const st = statusLabel(rider);
                const hub = rider.hubName || rider.hubId || rider.cityName || '—';
                const shift = rider.shiftLabel || '—';
                const vehicle = rider.vehicleType
                  ? rider.vehicleType.charAt(0).toUpperCase() + rider.vehicleType.slice(1)
                  : '—';
                return (
                  <tr
                    key={rider.id}
                    className="border-b border-[#F0F0F0] hover:bg-[#FAFAFA]"
                  >
                    <td className="px-4 py-3 font-medium text-[#212121] whitespace-nowrap">
                      {rider.name}
                    </td>
                    <td className="px-4 py-3 text-[#616161] font-mono text-xs whitespace-nowrap">
                      {rider.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>
                        {st.text}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#616161] max-w-[140px] truncate" title={hub}>
                      {hub}
                    </td>
                    <td className="px-4 py-3 text-[#616161] whitespace-nowrap">{shift}</td>
                    <td className="px-4 py-3 text-[#616161] capitalize whitespace-nowrap">{vehicle}</td>
                    <td className="px-4 py-3 text-[#616161] whitespace-nowrap">
                      {availabilityLabel(rider)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
