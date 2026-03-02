import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  fetchApplications,
  toggleApplication,
  testApplicationConnection,
  Application,
} from './applicationsApi';
import { toast } from 'sonner';
import {
  RefreshCw,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Smartphone,
  Loader2,
} from 'lucide-react';

function getHealthBadge(health: string) {
  const map: Record<string, { color: string; label: string }> = {
    healthy: { color: 'bg-emerald-500/10 text-emerald-600', label: 'Healthy' },
    degraded: { color: 'bg-amber-500/10 text-amber-600', label: 'Degraded' },
    down: { color: 'bg-rose-500/10 text-rose-600', label: 'Down' },
    unknown: { color: 'bg-gray-500/10 text-gray-600', label: 'Unknown' },
  };
  const config = map[health] ?? map.unknown;
  return <Badge variant="secondary" className={config.color}>{config.label}</Badge>;
}

function getStatusBadge(status: string) {
  const map: Record<string, { icon: typeof CheckCircle; color: string }> = {
    active: { icon: CheckCircle, color: 'bg-emerald-500' },
    inactive: { icon: XCircle, color: 'bg-gray-400' },
    maintenance: { icon: AlertTriangle, color: 'bg-amber-500' },
  };
  const config = map[status] ?? map.inactive;
  const Icon = config.icon;
  return (
    <Badge className={config.color}>
      <Icon size={12} className="mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function ApplicationsManagement() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchApplications();
      setApplications(data ?? []);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load applications';
      setLoadError(msg);
      toast.error(msg);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (app: Application) => {
    setTogglingId(app.id);
    try {
      const newStatus = app.status === 'active' ? 'inactive' : 'active';
      await toggleApplication(app.id, newStatus);
      toast.success(`${app.name} ${newStatus === 'active' ? 'enabled' : 'disabled'}`);
      await loadData();
    } catch (error: unknown) {
      toast.error('Failed to update application status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleTestConnection = async (app: Application) => {
    setTestingId(app.id);
    try {
      const result = await testApplicationConnection(app.id);
      if (result.health === 'healthy') {
        toast.success(`${app.name}: ${result.message}`);
      } else {
        toast.error(`${app.name}: ${result.message}`);
      }
      await loadData();
    } catch (error: unknown) {
      toast.error('Connection test failed');
    } finally {
      setTestingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-[#71717a]" size={32} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6 w-full">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Applications Management</h1>
          <p className="text-[#71717a] text-sm">Manage platform apps (HHD, Picker, etc.)</p>
        </div>
        <div className="flex flex-col items-center justify-center h-64 bg-[#fafafa] border border-[#e4e4e7] rounded-xl">
          <XCircle className="text-rose-500 mb-3" size={48} />
          <p className="text-[#52525b] font-medium">Failed to load applications</p>
          <p className="text-sm text-[#71717a] mt-1">{loadError}</p>
          <Button className="mt-4" onClick={loadData}>
            <RefreshCw size={14} className="mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Applications Management</h1>
          <p className="text-[#71717a] text-sm">
            Manage platform apps. HHD-app (selorg-scanner) can be monitored and enabled/disabled here.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadData}>
          <RefreshCw size={14} className="mr-1.5" /> Refresh
        </Button>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Application</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Last Sync</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-[#71717a]">
                  No applications registered. Run <code className="text-xs bg-[#f4f4f5] px-2 py-1 rounded">npm run seed:applications</code> in the backend.
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Smartphone className="text-[#71717a]" size={18} />
                      <span className="font-medium">{app.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{app.type.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell>{getHealthBadge(app.health)}</TableCell>
                  <TableCell className="text-sm text-[#71717a]">
                    {app.lastSync ? new Date(app.lastSync).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Switch
                        checked={app.status === 'active'}
                        onCheckedChange={() => handleToggle(app)}
                        disabled={!!togglingId}
                      />
                      <span className="text-xs text-[#71717a] mr-2">
                        {app.status === 'active' ? 'On' : 'Off'}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestConnection(app)}
                        disabled={!!testingId}
                      >
                        {testingId === app.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <>
                            <TestTube size={14} className="mr-1" />
                            Test
                          </>
                        )}
                      </Button>
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
