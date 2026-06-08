import React, { useMemo } from 'react';
import { Rider } from './types';
import { OpsDataTable, type OpsColumn } from '../../../shared/OpsDataTable';

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

  const columns: OpsColumn<Rider>[] = [
    {
      key: 'name',
      header: 'Rider',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#F97316]/10 text-[#F97316] flex items-center justify-center text-xs font-bold">
            {r.avatarInitials}
          </div>
          <span className="font-medium text-[#212121]">{r.name}</span>
        </div>
      ),
    },
    { key: 'id', header: 'Rider ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const s = statusLabel(r);
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
            {s.text}
          </span>
        );
      },
    },
    { key: 'hub', header: 'Hub', render: (r) => r.hubName || r.hubId || '—' },
    { key: 'shift', header: 'Shift', render: (r) => r.shiftLabel || '—' },
    { key: 'vehicle', header: 'Vehicle', render: (r) => r.vehicleType || '—' },
    { key: 'availability', header: 'Availability', render: (r) => availabilityLabel(r) },
  ];

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
      <OpsDataTable
        columns={columns}
        rows={sorted}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="No riders online for this hub"
      />
    </div>
  );
}
