import React, { useState, useEffect } from 'react';
import { TabletSmartphone, Plus, Search, MoreHorizontal, UserPlus, RotateCcw, AlertTriangle, FileText } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { EmptyState } from '../../ui/ux-components';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../../ui/dropdown-menu';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import {
  fetchPickerDevices,
  createPickerDevice,
  assignDevice,
  returnDevice,
  markDeviceDamaged,
  fetchPickerUsers,
  PickerDevice,
  PickerOption,
} from './warehouseApi';

export function WarehouseDevices() {
  const [devices, setDevices] = useState<PickerDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDamagedModal, setShowDamagedModal] = useState(false);
  const [showReturnDetailsModal, setShowReturnDetailsModal] = useState(false);

  const [selectedDevice, setSelectedDevice] = useState<PickerDevice | null>(null);
  const [pickers, setPickers] = useState<PickerOption[]>([]);
  const [assignPickerId, setAssignPickerId] = useState('');
  const [damagedCondition, setDamagedCondition] = useState('');

  const [newDevice, setNewDevice] = useState({ deviceId: '', serial: '' });

  useEffect(() => {
    loadDevices();
  }, [statusFilter, search]);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const filters: { status?: string; search?: string } = {};
      if (statusFilter && statusFilter !== 'all') filters.status = statusFilter;
      if (search.trim()) filters.search = search.trim();
      const data = await fetchPickerDevices(filters);
      setDevices(data ?? []);
    } catch (err) {
      toast.error('Failed to load devices');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPickers = async () => {
    try {
      const data = await fetchPickerUsers();
      setPickers(Array.isArray(data) ? data : []);
    } catch {
      setPickers([]);
    }
  };

  const handleCreate = async () => {
    if (!newDevice.deviceId.trim()) {
      toast.error('Device ID is required');
      return;
    }
    try {
      await createPickerDevice({ deviceId: newDevice.deviceId.trim(), serial: newDevice.serial.trim() || undefined });
      toast.success('Device created');
      setNewDevice({ deviceId: '', serial: '' });
      setShowAddModal(false);
      loadDevices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create device');
    }
  };

  const openAssignModal = (device: PickerDevice) => {
    setSelectedDevice(device);
    setAssignPickerId('');
    loadPickers();
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedDevice || !assignPickerId) {
      toast.error('Please select a picker');
      return;
    }
    try {
      await assignDevice(selectedDevice.id, assignPickerId);
      toast.success('Device assigned');
      setShowAssignModal(false);
      setSelectedDevice(null);
      loadDevices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign device');
    }
  };

  const handleReturn = async (device: PickerDevice) => {
    try {
      await returnDevice(device.id);
      toast.success('Device marked as returned');
      loadDevices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to return device');
    }
  };

  const openDamagedModal = (device: PickerDevice) => {
    setSelectedDevice(device);
    setDamagedCondition('');
    setShowDamagedModal(true);
  };

  const openReturnDetailsModal = (device: PickerDevice) => {
    setSelectedDevice(device);
    setShowReturnDetailsModal(true);
  };

  const handleMarkDamaged = async () => {
    if (!selectedDevice) return;
    try {
      await markDeviceDamaged(selectedDevice.id, damagedCondition.trim() || undefined);
      toast.success('Device marked as damaged');
      setShowDamagedModal(false);
      setSelectedDevice(null);
      setDamagedCondition('');
      loadDevices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark device damaged');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">AVAILABLE</Badge>;
      case 'ASSIGNED':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none">ASSIGNED</Badge>;
      case 'REPAIR':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">REPAIR</Badge>;
      case 'LOST':
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-none">LOST</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Picker Devices"
        subtitle="HHD device inventory for picker workforce assignment"
        actions={
          <Button onClick={() => setShowAddModal(true)} size="default">
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
        }
      />

      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Device ID or Serial"
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="AVAILABLE">AVAILABLE</SelectItem>
              <SelectItem value="ASSIGNED">ASSIGNED</SelectItem>
              <SelectItem value="REPAIR">REPAIR</SelectItem>
              <SelectItem value="LOST">LOST</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[140px]">Device ID</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Picker</TableHead>
                <TableHead>Assigned Date</TableHead>
                <TableHead>Last Returned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">Loading devices...</TableCell>
                </TableRow>
              ) : devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24">
                    <EmptyState title="No devices" message="Add a device to get started." />
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((device) => (
                  <TableRow key={device.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-muted-foreground">{device.deviceId}</TableCell>
                    <TableCell className="text-muted-foreground">{device.serial || '—'}</TableCell>
                    <TableCell>{getStatusBadge(device.status)}</TableCell>
                    <TableCell>
                      {device.assignedPicker ? (
                        <span className="text-sm font-medium">{device.assignedPicker.name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(device.assignedAt)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(device.lastReturnedAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {(device.lastReturnedAt && (device.condition || device.conditionNotes || device.conditionPhotoUrl)) && (
                            <DropdownMenuItem onClick={() => openReturnDetailsModal(device)}>
                              <FileText className="h-4 w-4 mr-2" />
                              View return details
                            </DropdownMenuItem>
                          )}
                          {device.status === 'AVAILABLE' && (
                            <DropdownMenuItem onClick={() => openAssignModal(device)}>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Assign Device
                            </DropdownMenuItem>
                          )}
                          {device.status === 'ASSIGNED' && (
                            <DropdownMenuItem onClick={() => handleReturn(device)}>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Mark Returned
                            </DropdownMenuItem>
                          )}
                          {device.status !== 'REPAIR' && device.status !== 'LOST' && (
                            <DropdownMenuItem onClick={() => openDamagedModal(device)}>
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Mark Damaged
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md border border-border">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold text-lg">Add New Device</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}><X className="h-5 w-5" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Device ID *</label>
                <Input
                  placeholder="e.g. HHD-001"
                  value={newDevice.deviceId}
                  onChange={(e) => setNewDevice({ ...newDevice, deviceId: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Serial (optional)</label>
                <Input
                  placeholder="Serial number"
                  value={newDevice.serial}
                  onChange={(e) => setNewDevice({ ...newDevice, serial: e.target.value })}
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Add Device</Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md border border-border">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold text-lg">Assign Device — {selectedDevice.deviceId}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAssignModal(false)}><X className="h-5 w-5" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Picker</label>
                <Select value={assignPickerId} onValueChange={setAssignPickerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose active picker" />
                  </SelectTrigger>
                  <SelectContent>
                    {pickers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name || p.phone || 'Unknown'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
              <Button onClick={handleAssign} disabled={!assignPickerId}>Assign</Button>
            </div>
          </div>
        </div>
      )}

      {/* Return Details Modal */}
      {showReturnDetailsModal && selectedDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md border border-border max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold text-lg">Return details — {selectedDevice.deviceId}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowReturnDetailsModal(false)}><X className="h-5 w-5" /></Button>
            </div>
            <div className="p-6 space-y-4">
              {selectedDevice.lastReturnedAt && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Last returned</label>
                  <p className="text-sm">{formatDate(selectedDevice.lastReturnedAt)}</p>
                </div>
              )}
              {selectedDevice.condition && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Condition</label>
                  <p className="text-sm capitalize">{selectedDevice.condition}</p>
                </div>
              )}
              {selectedDevice.conditionNotes && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Condition notes</label>
                  <p className="text-sm whitespace-pre-wrap">{selectedDevice.conditionNotes}</p>
                </div>
              )}
              {selectedDevice.conditionPhotoUrl && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Condition photo</label>
                  <img
                    src={selectedDevice.conditionPhotoUrl}
                    alt="Device condition at return"
                    className="rounded-lg border border-border w-full max-h-64 object-contain bg-muted"
                  />
                </div>
              )}
              {!selectedDevice.condition && !selectedDevice.conditionNotes && !selectedDevice.conditionPhotoUrl && (
                <p className="text-sm text-muted-foreground italic">No return condition details recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mark Damaged Modal */}
      {showDamagedModal && selectedDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md border border-border">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold text-lg">Mark Damaged — {selectedDevice.deviceId}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowDamagedModal(false)}><X className="h-5 w-5" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Condition notes (optional)</label>
                <Input
                  placeholder="e.g. Screen cracked, battery faulty"
                  value={damagedCondition}
                  onChange={(e) => setDamagedCondition(e.target.value)}
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowDamagedModal(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleMarkDamaged}>Mark Damaged</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
