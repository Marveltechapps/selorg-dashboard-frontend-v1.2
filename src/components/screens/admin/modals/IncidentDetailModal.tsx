import React, { useState, useEffect } from 'react';
import { AdminModal } from './AdminModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle,
  Phone,
  Mail,
  RefreshCw,
  CheckCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { Incident, fetchIncidentDetails, resolveIncident, updateIncident } from '../citywideControlApi';
import { toast } from 'sonner';

interface IncidentDetailModalProps {
  incidentId: string | null;
  open: boolean;
  onClose: () => void;
  onIncidentResolved?: () => void;
}

export function IncidentDetailModal({ 
  incidentId, 
  open, 
  onClose,
  onIncidentResolved 
}: IncidentDetailModalProps) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && incidentId) {
      loadIncidentDetails();
    }
  }, [open, incidentId]);

  const loadIncidentDetails = async () => {
    if (!incidentId) return;
    setLoading(true);
    try {
      const data = await fetchIncidentDetails(incidentId);
      setIncident(data);
    } catch (error) {
      console.error('Failed to load incident details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveIncident = async () => {
    if (!incident) return;
    setResolving(true);
    try {
      await resolveIncident(incident.id);
      toast.success('Incident marked as resolved');
      onIncidentResolved?.();
      onClose();
    } catch (error) {
      toast.error('Failed to resolve incident');
    } finally {
      setResolving(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  const handleSaveNotes = async () => {
    if (!incident || !notes.trim()) {
      toast.error('Enter notes before saving');
      return;
    }
    setSavingNotes(true);
    try {
      await updateIncident(incident.id, { actionsTaken: notes.trim() });
      toast.success('Notes saved');
      await loadIncidentDetails();
      onIncidentResolved?.();
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-rose-500';
      case 'warning': return 'bg-amber-500';
      default: return 'bg-emerald-500';
    }
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const diffMinutes = Math.floor((now - start) / 60000);
    if (diffMinutes < 60) return `${diffMinutes} mins`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={handleOpenChange}
      scrollBody={false}
      title={incident?.title ?? 'Incident details'}
      subtitle={incident ? `Incident ID: ${incident.id}` : 'Loading incident data…'}
      maxWidth="max-w-3xl"
    >
      {loading || !incident ? (
        <div className="flex min-h-[16rem] items-center justify-center px-6 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
        </div>
      ) : (
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
        <div className="flex items-center gap-2 mb-4">
          <Badge className={`${getSeverityColor(incident.severity)} text-white`}>
            {incident.severity.toUpperCase()}
          </Badge>
          <Badge variant={incident.status === 'resolved' ? 'default' : 'outline'}>
            {incident.status.toUpperCase()}
          </Badge>
        </div>

        <Tabs defaultValue="details">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="impact">Impact</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
              <h4 className="font-bold mb-3">Incident Information</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Type</div>
                    <div className="font-medium capitalize">{incident.type.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Severity</div>
                    <div className="font-medium capitalize">{incident.severity}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Start Time</div>
                    <div className="font-medium">
                      {new Date(incident.startTime).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Duration</div>
                    <div className="font-medium flex items-center gap-1">
                      <Clock size={14} />
                      {formatDuration(incident.startTime)}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">Description</div>
                  <div className="font-medium">{incident.description}</div>
                </div>

                {incident.status === 'resolved' && incident.resolvedAt && (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold">
                      <CheckCircle size={16} />
                      Resolved
                    </div>
                    <div className="text-sm text-emerald-700 mt-1">
                      {new Date(incident.resolvedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {incident.type === 'store_outage' && (
              <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
                <h4 className="font-bold mb-3">Store Information</h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Store</div>
                      <div className="font-medium">Store #102</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Location</div>
                      <div className="font-medium">Indiranagar</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Issue</div>
                    <div className="font-medium">Power Failure</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Root Cause</div>
                    <div className="font-medium">Main transformer failure</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Estimated Resolution</div>
                    <div className="font-medium">30 mins</div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="impact" className="space-y-4">
            <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
              <h4 className="font-bold mb-3">Impact Analysis</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-rose-50 p-3 rounded-lg">
                    <div className="text-sm text-rose-700">Active Orders Affected</div>
                    <div className="text-2xl font-bold text-rose-900">
                      {incident.affectedOrders || 0}
                    </div>
                  </div>
                  <div className="bg-rose-50 p-3 rounded-lg">
                    <div className="text-sm text-rose-700">Customers Impacted</div>
                    <div className="text-2xl font-bold text-rose-900">
                      {incident.affectedCustomers || 0}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-2">Impact Details</div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="font-medium">{incident.impact}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Customer Notifications Sent</span>
                    <Badge variant="default" className="bg-emerald-500">✓ Completed</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Rider Reassignments</span>
                    <Badge variant="outline">0 (Manual)</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Revenue Impact (Est.)</span>
                    <span className="font-bold">₹{((incident.affectedOrders || 0) * 1270).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
              <h4 className="font-bold mb-3">Response Timeline</h4>
              <div className="space-y-3">
                {incident.timeline && incident.timeline.length > 0 ? (
                  incident.timeline.map((event, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-1 bg-emerald-500 rounded"></div>
                      <div className="flex-1 pb-3">
                        <div className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                        <div className="font-medium mt-1">{event.event}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm">No timeline events recorded</div>
                )}
                
                {incident.status === 'ongoing' && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-1 bg-amber-500 rounded animate-pulse"></div>
                    <div className="flex-1">
                      <div className="text-xs text-amber-600">Ongoing</div>
                      <div className="font-medium mt-1 text-amber-700">Awaiting resolution...</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
              <h4 className="font-bold mb-3">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => toast.info('Store manager contact logged for follow-up')}
                >
                  <Phone size={16} className="mr-2" />
                  Call Store Manager
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => toast.success('Alert queued for affected customers')}
                >
                  <Mail size={16} className="mr-2" />
                  Send Alert
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => toast.info('Open Dispatch Ops to reassign orders manually')}
                >
                  <RefreshCw size={16} className="mr-2" />
                  Reassign Orders
                </Button>
                {incident.status === 'ongoing' && (
                  <Button 
                    className="justify-start bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleResolveIncident}
                    disabled={resolving}
                  >
                    <CheckCircle size={16} className="mr-2" />
                    {resolving ? 'Resolving...' : 'Mark Resolved'}
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-white border border-[#e4e4e7] p-4 rounded-lg">
              <h4 className="font-bold mb-3">Notes</h4>
              <Textarea 
                placeholder="Add notes about the incident resolution..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
              <Button
                type="button"
                className="mt-3"
                variant="outline"
                disabled={savingNotes}
                onClick={() => void handleSaveNotes()}
              >
                {savingNotes ? 'Saving…' : 'Save Notes'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      )}
    </AdminModal>
  );
}