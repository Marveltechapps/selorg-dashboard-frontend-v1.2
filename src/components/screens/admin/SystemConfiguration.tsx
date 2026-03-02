import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  fetchGeneralSettings,
  fetchDeliverySettings,
  fetchPaymentGateways,
  fetchNotificationSettings,
  fetchTaxSettings,
  fetchFeatureFlags,
  fetchIntegrations,
  fetchAdvancedSettings,
  updateGeneralSettings,
  updateDeliverySettings,
  updatePaymentGateway,
  updateNotificationSettings,
  updateTaxSettings,
  toggleFeatureFlag,
  updateIntegration,
  updateAdvancedSettings,
  testIntegration,
  fetchApiKeys,
  createApiKey,
  revokeApiKey,
  rotateApiKey,
  GeneralSettings,
  DeliverySettings,
  PaymentGateway,
  NotificationSettings,
  TaxSettings,
  FeatureFlag,
  Integration,
  AdvancedSettings,
  ApiKey,
} from './systemConfigApi';
import { fetchCronJobs, triggerCronJob, toggleCronJob } from './systemToolsApi';
import { fetchEnvVariables, updateEnvVariable } from './systemToolsApi';
import { toast } from 'sonner';
import {
  Settings,
  Globe,
  Truck,
  CreditCard,
  Bell,
  Receipt,
  Zap,
  Link as LinkIcon,
  Code,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  TestTube,
  Key,
  Clock,
  FileCode,
  Plus,
  Trash2,
  RotateCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export function SystemConfiguration() {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings | null>(null);
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [cronJobs, setCronJobs] = useState<any[]>([]);
  const [envVars, setEnvVars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit states
  const [editingGeneral, setEditingGeneral] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [editingTax, setEditingTax] = useState(false);

  // Show API keys (for integrations)
  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({});

  // Escalation rules state (local)
  interface EscalationRule {
    id: string;
    category: string;
    priority: string;
    noResponseMinutes: number;
    escalateTo: string;
    enabled: boolean;
  }
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([
    { id: '1', category: 'Payment', priority: 'high', noResponseMinutes: 15, escalateTo: 'Finance Team', enabled: true },
    { id: '2', category: 'Delivery', priority: 'critical', noResponseMinutes: 10, escalateTo: 'Operations Lead', enabled: true },
    { id: '3', category: 'Refund', priority: 'medium', noResponseMinutes: 30, escalateTo: 'Support Manager', enabled: false },
  ]);
  const [addEscalationOpen, setAddEscalationOpen] = useState(false);

  // Create API Key modal
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [newKeyPlain, setNewKeyPlain] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        general,
        delivery,
        payment,
        notification,
        tax,
        features,
        integs,
        advanced,
        keys,
        jobs,
        envs,
      ] = await Promise.all([
        fetchGeneralSettings(),
        fetchDeliverySettings(),
        fetchPaymentGateways(),
        fetchNotificationSettings(),
        fetchTaxSettings(),
        fetchFeatureFlags(),
        fetchIntegrations(),
        fetchAdvancedSettings(),
        fetchApiKeys(),
        fetchCronJobs(),
        fetchEnvVariables(),
      ]);
      setGeneralSettings(general);
      setDeliverySettings(delivery);
      setPaymentGateways(payment);
      setNotificationSettings(notification);
      setTaxSettings(tax);
      setFeatureFlags(features);
      setIntegrations(integs);
      setAdvancedSettings(advanced);
      setApiKeys(keys);
      setCronJobs(jobs);
      setEnvVars(envs);
    } catch (err: any) {
      setError(err?.message || 'Failed to load system configuration');
      toast.error(err?.message || 'Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    if (!generalSettings) return;
    try {
      await updateGeneralSettings(generalSettings);
      toast.success('General settings saved successfully');
      setEditingGeneral(false);
    } catch (error) {
      toast.error('Failed to save general settings');
    }
  };

  const handleSaveDelivery = async () => {
    if (!deliverySettings) return;
    try {
      await updateDeliverySettings(deliverySettings);
      toast.success('Delivery settings saved successfully');
      setEditingDelivery(false);
    } catch (error) {
      toast.error('Failed to save delivery settings');
    }
  };

  const handleSaveTax = async () => {
    if (!taxSettings) return;
    try {
      await updateTaxSettings(taxSettings);
      toast.success('Tax settings saved successfully');
      setEditingTax(false);
    } catch (error) {
      toast.error('Failed to save tax settings');
    }
  };

  const handleTogglePaymentGateway = async (id: string, currentStatus: boolean) => {
    try {
      await updatePaymentGateway(id, { isActive: !currentStatus });
      toast.success(`Payment gateway ${!currentStatus ? 'enabled' : 'disabled'}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update payment gateway');
    }
  };

  const handleToggleFeature = async (id: string, name: string) => {
    try {
      await toggleFeatureFlag(id);
      toast.success(`${name} ${featureFlags.find(f => f.id === id)?.isEnabled ? 'disabled' : 'enabled'}`);
      loadData();
    } catch (error) {
      toast.error('Failed to toggle feature');
    }
  };

  const handleToggleIntegration = async (id: string, currentStatus: boolean) => {
    try {
      await updateIntegration(id, { isActive: !currentStatus });
      toast.success(`Integration ${!currentStatus ? 'enabled' : 'disabled'}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update integration');
    }
  };

  const handleTestIntegration = async (id: string, name: string) => {
    toast.info(`Testing ${name}...`);
    try {
      const result = await testIntegration(id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Test failed');
    }
  };

  const handleToggleMaintenance = async () => {
    if (!advancedSettings) return;
    try {
      const updated = await updateAdvancedSettings({ maintenanceMode: !advancedSettings.maintenanceMode });
      setAdvancedSettings(updated);
      toast.success(`Maintenance mode ${!advancedSettings.maintenanceMode ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to toggle maintenance mode');
    }
  };

  const handleToggleDebugMode = async () => {
    if (!advancedSettings) return;
    try {
      const updated = await updateAdvancedSettings({ debugMode: !advancedSettings.debugMode });
      setAdvancedSettings(updated);
      toast.success(`Debug mode ${!advancedSettings.debugMode ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to toggle debug mode');
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim() || newKeyScopes.length === 0) {
      toast.error('Name and at least one scope are required');
      return;
    }
    try {
      const { data, plainKey } = await createApiKey({ name: newKeyName.trim(), scopes: newKeyScopes });
      setNewKeyPlain(plainKey);
      toast.success('API key created. Copy it now—it won\'t be shown again.');
      setApiKeys([data, ...apiKeys]);
      setNewKeyName('');
      setNewKeyScopes([]);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create API key');
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? It will no longer work.')) return;
    try {
      await revokeApiKey(id);
      toast.success('API key revoked');
      setApiKeys(apiKeys.map(k => k.id === id ? { ...k, status: 'revoked' as const } : k));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revoke API key');
    }
  };

  const handleRotateApiKey = async (id: string) => {
    try {
      const { data, plainKey } = await rotateApiKey(id);
      setNewKeyPlain(plainKey);
      toast.success('API key rotated. Copy the new key now—it won\'t be shown again.');
      setApiKeys(apiKeys.map(k => k.id === id ? data : k));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to rotate API key');
    }
  };

  const handleTriggerCron = async (jobId: string) => {
    try {
      await triggerCronJob(jobId);
      toast.success('Cron job triggered');
      const jobs = await fetchCronJobs();
      setCronJobs(jobs);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to trigger cron job');
    }
  };

  const handleToggleCron = async (jobId: string, enabled: boolean) => {
    try {
      await toggleCronJob(jobId, enabled);
      toast.success(enabled ? 'Cron job enabled' : 'Cron job disabled');
      const jobs = await fetchCronJobs();
      setCronJobs(jobs);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update cron job');
    }
  };

  const handleToggleNotificationChannel = async (channel: 'emailEnabled' | 'smsEnabled' | 'pushEnabled') => {
    if (!notificationSettings) return;
    const newVal = !notificationSettings[channel];
    try {
      const updated = await updateNotificationSettings({ ...notificationSettings, [channel]: newVal });
      setNotificationSettings(updated);
      toast.success(`${channel.replace('Enabled', '')} notifications ${newVal ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update notification settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-[#71717a]">Loading configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#18181b]">System Configuration</h1>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="font-medium text-rose-900">{error}</p>
            <p className="text-sm text-rose-700 mt-1">Please ensure the backend is running and you are authenticated.</p>
          </div>
          <Button onClick={loadData} variant="outline">
            <RefreshCw size={14} className="mr-1.5" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">System Configuration</h1>
          <p className="text-[#71717a] text-sm">Platform-wide settings and integrations</p>
        </div>
        <Button size="sm" onClick={loadData} variant="outline">
          <RefreshCw size={14} className="mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Maintenance Mode Alert */}
      {advancedSettings?.maintenanceMode && (
        <div className="bg-amber-50 border-2 border-amber-500 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-600" size={24} />
            <div>
              <h3 className="font-bold text-amber-900">Maintenance Mode Active</h3>
              <p className="text-sm text-amber-700">Platform is in maintenance mode. Users cannot access the app.</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleToggleMaintenance}>
            Disable Maintenance Mode
          </Button>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            <Globe size={14} className="mr-1.5" /> General
          </TabsTrigger>
          <TabsTrigger value="delivery">
            <Truck size={14} className="mr-1.5" /> Delivery
          </TabsTrigger>
          <TabsTrigger value="payment">
            <CreditCard size={14} className="mr-1.5" /> Payment
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell size={14} className="mr-1.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="tax">
            <Receipt size={14} className="mr-1.5" /> Tax & Compliance
          </TabsTrigger>
          <TabsTrigger value="features">
            <Zap size={14} className="mr-1.5" /> Features
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <LinkIcon size={14} className="mr-1.5" /> Integrations
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            <Key size={14} className="mr-1.5" /> API Keys
          </TabsTrigger>
          <TabsTrigger value="cron-jobs">
            <Clock size={14} className="mr-1.5" /> Cron Jobs
          </TabsTrigger>
          <TabsTrigger value="env-vars">
            <FileCode size={14} className="mr-1.5" /> Env Vars
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Code size={14} className="mr-1.5" /> Advanced
          </TabsTrigger>
          <TabsTrigger value="escalation">
            <AlertTriangle size={14} className="mr-1.5" /> Escalation Rules
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <h3 className="font-bold text-[#18181b]">General Platform Settings</h3>
              {editingGeneral ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingGeneral(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveGeneral}>
                    <Save size={14} className="mr-1.5" /> Save Changes
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditingGeneral(true)}>
                  Edit Settings
                </Button>
              )}
            </div>

            <div className="p-6 space-y-6">
              {!generalSettings ? (
                <div className="p-12 text-center text-[#71717a]">
                  <p>Loading general settings...</p>
                </div>
              ) : generalSettings && (
                <>
                  {/* Platform Identity */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Platform Name</Label>
                      <Input
                        value={generalSettings.platformName}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, platformName: e.target.value })}
                        disabled={!editingGeneral}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tagline</Label>
                      <Input
                        value={generalSettings.tagline}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, tagline: e.target.value })}
                        disabled={!editingGeneral}
                      />
                    </div>
                  </div>

                  {/* Regional Settings */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Select
                        value={generalSettings.timezone}
                        onValueChange={(val) => setGeneralSettings({ ...generalSettings, timezone: val })}
                        disabled={!editingGeneral}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                          <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                          <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select
                        value={generalSettings.currency}
                        onValueChange={(val) => setGeneralSettings({ ...generalSettings, currency: val })}
                        disabled={!editingGeneral}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Time Format</Label>
                      <Select
                        value={generalSettings.timeFormat}
                        onValueChange={(val: any) => setGeneralSettings({ ...generalSettings, timeFormat: val })}
                        disabled={!editingGeneral}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                          <SelectItem value="24h">24-hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Support Email</Label>
                      <Input
                        type="email"
                        value={generalSettings.contactEmail}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, contactEmail: e.target.value })}
                        disabled={!editingGeneral}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Support Phone</Label>
                      <Input
                        value={generalSettings.supportPhone}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, supportPhone: e.target.value })}
                        disabled={!editingGeneral}
                      />
                    </div>
                  </div>

                  {/* Brand Colors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={generalSettings.primaryColor}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, primaryColor: e.target.value })}
                          disabled={!editingGeneral}
                          className="w-20"
                        />
                        <Input
                          value={generalSettings.primaryColor}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, primaryColor: e.target.value })}
                          disabled={!editingGeneral}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={generalSettings.secondaryColor}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, secondaryColor: e.target.value })}
                          disabled={!editingGeneral}
                          className="w-20"
                        />
                        <Input
                          value={generalSettings.secondaryColor}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, secondaryColor: e.target.value })}
                          disabled={!editingGeneral}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Delivery Settings Tab */}
        <TabsContent value="delivery">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <h3 className="font-bold text-[#18181b]">Delivery Configuration</h3>
              {editingDelivery ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingDelivery(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveDelivery}>
                    <Save size={14} className="mr-1.5" /> Save Changes
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditingDelivery(true)}>
                  Edit Settings
                </Button>
              )}
            </div>

            <div className="p-6 space-y-6">
              {deliverySettings && (
                <>
                  {/* Order Limits */}
                  <div>
                    <h4 className="font-bold text-sm text-[#18181b] mb-3">Order Value Limits</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Minimum Order Value (₹)</Label>
                        <Input
                          type="number"
                          value={deliverySettings.minOrderValue}
                          onChange={(e) => setDeliverySettings({ ...deliverySettings, minOrderValue: parseFloat(e.target.value) })}
                          disabled={!editingDelivery}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Maximum Order Value (₹)</Label>
                        <Input
                          type="number"
                          value={deliverySettings.maxOrderValue}
                          onChange={(e) => setDeliverySettings({ ...deliverySettings, maxOrderValue: parseFloat(e.target.value) })}
                          disabled={!editingDelivery}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delivery Fees */}
                  <div>
                    <h4 className="font-bold text-sm text-[#18181b] mb-3">Delivery Fees</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Base Fee (₹)</Label>
                        <Input
                          type="number"
                          value={deliverySettings.baseDeliveryFee}
                          onChange={(e) => setDeliverySettings({ ...deliverySettings, baseDeliveryFee: parseFloat(e.target.value) })}
                          disabled={!editingDelivery}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Per KM (₹)</Label>
                        <Input
                          type="number"
                          value={deliverySettings.deliveryFeePerKm}
                          onChange={(e) => setDeliverySettings({ ...deliverySettings, deliveryFeePerKm: parseFloat(e.target.value) })}
                          disabled={!editingDelivery}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Free Above (₹)</Label>
                        <Input
                          type="number"
                          value={deliverySettings.freeDeliveryAbove}
                          onChange={(e) => setDeliverySettings({ ...deliverySettings, freeDeliveryAbove: parseFloat(e.target.value) })}
                          disabled={!editingDelivery}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delivery Parameters */}
                  <div>
                    <h4 className="font-bold text-sm text-[#18181b] mb-3">Service Parameters</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Max Radius (km)</Label>
                        <Input
                          type="number"
                          value={deliverySettings.maxDeliveryRadius}
                          onChange={(e) => setDeliverySettings({ ...deliverySettings, maxDeliveryRadius: parseFloat(e.target.value) })}
                          disabled={!editingDelivery}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Avg Time (min)</Label>
                        <Input
                          type="number"
                          value={deliverySettings.avgDeliveryTime}
                          onChange={(e) => setDeliverySettings({ ...deliverySettings, avgDeliveryTime: parseFloat(e.target.value) })}
                          disabled={!editingDelivery}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Express Fee (₹)</Label>
                        <Input
                          type="number"
                          value={deliverySettings.expressDeliveryFee}
                          onChange={(e) => setDeliverySettings({ ...deliverySettings, expressDeliveryFee: parseFloat(e.target.value) })}
                          disabled={!editingDelivery}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delivery Slots */}
                  <div>
                    <h4 className="font-bold text-sm text-[#18181b] mb-3">Delivery Time Slots</h4>
                    <div className="space-y-2">
                      {deliverySettings.slots.map((slot) => (
                        <div key={slot.id} className="flex items-center gap-4 p-3 bg-[#f4f4f5] rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-[#18181b]">{slot.name}</div>
                            <div className="text-xs text-[#71717a]">
                              {slot.startTime} - {slot.endTime} • Max {slot.maxOrders} orders
                              {slot.surgeMultiplier > 1 && ` • ${slot.surgeMultiplier}× surge`}
                            </div>
                          </div>
                          <Badge className={slot.isActive ? 'bg-emerald-500' : 'bg-gray-500'}>
                            {slot.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Payment Settings Tab */}
        <TabsContent value="payment">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Payment Gateway Configuration</h3>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {paymentGateways.map((gateway) => (
                  <div key={gateway.id} className="border border-[#e4e4e7] rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-[#18181b]">{gateway.name}</h4>
                          <Badge variant="outline" className="capitalize">{gateway.provider}</Badge>
                          {gateway.isActive && <Badge className="bg-emerald-500">Active</Badge>}
                        </div>

                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-[#71717a]">Transaction Fee</p>
                            <p className="font-medium text-[#18181b]">
                              {gateway.transactionFeeType === 'percentage' ? `${gateway.transactionFee}%` : `₹${gateway.transactionFee}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#71717a]">Min Amount</p>
                            <p className="font-medium text-[#18181b]">₹{gateway.minAmount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#71717a]">Max Amount</p>
                            <p className="font-medium text-[#18181b]">₹{gateway.maxAmount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#71717a]">API Key</p>
                            <p className="font-mono text-xs text-[#52525b]">{gateway.apiKey}</p>
                          </div>
                        </div>
                      </div>

                      <Switch
                        checked={gateway.isActive}
                        onCheckedChange={() => handleTogglePaymentGateway(gateway.id, gateway.isActive)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Notification Settings</h3>
            </div>

            <div className="p-6 space-y-6">
              {notificationSettings && (
                <>
                  {/* Channel Status */}
                  <div>
                    <h4 className="font-bold text-sm text-[#18181b] mb-3">Notification Channels</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center justify-between p-4 bg-[#f4f4f5] rounded-lg">
                        <div>
                          <p className="font-medium text-[#18181b]">Email Notifications</p>
                          <p className="text-xs text-[#71717a]">{notificationSettings.emailProvider}</p>
                        </div>
                        <Switch checked={notificationSettings.emailEnabled} onCheckedChange={() => handleToggleNotificationChannel('emailEnabled')} />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-[#f4f4f5] rounded-lg">
                        <div>
                          <p className="font-medium text-[#18181b]">SMS Notifications</p>
                          <p className="text-xs text-[#71717a]">{notificationSettings.smsProvider}</p>
                        </div>
                        <Switch checked={notificationSettings.smsEnabled} onCheckedChange={() => handleToggleNotificationChannel('smsEnabled')} />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-[#f4f4f5] rounded-lg">
                        <div>
                          <p className="font-medium text-[#18181b]">Push Notifications</p>
                          <p className="text-xs text-[#71717a]">FCM</p>
                        </div>
                        <Switch checked={notificationSettings.pushEnabled} onCheckedChange={() => handleToggleNotificationChannel('pushEnabled')} />
                      </div>
                    </div>
                  </div>

                  {/* Templates */}
                  <div>
                    <h4 className="font-bold text-sm text-[#18181b] mb-3">Notification Templates</h4>
                    <div className="space-y-2">
                      {(notificationSettings.templates || []).map((template) => (
                        <div key={template.id} className="flex items-center justify-between p-3 border border-[#e4e4e7] rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-[#18181b]">{template.name}</p>
                              <Badge variant="outline" className="text-xs">{template.type}</Badge>
                            </div>
                            <p className="text-xs text-[#71717a] mt-1">Event: {template.event}</p>
                          </div>
                          <Badge className={template.isActive ? 'bg-emerald-500' : 'bg-gray-500'}>
                            {template.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tax & Compliance Tab */}
        <TabsContent value="tax">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <h3 className="font-bold text-[#18181b]">Tax & Compliance Settings</h3>
              {editingTax ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingTax(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveTax}>
                    <Save size={14} className="mr-1.5" /> Save Changes
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditingTax(true)}>
                  Edit Settings
                </Button>
              )}
            </div>

            <div className="p-6 space-y-6">
              {taxSettings && (
                <>
                  {/* GST Configuration */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-sm text-[#18181b]">GST Configuration</h4>
                      <Switch
                        checked={taxSettings.gstEnabled}
                        onCheckedChange={(checked) => setTaxSettings({ ...taxSettings, gstEnabled: checked })}
                        disabled={!editingTax}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>CGST Rate (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={taxSettings.cgstRate}
                          onChange={(e) => setTaxSettings({ ...taxSettings, cgstRate: parseFloat(e.target.value) })}
                          disabled={!editingTax || !taxSettings.gstEnabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SGST Rate (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={taxSettings.sgstRate}
                          onChange={(e) => setTaxSettings({ ...taxSettings, sgstRate: parseFloat(e.target.value) })}
                          disabled={!editingTax || !taxSettings.gstEnabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>IGST Rate (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={taxSettings.igstRate}
                          onChange={(e) => setTaxSettings({ ...taxSettings, igstRate: parseFloat(e.target.value) })}
                          disabled={!editingTax || !taxSettings.gstEnabled}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tax Display */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tax Display Type</Label>
                      <Select
                        value={taxSettings.taxDisplayType}
                        onValueChange={(val: any) => setTaxSettings({ ...taxSettings, taxDisplayType: val })}
                        disabled={!editingTax}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inclusive">Inclusive (Price includes tax)</SelectItem>
                          <SelectItem value="exclusive">Exclusive (Tax added separately)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Business Numbers */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>GST Number</Label>
                      <Input
                        value={taxSettings.gstNumber}
                        onChange={(e) => setTaxSettings({ ...taxSettings, gstNumber: e.target.value })}
                        disabled={!editingTax}
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>PAN Number</Label>
                      <Input
                        value={taxSettings.panNumber}
                        onChange={(e) => setTaxSettings({ ...taxSettings, panNumber: e.target.value })}
                        disabled={!editingTax}
                        className="font-mono"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Feature Flags Tab */}
        <TabsContent value="features">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Feature Flags</h3>
              <p className="text-xs text-[#71717a] mt-1">Enable or disable platform features</p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-3">
                {featureFlags.map((feature) => (
                  <div key={feature.id} className="flex items-center justify-between p-4 border border-[#e4e4e7] rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-[#18181b]">{feature.name}</h4>
                        <Badge
                          variant="outline"
                          className={
                            feature.category === 'core' ? 'border-blue-500 text-blue-700' :
                            feature.category === 'premium' ? 'border-purple-500 text-purple-700' :
                            feature.category === 'beta' ? 'border-amber-500 text-amber-700' :
                            'border-pink-500 text-pink-700'
                          }
                        >
                          {feature.category}
                        </Badge>
                        {feature.requiresRestart && (
                          <Badge variant="outline" className="text-xs border-rose-500 text-rose-700">
                            Requires Restart
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-[#71717a]">{feature.description}</p>
                      <p className="text-xs text-[#a1a1aa] mt-1 font-mono">{feature.key}</p>
                    </div>
                    <Switch
                      checked={feature.isEnabled}
                      onCheckedChange={() => handleToggleFeature(feature.id, feature.name)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Third-Party Integrations</h3>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {integrations.map((integration) => (
                  <div key={integration.id} className="border border-[#e4e4e7] rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-[#18181b]">{integration.name}</h4>
                          {integration.isActive && <Badge className="bg-emerald-500">Active</Badge>}
                        </div>
                        <p className="text-xs text-[#71717a]">{integration.service}</p>
                      </div>
                      <Switch
                        checked={integration.isActive}
                        onCheckedChange={() => handleToggleIntegration(integration.id, integration.isActive)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-[#71717a] mb-1">API Key</p>
                        <div className="flex items-center gap-2">
                          <Input
                            type={showApiKeys[integration.id] ? 'text' : 'password'}
                            value={integration.apiKey}
                            readOnly
                            className="font-mono text-xs"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowApiKeys({ ...showApiKeys, [integration.id]: !showApiKeys[integration.id] })}
                          >
                            {showApiKeys[integration.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-[#71717a] mb-1">Endpoint</p>
                        <Input value={integration.endpoint || 'N/A'} readOnly className="text-xs" />
                      </div>
                      <div>
                        <p className="text-xs text-[#71717a] mb-1">Last Sync</p>
                        <div className="flex items-center gap-2">
                          <Input
                            value={integration.lastSync ? new Date(integration.lastSync).toLocaleString() : 'Never'}
                            readOnly
                            className="text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTestIntegration(integration.id, integration.name)}
                          >
                            <TestTube size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <h3 className="font-bold text-[#18181b]">API Key Management</h3>
              <Button size="sm" onClick={() => { setCreateKeyOpen(true); setNewKeyPlain(null); setNewKeyName(''); setNewKeyScopes([]); }}>
                <Plus size={14} className="mr-1.5" /> Create New
              </Button>
            </div>
            <div className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-[#71717a]">
                        No API keys yet. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    apiKeys.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-mono text-xs">{k.key_id}</TableCell>
                        <TableCell>{k.name}</TableCell>
                        <TableCell>{k.created_by}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(k.scopes || []).slice(0, 3).map((s) => (
                              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                            ))}
                            {(k.scopes || []).length > 3 && (
                              <Badge variant="outline" className="text-xs">+{(k.scopes || []).length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-[#71717a]">
                          {k.last_used ? new Date(k.last_used).toLocaleString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Badge className={k.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-500'}>
                            {k.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {k.status === 'active' && (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="outline" onClick={() => handleRotateApiKey(k.id)}>
                                <RotateCw size={12} className="mr-1" /> Rotate
                              </Button>
                              <Button size="sm" variant="outline" className="text-rose-600" onClick={() => handleRevokeApiKey(k.id)}>
                                <Ban size={12} className="mr-1" /> Revoke
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Cron Jobs Tab */}
        <TabsContent value="cron-jobs">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Cron Jobs</h3>
              <p className="text-xs text-[#71717a] mt-1">Scheduled background tasks</p>
            </div>
            <div className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cronJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-[#71717a]">
                        No cron jobs configured.
                      </TableCell>
                    </TableRow>
                  ) : (
                    cronJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>{job.name}</TableCell>
                        <TableCell className="font-mono text-xs">{job.schedule}</TableCell>
                        <TableCell className="text-xs">{job.lastRun ? new Date(job.lastRun).toLocaleString() : '—'}</TableCell>
                        <TableCell className="text-xs">{job.nextRun ? new Date(job.nextRun).toLocaleString() : '—'}</TableCell>
                        <TableCell>
                          <Badge className={job.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}>{job.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => handleTriggerCron(job.id)}>
                            <Play size={12} className="mr-1" /> Trigger
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Env Vars Tab */}
        <TabsContent value="env-vars">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Environment Variables</h3>
              <p className="text-xs text-[#71717a] mt-1">System environment configuration (read-only in this view)</p>
            </div>
            <div className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {envVars.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-[#71717a]">
                        No environment variables available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    envVars.map((v) => (
                      <TableRow key={v.key}>
                        <TableCell className="font-mono text-xs">{v.key}</TableCell>
                        <TableCell className="font-mono text-xs text-[#52525b]">
                          {v.isSensitive ? '••••••••••••••••' : v.value}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{v.category || 'general'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Advanced Settings Tab */}
        <TabsContent value="advanced">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Advanced System Settings</h3>
              <p className="text-xs text-rose-600 mt-1">⚠️ Caution: Changes to these settings may affect platform stability</p>
            </div>

            <div className="p-6 space-y-6">
              {advancedSettings && (
                <>
                  {/* System Modes */}
                  <div>
                    <h4 className="font-bold text-sm text-[#18181b] mb-3">System Modes</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 bg-[#f4f4f5] rounded-lg">
                        <div>
                          <p className="font-medium text-[#18181b]">Maintenance Mode</p>
                          <p className="text-xs text-[#71717a]">Disable user access</p>
                        </div>
                        <Switch
                          checked={advancedSettings.maintenanceMode}
                          onCheckedChange={handleToggleMaintenance}
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-[#f4f4f5] rounded-lg">
                        <div>
                          <p className="font-medium text-[#18181b]">Debug Mode</p>
                          <p className="text-xs text-[#71717a]">Enable detailed logging</p>
                        </div>
                        <Switch checked={advancedSettings.debugMode} onCheckedChange={handleToggleDebugMode} />
                      </div>
                    </div>
                  </div>

                  {/* Performance Settings */}
                  <div>
                    <h4 className="font-bold text-sm text-[#18181b] mb-3">Performance Settings</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Cache Duration (sec)</Label>
                        <Input type="number" value={advancedSettings.cacheDuration} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Rate Limit (/min)</Label>
                        <Input type="number" value={advancedSettings.rateLimitPerMinute} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Session Timeout (sec)</Label>
                        <Input type="number" value={advancedSettings.sessionTimeout} disabled />
                      </div>
                    </div>
                  </div>

                  {/* System Info */}
                  <div>
                    <h4 className="font-bold text-sm text-[#18181b] mb-3">System Information</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-[#f4f4f5] rounded-lg">
                        <p className="text-xs text-[#71717a]">API Version</p>
                        <p className="font-mono text-lg font-bold text-[#18181b]">{advancedSettings.apiVersion}</p>
                      </div>
                      <div className="p-4 bg-[#f4f4f5] rounded-lg">
                        <p className="text-xs text-[#71717a]">Log Level</p>
                        <p className="font-mono text-lg font-bold text-[#18181b] capitalize">{advancedSettings.logLevel}</p>
                      </div>
                      <div className="p-4 bg-[#f4f4f5] rounded-lg">
                        <p className="text-xs text-[#71717a]">Max Concurrent Users</p>
                        <p className="font-mono text-lg font-bold text-[#18181b]">{advancedSettings.maxConcurrentUsers.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Escalation Rules Tab */}
        <TabsContent value="escalation">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#18181b]">Escalation Rules</h3>
                <p className="text-xs text-[#71717a] mt-1">Auto-escalate tickets when response thresholds are exceeded</p>
              </div>
              <Button size="sm" onClick={() => setAddEscalationOpen(true)}>
                <Plus size={14} className="mr-1.5" /> Add Rule
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>No Response Threshold</TableHead>
                    <TableHead>Escalate To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {escalationRules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-[#71717a]">No escalation rules configured</TableCell>
                    </TableRow>
                  ) : (
                    escalationRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.category}</TableCell>
                        <TableCell>
                          <Badge className={
                            rule.priority === 'critical' ? 'bg-red-500 text-white' :
                            rule.priority === 'high' ? 'bg-orange-500 text-white' :
                            rule.priority === 'medium' ? 'bg-yellow-500 text-white' :
                            'bg-gray-200 text-gray-700'
                          }>
                            {rule.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{rule.noResponseMinutes} minutes</TableCell>
                        <TableCell>{rule.escalateTo}</TableCell>
                        <TableCell>
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(checked) =>
                              setEscalationRules((prev) =>
                                prev.map((r) => r.id === rule.id ? { ...r, enabled: checked } : r)
                              )
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() =>
                              setEscalationRules((prev) => prev.filter((r) => r.id !== rule.id))
                            }
                          >
                            <Trash2 size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Escalation Rule Modal */}
      <Dialog open={addEscalationOpen} onOpenChange={setAddEscalationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Escalation Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select>
                <SelectTrigger id="esc-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Payment">Payment</SelectItem>
                  <SelectItem value="Delivery">Delivery</SelectItem>
                  <SelectItem value="Refund">Refund</SelectItem>
                  <SelectItem value="Quality">Quality</SelectItem>
                  <SelectItem value="Account">Account</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select>
                <SelectTrigger id="esc-priority"><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>No Response Threshold (minutes)</Label>
              <Input id="esc-minutes" type="number" placeholder="15" />
            </div>
            <div className="space-y-2">
              <Label>Escalate To (Team)</Label>
              <Input id="esc-team" placeholder="e.g. Operations Lead" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEscalationOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              const catEl = document.querySelector('#esc-category + [data-value]') as any;
              const minutes = parseInt((document.getElementById('esc-minutes') as HTMLInputElement)?.value || '0');
              const team = (document.getElementById('esc-team') as HTMLInputElement)?.value;
              if (minutes > 0 && team) {
                setEscalationRules((prev) => [...prev, {
                  id: Date.now().toString(),
                  category: 'General',
                  priority: 'medium',
                  noResponseMinutes: minutes,
                  escalateTo: team,
                  enabled: true,
                }]);
                toast.success('Escalation rule added');
                setAddEscalationOpen(false);
              } else {
                toast.error('Please fill all required fields');
              }
            }}>
              Add Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create API Key Modal */}
      <Dialog open={createKeyOpen} onOpenChange={(open) => {
        setCreateKeyOpen(open);
        if (!open) setNewKeyPlain(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newKeyPlain ? 'API Key Created' : 'Create New API Key'}</DialogTitle>
          </DialogHeader>
          {newKeyPlain ? (
            <div className="space-y-4">
              <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
                Copy this key now. It will not be shown again.
              </p>
              <div className="flex gap-2">
                <Input readOnly value={newKeyPlain} className="font-mono" />
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(newKeyPlain!);
                    toast.success('Copied to clipboard');
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  placeholder="e.g. Production API"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div>
                <Label>Scopes (comma-separated)</Label>
                <Input
                  placeholder="read, write, admin"
                  value={newKeyScopes.join(', ')}
                  onChange={(e) => setNewKeyScopes(e.target.value.split(/[\s,]+/).map(s => s.trim()).filter(Boolean))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {newKeyPlain ? (
              <Button onClick={() => { setCreateKeyOpen(false); setNewKeyPlain(null); }}>Close</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateKeyOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateApiKey} disabled={!newKeyName.trim() || newKeyScopes.length === 0}>
                  Create Key
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
