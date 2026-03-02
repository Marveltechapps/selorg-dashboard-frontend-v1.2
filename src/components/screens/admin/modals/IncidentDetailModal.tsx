import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  Clock
} from 'lucide-react';
import { Incident, fetchIncidentDetails, resolveIncident } from '../citywideControlApi';
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

  if (!incident) {
    return null;
  }

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{incident.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`${getSeverityColor(incident.severity)} text-white`}>
                  {incident.severity.toUpperCase()}
                </Badge>
                <Badge variant={incident.status === 'resolved' ? 'default' : 'outline'}>
                  {incident.status.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#71717a]">Incident ID</div>
              <div className="font-bold">{incident.id}</div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
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
                    <div className="text-sm text-[#71717a]">Type</div>
                    <div className="font-medium capitalize">{incident.type.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-[#71717a]">Severity</div>
                    <div className="font-medium capitalize">{incident.severity}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-[#71717a]">Start Time</div>
                    <div className="font-medium">
                      {new Date(incident.startTime).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[#71717a]">Duration</div>
                    <div className="font-medium flex items-center gap-1">
                      <Clock size={14} />
                      {formatDuration(incident.startTime)}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-[#71717a]">Description</div>
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
                      <div className="text-sm text-[#71717a]">Store</div>
                      <div className="font-medium">Store #102</div>
                    </div>
                    <div>
                      <div className="text-sm text-[#71717a]">Location</div>
                      <div className="font-medium">Indiranagar</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[#71717a]">Issue</div>
                    <div className="font-medium">Power Failure</div>
                  </div>
                  <div>
                    <div className="text-sm text-[#71717a]">Root Cause</div>
                    <div className="font-medium">Main transformer failure</div>
                  </div>
                  <div>
                    <div className="text-sm text-[#71717a]">Estimated Resolution</div>
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
                  <div className="text-sm text-[#71717a] mb-2">Impact Details</div>
                  <div className="bg-[#f4f4f5] p-3 rounded-lg">
                    <div className="font-medium">{incident.impact}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#71717a]">Customer Notifications Sent</span>
                    <Badge variant="default" className="bg-emerald-500">✓ Completed</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#71717a]">Rider Reassignments</span>
                    <Badge variant="outline">0 (Manual)</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#71717a]">Revenue Impact (Est.)</span>
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
                        <div className="text-xs text-[#71717a]">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                        <div className="font-medium mt-1">{event.event}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[#71717a] text-sm">No timeline events recorded</div>
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
                <Button variant="outline" className="justify-start">
                  <Phone size={16} className="mr-2" />
                  Call Store Manager
                </Button>
                <Button variant="outline" className="justify-start">
                  <Mail size={16} className="mr-2" />
                  Send Alert
                </Button>
                <Button variant="outline" className="justify-start">
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
              <Button className="mt-3" variant="outline">
                Save Notes
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}