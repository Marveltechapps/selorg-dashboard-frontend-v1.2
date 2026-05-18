import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createLogisticsPlatformHttp } from '@/api/logisticsHttp';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface ProviderRow {
  _id: string;
  name: string;
  isActive: boolean;
  priority: number;
  apiBaseUrl?: string;
}

export function LogisticsProvidersAdmin() {
  const http = React.useMemo(() => createLogisticsPlatformHttp(), []);
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['logistics-admin-providers'],
    queryFn: async () => {
      const res = await http.get<{ data: ProviderRow[] }>('/admin/providers');
      return res.data.data;
    },
  });

  const patch = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: { isActive?: boolean; priority?: number } }) => {
      await http.patch(`/admin/providers/${id}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logistics-admin-providers'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18181b]">Logistics providers</h1>
        <p className="text-sm text-[#71717a]">Toggle providers and adjust failover priority (lower runs first).</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#e4e4e7] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f4f4f5] text-xs uppercase text-[#71717a]">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2">Priority</th>
              <th className="px-4 py-2">API base</th>
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((p) => (
              <tr key={p._id} className="border-t border-[#e4e4e7]">
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2">
                  <Switch
                    checked={p.isActive}
                    onCheckedChange={(v) => patch.mutate({ id: p._id, body: { isActive: v } })}
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span>{p.priority}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => patch.mutate({ id: p._id, body: { priority: Math.max(0, p.priority - 1) } })}
                    >
                      Up
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => patch.mutate({ id: p._id, body: { priority: p.priority + 1 } })}
                    >
                      Down
                    </Button>
                  </div>
                </td>
                <td className="px-4 py-2 text-xs text-[#52525b]">{p.apiBaseUrl ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
