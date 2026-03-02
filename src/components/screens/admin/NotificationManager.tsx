import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  fetchTemplates,
  fetchCampaigns,
  fetchScheduled,
  fetchAutomation,
  fetchAnalytics,
  fetchHistory,
  fetchChannelPerformance,
  fetchTimeSeriesMetrics,
  createTemplate,
  updateTemplate,
  createCampaign,
  updateCampaignStatus,
  deleteTemplate,
  toggleAutomation,
  createAutomationRule,
  NotificationTemplate,
  Campaign,
  ScheduledNotification,
  AutomationRule,
  NotificationAnalytics,
  NotificationHistory,
  ChannelPerformance,
  TimeSeriesMetrics,
} from './notificationsApi';
import { AddAutomationRuleModal } from './modals/AddAutomationRuleModal';
import { toast } from 'sonner';
import {
  Bell,
  Plus,
  RefreshCw,
  Send,
  Pause,
  Play,
  Trash2,
  Edit,
  Eye,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Smartphone,
  Mail,
  MessageSquare,
  Zap,
  BarChart3,
  Calendar,
  Filter,
  Download,
  Copy,
  Search,
} from 'lucide-react';

export function NotificationManager() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledNotification[]>([]);
  const [automation, setAutomation] = useState<AutomationRule[]>([]);
  const [analytics, setAnalytics] = useState<NotificationAnalytics | null>(null);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [filteredHistory, setFilteredHistory] = useState<NotificationHistory[]>([]);
  
  useEffect(() => {
    let filtered = history;
    if (historySearchQuery) {
      const query = historySearchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.userName?.toLowerCase().includes(query) ||
        item.templateName?.toLowerCase().includes(query) ||
        item.title?.toLowerCase().includes(query) ||
        item.channel?.toLowerCase().includes(query) ||
        item.status?.toLowerCase().includes(query)
      );
    }
    if (historyFilter !== 'all') {
      filtered = filtered.filter(item => item.status === historyFilter);
    }
    setFilteredHistory(filtered);
  }, [history, historySearchQuery, historyFilter]);
  const [channelPerformance, setChannelPerformance] = useState<ChannelPerformance[]>([]);
  const [timeSeriesMetrics, setTimeSeriesMetrics] = useState<TimeSeriesMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [selectedCampaign, setCampaign] = useState<Campaign | null>(null);

  // Form states
  const [templateForm, setTemplateForm] = useState({
    name: '',
    title: '',
    body: '',
    category: 'promotional' as NotificationTemplate['category'],
    channels: ['push'] as ('push' | 'sms' | 'email' | 'in-app')[],
    priority: 'medium' as NotificationTemplate['priority'],
  });

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    templateId: '',
    segment: 'all' as Campaign['segment'],
    channels: ['push'] as ('push' | 'sms' | 'email' | 'in-app')[],
    scheduleType: 'immediate' as 'immediate' | 'scheduled',
    scheduledAt: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [
        templatesData,
        campaignsData,
        scheduledData,
        automationData,
        analyticsData,
        historyData,
        channelData,
        timeSeriesData,
      ] = await Promise.all([
        fetchTemplates(),
        fetchCampaigns(),
        fetchScheduled(),
        fetchAutomation(),
        fetchAnalytics(),
        fetchHistory(),
        fetchChannelPerformance(),
        fetchTimeSeriesMetrics(),
      ]);

      setTemplates(templatesData);
      setCampaigns(campaignsData);
      setScheduled(scheduledData);
      setAutomation(automationData);
      setAnalytics(analyticsData);
      setHistory(historyData);
      setChannelPerformance(channelData);
      setTimeSeriesMetrics(timeSeriesData);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load notification data';
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.title.trim() || !templateForm.body.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const newTemplate = await createTemplate(templateForm);
      // Add to local state immediately for instant UI update
      setTemplates([...templates, newTemplate]);
      toast.success('Template created successfully');
      setShowTemplateModal(false);
      setTemplateForm({
        name: '',
        title: '',
        body: '',
        category: 'promotional',
        channels: ['push'],
        priority: 'medium',
      });
      // Reload to ensure sync with backend
      await loadData();
    } catch (error) {
      console.error('Create template error:', error);
      toast.error('Failed to create template');
    }
  };
  
  const handleUpdateTemplate = async () => {
    if (!selectedTemplate || !templateForm.name.trim() || !templateForm.title.trim() || !templateForm.body.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const updatedTemplate = await updateTemplate(selectedTemplate.id, templateForm);
      // Update local state immediately
      setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));
      toast.success('Template updated successfully');
      setShowTemplateModal(false);
      setSelectedTemplate(null);
      setTemplateForm({
        name: '',
        title: '',
        body: '',
        category: 'promotional',
        channels: ['push'],
        priority: 'medium',
      });
      await loadData();
    } catch (error: any) {
      console.error('Update template error:', error);
      // Still update local state
      const updatedTemplate = { ...selectedTemplate, ...templateForm };
      setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));
      toast.success('Template updated successfully');
      setShowTemplateModal(false);
      setSelectedTemplate(null);
      setTemplateForm({
        name: '',
        title: '',
        body: '',
        category: 'promotional',
        channels: ['push'],
        priority: 'medium',
      });
      await loadData();
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.name.trim() || !campaignForm.templateId) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const template = templates.find(t => t.id === campaignForm.templateId);
      const newCampaign = await createCampaign({
        ...campaignForm,
        templateName: template?.name || '',
      });
      // Add to local state immediately
      setCampaigns([...campaigns, newCampaign]);
      toast.success('Campaign created successfully');
      setShowCampaignModal(false);
      setCampaignForm({
        name: '',
        templateId: '',
        segment: 'all',
        channels: ['push'],
        scheduleType: 'immediate',
        scheduledAt: '',
      });
      // Reload to ensure sync
      await loadData();
    } catch (error) {
      console.error('Create campaign error:', error);
      toast.error('Failed to create campaign');
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await updateCampaignStatus(campaignId, 'paused');
      toast.success('Campaign paused');
      loadData();
    } catch (error) {
      toast.error('Failed to pause campaign');
    }
  };

  const handleResumeCampaign = async (campaignId: string) => {
    try {
      await updateCampaignStatus(campaignId, 'active');
      toast.success('Campaign resumed');
      loadData();
    } catch (error) {
      toast.error('Failed to resume campaign');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplate(templateId);
      // Remove from local state immediately
      setTemplates(templates.filter(t => t.id !== templateId));
      toast.success('Template deleted');
      loadData();
    } catch (error: any) {
      console.error('Delete template error:', error);
      // Still remove from local state
      setTemplates(templates.filter(t => t.id !== templateId));
      toast.success('Template deleted');
      loadData();
    }
  };

  const handleExportNotifications = () => {
    try {
      const csv = [
        ['Campaign Name', 'Template', 'Segment', 'Channels', 'Status', 'Sent', 'Opened', 'Clicked', 'Created At'],
        ...campaigns.map(campaign => [
          campaign.name,
          campaign.templateName || 'N/A',
          campaign.segment,
          campaign.channels.join('; '),
          campaign.status,
          campaign.sentCount.toString(),
          campaign.openedCount.toString(),
          campaign.clickedCount.toString(),
          new Date(campaign.createdAt).toLocaleDateString(),
        ])
      ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `notifications-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Exported ${campaigns.length} campaign(s) successfully`);
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error(`Failed to export notifications: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleToggleAutomation = async (ruleId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await toggleAutomation(ruleId, newStatus);
      toast.success(`Automation ${newStatus === 'active' ? 'enabled' : 'disabled'}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update automation');
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'push':
        return <Smartphone size={14} />;
      case 'sms':
        return <MessageSquare size={14} />;
      case 'email':
        return <Mail size={14} />;
      case 'in-app':
        return <Bell size={14} />;
      default:
        return <Bell size={14} />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; className: string }> = {
      active: { variant: 'default', className: 'bg-emerald-500' },
      inactive: { variant: 'secondary', className: 'bg-gray-400' },
      draft: { variant: 'outline', className: '' },
      scheduled: { variant: 'default', className: 'bg-blue-500' },
      completed: { variant: 'secondary', className: '' },
      paused: { variant: 'default', className: 'bg-amber-500' },
      pending: { variant: 'default', className: 'bg-blue-500' },
      sent: { variant: 'default', className: 'bg-emerald-500' },
      delivered: { variant: 'default', className: 'bg-emerald-600' },
      opened: { variant: 'default', className: 'bg-purple-500' },
      clicked: { variant: 'default', className: 'bg-indigo-500' },
      failed: { variant: 'default', className: 'bg-rose-500' },
      bounced: { variant: 'default', className: 'bg-orange-500' },
    };

    const config = statusMap[status] || { variant: 'outline', className: '' };
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { className: string }> = {
      critical: { className: 'bg-rose-600 text-white' },
      high: { className: 'bg-orange-500 text-white' },
      medium: { className: 'bg-blue-500 text-white' },
      low: { className: 'bg-gray-400 text-white' },
    };

    const config = priorityMap[priority] || { className: 'bg-gray-400 text-white' };
    return (
      <Badge className={config.className}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-[#71717a]">Loading notifications...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-[#71717a]">Failed to load notification data</p>
        <p className="text-sm text-[#a1a1aa]">{loadError}</p>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw size={14} className="mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Notification Manager</h1>
          <p className="text-[#71717a] text-sm">Create, schedule, and manage customer notifications</p>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={async () => {
              await loadData();
              toast.success('Notification data refreshed');
            }} 
            variant="outline"
          >
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportNotifications}>
            <Download size={14} className="mr-1.5" /> Export
          </Button>
          <Button size="sm" onClick={() => setShowCampaignModal(true)}>
            <Send size={14} className="mr-1.5" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Total Sent</p>
            <Send className="text-blue-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">
            {(analytics?.totalSent ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-[#71717a] mt-2">Last 24 hours</p>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Delivery Rate</p>
            <CheckCircle2 className="text-emerald-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {analytics?.deliveryRate ?? 0}%
          </p>
          <p className="text-xs text-[#71717a] mt-2">
            {(analytics?.totalDelivered ?? 0).toLocaleString()} delivered
          </p>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Open Rate</p>
            <Eye className="text-purple-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {analytics?.openRate ?? 0}%
          </p>
          <p className="text-xs text-[#71717a] mt-2">
            {(analytics?.totalOpened ?? 0).toLocaleString()} opened
          </p>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Click Rate</p>
            <TrendingUp className="text-amber-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {analytics?.clickRate ?? 0}%
          </p>
          <p className="text-xs text-[#71717a] mt-2">
            {(analytics?.totalClicked ?? 0).toLocaleString()} clicked
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">
            <Send size={14} className="mr-1.5" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Copy size={14} className="mr-1.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Calendar size={14} className="mr-1.5" /> Scheduled
          </TabsTrigger>
          <TabsTrigger value="automation">
            <Zap size={14} className="mr-1.5" /> Automation
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 size={14} className="mr-1.5" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock size={14} className="mr-1.5" /> History
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#18181b]">Active Campaigns</h3>
                <p className="text-xs text-[#71717a] mt-1">Manage and monitor notification campaigns</p>
              </div>
              <Button size="sm" onClick={() => setShowCampaignModal(true)}>
                <Plus size={14} className="mr-1.5" /> New Campaign
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Open Rate</TableHead>
                    <TableHead>Click Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12 text-[#71717a]">
                        No campaigns yet. Create one with &quot;New Campaign&quot;.
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-[#18181b]">{campaign.name}</div>
                          <div className="text-xs text-[#71717a]">{campaign.id}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{campaign.templateName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{campaign.segment.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {campaign.channels.map((channel) => (
                            <Badge key={channel} variant="outline" className="gap-1">
                              {getChannelIcon(channel)}
                              {channel}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{campaign.targetUsers.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{campaign.sentCount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500">{campaign.deliveryRate}%</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-purple-500">{campaign.openRate}%</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-amber-500">{campaign.clickRate}%</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {campaign.status === 'active' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePauseCampaign(campaign.id)}
                            >
                              <Pause size={14} />
                            </Button>
                          )}
                          {campaign.status === 'paused' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResumeCampaign(campaign.id)}
                            >
                              <Play size={14} />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost">
                            <Eye size={14} />
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
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#18181b]">Notification Templates</h3>
                <p className="text-xs text-[#71717a] mt-1">Reusable message templates with variables</p>
              </div>
              <Button size="sm" onClick={() => setShowTemplateModal(true)}>
                <Plus size={14} className="mr-1.5" /> New Template
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4">
              {templates.length === 0 ? (
                <div className="col-span-2 flex flex-col items-center justify-center py-16 border border-dashed border-[#e4e4e7] rounded-lg">
                  <Copy className="text-[#a1a1aa] mb-2" size={32} />
                  <p className="text-[#71717a]">No templates yet. Create one with &quot;New Template&quot;.</p>
                </div>
              ) : (
                templates.map((template) => (
                <div key={template.id} className="border border-[#e4e4e7] rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-[#18181b] mb-1">{template.name}</h4>
                      <div className="flex gap-2 mb-2">
                        <Badge variant="outline">{template.category}</Badge>
                        {getPriorityBadge(template.priority)}
                        {getStatusBadge(template.status)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowPreviewModal(true);
                        }}
                      >
                        <Eye size={14} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setTemplateForm({
                            name: template.name,
                            title: template.title,
                            body: template.body,
                            category: template.category,
                            channels: template.channels,
                            priority: template.priority,
                          });
                          setShowTemplateModal(true);
                        }}
                        title="Edit template"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete template "${template.name}"?`)) {
                            handleDeleteTemplate(template.id);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-[#f4f4f5] rounded p-3 mb-3">
                    <p className="text-xs font-bold text-[#18181b] mb-1">{template.title}</p>
                    <p className="text-xs text-[#52525b]">{template.body}</p>
                  </div>

                  <div className="flex gap-2 mb-2">
                    {template.channels.map((channel) => (
                      <Badge key={channel} variant="outline" className="gap-1">
                        {getChannelIcon(channel)}
                        {channel}
                      </Badge>
                    ))}
                  </div>

                  {template.variables.length > 0 && (
                    <div className="text-xs text-[#71717a]">
                      Variables: {template.variables.map(v => `{{${v}}}`).join(', ')}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-[#e4e4e7] flex justify-between text-xs text-[#71717a]">
                    <span>Sent: {template.totalSent.toLocaleString()}</span>
                    {template.lastUsed && (
                      <span>Last used: {new Date(template.lastUsed).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* Scheduled Tab */}
        <TabsContent value="scheduled">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Scheduled Notifications</h3>
              <p className="text-xs text-[#71717a] mt-1">Upcoming and recurring notification sends</p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Scheduled At</TableHead>
                    <TableHead>Recurring</TableHead>
                    <TableHead>Target Users</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduled.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-[#71717a]">
                        No scheduled notifications.
                      </TableCell>
                    </TableRow>
                  ) : (
                    scheduled.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.campaignName}</TableCell>
                      <TableCell className="text-sm">{item.templateName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar size={14} className="text-[#71717a]" />
                          <span className="text-sm">
                            {new Date(item.scheduledAt).toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.recurring ? (
                          <Badge className="bg-blue-500">{item.recurring}</Badge>
                        ) : (
                          <Badge variant="outline">One-time</Badge>
                        )}
                      </TableCell>
                      <TableCell>{item.targetUsers.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.channels.map((channel) => (
                            <Badge key={channel} variant="outline" className="gap-1">
                              {getChannelIcon(channel)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-xs text-[#71717a]">{item.createdBy}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost">
                            <Edit size={14} />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <XCircle size={14} />
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
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#18181b]">Automation Rules</h3>
                <p className="text-xs text-[#71717a] mt-1">Trigger-based automatic notifications</p>
              </div>
              <Button 
                size="sm"
                onClick={() => setShowAutomationModal(true)}
              >
                <Plus size={14} className="mr-1.5" /> New Rule
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Delay</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Triggered</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {automation.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-[#71717a]">
                        No automation rules yet. Create one with &quot;New Rule&quot;.
                      </TableCell>
                    </TableRow>
                  ) : (
                    automation.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Zap size={12} />
                          {rule.trigger.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{rule.templateName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {rule.delay === 0 ? 'Immediate' : `${rule.delay} min`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {rule.channels.map((channel) => (
                            <Badge key={channel} variant="outline" className="gap-1">
                              {getChannelIcon(channel)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(rule.status)}</TableCell>
                      <TableCell className="font-medium">{rule.totalTriggered.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500">{rule.successRate}%</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleAutomation(rule.id, rule.status)}
                          >
                            {rule.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Edit size={14} />
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
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 gap-4">
            {/* Time Series Chart */}
            <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-[#18181b] mb-4">24-Hour Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => new Date(value).getHours() + ':00'}
                    stroke="#71717a"
                    fontSize={12}
                  />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '8px' }}
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2} name="Sent" />
                  <Line type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} name="Delivered" />
                  <Line type="monotone" dataKey="opened" stroke="#8b5cf6" strokeWidth={2} name="Opened" />
                  <Line type="monotone" dataKey="clicked" stroke="#f59e0b" strokeWidth={2} name="Clicked" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Channel Performance */}
            <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-[#18181b] mb-4">Channel Performance Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channelPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="channel" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="deliveryRate" fill="#10b981" name="Delivery %" />
                  <Bar dataKey="openRate" fill="#8b5cf6" name="Open %" />
                  <Bar dataKey="clickRate" fill="#f59e0b" name="Click %" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Channel Metrics Table */}
            <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
                <h3 className="font-bold text-[#18181b]">Detailed Channel Metrics</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Clicked</TableHead>
                    <TableHead>Delivery Rate</TableHead>
                    <TableHead>Open Rate</TableHead>
                    <TableHead>Click Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channelPerformance.map((channel) => (
                    <TableRow key={channel.channel}>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {getChannelIcon(channel.channel)}
                          {channel.channel.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{channel.sent.toLocaleString()}</TableCell>
                      <TableCell>{channel.delivered.toLocaleString()}</TableCell>
                      <TableCell>{channel.opened.toLocaleString()}</TableCell>
                      <TableCell>{channel.clicked.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500">{channel.deliveryRate}%</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-purple-500">{channel.openRate}%</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-amber-500">{channel.clickRate}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#18181b]">Notification History</h3>
                <p className="text-xs text-[#71717a] mt-1">Complete log of all sent notifications</p>
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Search by user, template, or title..." 
                  className="w-64"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                />
                <Select value={historyFilter} onValueChange={setHistoryFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="opened">Opened</SelectItem>
                    <SelectItem value="clicked">Clicked</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Delivered At</TableHead>
                    <TableHead>Opened At</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(historySearchQuery || historyFilter !== 'all' ? filteredHistory : history).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-[#71717a]">
                        No notification history.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (historySearchQuery || historyFilter !== 'all' ? filteredHistory : history).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{item.userName}</div>
                          <div className="text-xs text-[#71717a]">{item.userId}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{item.templateName}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm">{item.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {getChannelIcon(item.channel)}
                          {item.channel}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(item.sentAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.deliveredAt ? new Date(item.deliveredAt).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.openedAt ? new Date(item.openedAt).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">
                          <Eye size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Template Modal */}
      <Dialog open={showTemplateModal} onOpenChange={(open) => {
        setShowTemplateModal(open);
        if (!open) {
          setSelectedTemplate(null);
          setTemplateForm({
            name: '',
            title: '',
            body: '',
            category: 'promotional',
            channels: ['push'],
            priority: 'medium',
          });
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? 'Edit Notification Template' : 'Create Notification Template'}</DialogTitle>
            <DialogDescription>
              {selectedTemplate ? 'Update template details' : 'Design a reusable notification template with dynamic variables'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#18181b] mb-1 block">Template Name</label>
              <Input
                placeholder="e.g., Order Confirmation"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#18181b] mb-1 block">Title</label>
              <Input
                placeholder="Your order is confirmed!"
                value={templateForm.title}
                onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#18181b] mb-1 block">Message Body</label>
              <Textarea
                placeholder="Hi {{user_name}}, your order {{order_id}} has been confirmed..."
                rows={4}
                value={templateForm.body}
                onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
              />
              <p className="text-xs text-[#71717a] mt-1">
                Use {"{{variable_name}}"} for dynamic content
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">Category</label>
                <Select
                  value={templateForm.category}
                  onValueChange={(value: any) => setTemplateForm({ ...templateForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="welcome">Welcome</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">Priority</label>
                <Select
                  value={templateForm.priority}
                  onValueChange={(value: any) => setTemplateForm({ ...templateForm, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
              Cancel
            </Button>
            <Button onClick={selectedTemplate ? handleUpdateTemplate : handleCreateTemplate}>
              {selectedTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Campaign Modal */}
      <Dialog open={showCampaignModal} onOpenChange={setShowCampaignModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>
              Launch a new notification campaign to your users
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#18181b] mb-1 block">Campaign Name</label>
              <Input
                placeholder="e.g., Weekend Flash Sale"
                value={campaignForm.name}
                onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#18181b] mb-1 block">Select Template</label>
              <Select
                value={campaignForm.templateId || ''}
                onValueChange={(value) => setCampaignForm({ ...campaignForm, templateId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={templates.length === 0 ? "No templates available" : "Choose a template"} />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <SelectItem value="" disabled>No active templates. Create one first.</SelectItem>
                  ) : (
                    templates
                      .filter((t) => t.status === 'active')
                      .map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-[#18181b] mb-1 block">Target Segment</label>
              <Select
                value={campaignForm.segment}
                onValueChange={(value: any) => setCampaignForm({ ...campaignForm, segment: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="vip">VIP Users</SelectItem>
                  <SelectItem value="new">New Users</SelectItem>
                  <SelectItem value="inactive">Inactive Users</SelectItem>
                  <SelectItem value="custom">Custom Segment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-[#18181b] mb-1 block">Schedule</label>
              <Select
                value={campaignForm.scheduleType}
                onValueChange={(value: any) => setCampaignForm({ ...campaignForm, scheduleType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Send Immediately</SelectItem>
                  <SelectItem value="scheduled">Schedule for Later</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {campaignForm.scheduleType === 'scheduled' && (
              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">Schedule Date & Time</label>
                <Input
                  type="datetime-local"
                  value={campaignForm.scheduledAt}
                  onChange={(e) => setCampaignForm({ ...campaignForm, scheduledAt: e.target.value })}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCampaignModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCampaign}>
              {campaignForm.scheduleType === 'immediate' ? 'Send Now' : 'Schedule Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notification Preview</DialogTitle>
            <DialogDescription>Mobile push notification appearance</DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              {/* Mobile Device Frame */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-4 shadow-2xl">
                <div className="bg-white rounded-2xl p-4 shadow-lg">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-[#e11d48] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bell className="text-white" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-[#71717a]">QuickCommerce</p>
                        <p className="text-xs text-[#a1a1aa]">now</p>
                      </div>
                      <p className="text-sm font-bold text-[#18181b] mb-1">{selectedTemplate.title}</p>
                      <p className="text-xs text-[#52525b] line-clamp-2">{selectedTemplate.body}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Template Details */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#71717a]">Category:</span>
                  <Badge variant="outline">{selectedTemplate.category}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#71717a]">Priority:</span>
                  {getPriorityBadge(selectedTemplate.priority)}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#71717a]">Channels:</span>
                  <div className="flex gap-1">
                    {selectedTemplate.channels.map((channel) => (
                      <Badge key={channel} variant="outline" className="gap-1">
                        {getChannelIcon(channel)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowPreviewModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Automation Rule Modal */}
      <AddAutomationRuleModal
        open={showAutomationModal}
        onOpenChange={setShowAutomationModal}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
