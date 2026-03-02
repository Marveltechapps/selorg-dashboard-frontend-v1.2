import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Save,
  RotateCcw,
  Smartphone,
  Shield,
  CreditCard,
  Truck,
  Bell,
  Search,
  MapPin,
  Headphones,
  ToggleLeft,
  Rocket,
  Wrench,
  Palette,
  KeyRound,
  Plus,
  Trash2,
  GripVertical,
  Tag,
  FileText,
  Scale,
  RefreshCw,
  Eye,
  EyeOff,
  Pencil,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import { apiRequest } from '@/api/apiClient';
import { API_ENDPOINTS } from '@/config/api';

/* ─── Types ────────────────────────────────────────────────────────── */

interface AppConfig {
  _id?: string;
  branding: {
    splashTitle: string;
    splashSubtitle: string;
    splashLogoUrl: string;
    splashBgColor: string;
    splashDurationMs: number;
    loginBrandName: string;
    loginSubtitle: string;
    loginSectionTitle: string;
    loginSectionSubtitle: string;
    loginOtpNote: string;
    primaryColor: string;
    countryCode: string;
    phoneMaxLength: number;
  };
  otp: {
    length: number;
    timerDurationSec: number;
    maxRetries: number;
    headerTitle: string;
    heading: string;
    description: string;
    buttonText: string;
    resendText: string;
  };
  checkout: {
    handlingCharge: number;
    deliveryFee: number;
    freeDeliveryMinAmount: number;
    minOrderAmount: number;
    tipAmounts: number[];
    deliveryInstructions: string[];
    emptyCartTitle: string;
    emptyCartDescription: string;
    emptyCartCta: string;
    paymentInfoText: string;
  };
  paymentMethods: Array<{
    key: string;
    label: string;
    description: string;
    icon: string;
    isActive: boolean;
    order: number;
  }>;
  featureFlags: {
    showSkipButtonOnLogin: boolean;
    enableReferral: boolean;
    enableWallet: boolean;
    enableChat: boolean;
    enableRatings: boolean;
    enableCoupons: boolean;
    enableNotifications: boolean;
    maxCartItems: number;
  };
  appVersion: {
    currentVersion: string;
    minVersion: string;
    forceUpdate: boolean;
    updateMessage: string;
    updateUrl: string;
  };
  maintenance: {
    isActive: boolean;
    message: string;
    estimatedEndTime: string | null;
  };
  supportCategories: Array<{
    key: string;
    label: string;
    description: string;
    icon: string;
    isActive: boolean;
    order: number;
  }>;
  search: {
    placeholder: string;
    popularSearches: string[];
    emptyStateTitle: string;
    emptyStateSubtitle: string;
  };
  notifications: {
    channelsAvailable: Array<{
      key: string;
      label: string;
      description: string;
      isActive: boolean;
    }>;
    dndStartHour: number;
    dndEndHour: number;
  };
  locationTags: string[];
}

interface Coupon {
  _id: string;
  code: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  usageLimit: number | null;
  usageCount: number;
}

interface LegalDoc {
  _id: string;
  type: 'terms' | 'privacy';
  version: string;
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  contentFormat: string;
  content: string;
  isCurrent: boolean;
}

interface CancelPolicy {
  _id: string;
  name: string;
  isActive: boolean;
  allowedStatuses: string[];
  freeWindowMinutes: number;
  cancellationFeePercent: number;
  maxCancellationFee: number;
  maxCancellationsPerDay: number;
  maxCancellationsPerWeek: number;
  customerCanCancel: boolean;
  supportCanCancel: boolean;
  autoRefundOnCancel: boolean;
  refundMethod: string;
  appliesTo: string;
}

type SettingsTab =
  | 'branding'
  | 'auth'
  | 'checkout'
  | 'features'
  | 'version'
  | 'support'
  | 'search'
  | 'notifications'
  | 'coupons'
  | 'legal'
  | 'cancellation';

/* ─── Component ────────────────────────────────────────────────────── */

export function CustomerAppSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('branding');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Coupons
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponDialog, setCouponDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);

  // Legal
  const [legalDocs, setLegalDocs] = useState<LegalDoc[]>([]);
  const [legalLoading, setLegalLoading] = useState(false);
  const [legalDialog, setLegalDialog] = useState(false);
  const [editingLegal, setEditingLegal] = useState<Partial<LegalDoc> | null>(null);

  // Cancellation
  const [cancelPolicies, setCancelPolicies] = useState<CancelPolicy[]>([]);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [editingCancel, setEditingCancel] = useState<Partial<CancelPolicy> | null>(null);

  /* ─── Load Config ─────────────────────────────────── */

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: AppConfig }>(
        API_ENDPOINTS.customerAppConfig.get
      );
      setConfig(res.data);
    } catch (err: any) {
      toast.error('Failed to load app config: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  /* ─── Save Config ─────────────────────────────────── */

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await apiRequest<{ success: boolean; data: AppConfig }>(
        API_ENDPOINTS.customerAppConfig.update,
        { method: 'PUT', body: JSON.stringify(config) }
      );
      setConfig(res.data);
      setDirty(false);
      toast.success('App configuration saved');
    } catch (err: any) {
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = async () => {
    setSaving(true);
    try {
      const res = await apiRequest<{ success: boolean; data: AppConfig }>(
        API_ENDPOINTS.customerAppConfig.reset,
        { method: 'POST' }
      );
      setConfig(res.data);
      setDirty(false);
      toast.success('Config reset to defaults');
    } catch (err: any) {
      toast.error('Failed to reset: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof AppConfig>(section: K, field: string, value: unknown) => {
    if (!config) return;
    setConfig({
      ...config,
      [section]: {
        ...(config[section] as any),
        [field]: value,
      },
    });
    setDirty(true);
  };

  /* ─── Coupons ────────────────────────────────────── */

  const loadCoupons = useCallback(async () => {
    setCouponLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: Coupon[] }>(
        API_ENDPOINTS.customerCoupons.list
      );
      setCoupons(res.data ?? []);
    } catch (err: any) {
      toast.error('Failed to load coupons');
    } finally {
      setCouponLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'coupons') loadCoupons();
  }, [activeTab, loadCoupons]);

  const saveCoupon = async () => {
    if (!editingCoupon) return;
    try {
      if (editingCoupon._id) {
        await apiRequest(API_ENDPOINTS.customerCoupons.update(editingCoupon._id), {
          method: 'PUT',
          body: JSON.stringify(editingCoupon),
        });
        toast.success('Coupon updated');
      } else {
        await apiRequest(API_ENDPOINTS.customerCoupons.create, {
          method: 'POST',
          body: JSON.stringify(editingCoupon),
        });
        toast.success('Coupon created');
      }
      setCouponDialog(false);
      setEditingCoupon(null);
      loadCoupons();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save coupon');
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      await apiRequest(API_ENDPOINTS.customerCoupons.delete(id), { method: 'DELETE' });
      toast.success('Coupon deleted');
      loadCoupons();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  /* ─── Legal ──────────────────────────────────────── */

  const loadLegal = useCallback(async () => {
    setLegalLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: LegalDoc[] }>(
        API_ENDPOINTS.customerLegal.documents
      );
      setLegalDocs(res.data ?? []);
    } catch (err: any) {
      toast.error('Failed to load legal documents');
    } finally {
      setLegalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'legal') loadLegal();
  }, [activeTab, loadLegal]);

  const saveLegal = async () => {
    if (!editingLegal) return;
    try {
      if (editingLegal._id) {
        await apiRequest(API_ENDPOINTS.customerLegal.updateDocument(editingLegal._id), {
          method: 'PUT',
          body: JSON.stringify(editingLegal),
        });
        toast.success('Document updated');
      } else {
        await apiRequest(API_ENDPOINTS.customerLegal.createDocument, {
          method: 'POST',
          body: JSON.stringify(editingLegal),
        });
        toast.success('Document created');
      }
      setLegalDialog(false);
      setEditingLegal(null);
      loadLegal();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save document');
    }
  };

  const deleteLegal = async (id: string) => {
    try {
      await apiRequest(API_ENDPOINTS.customerLegal.deleteDocument(id), { method: 'DELETE' });
      toast.success('Document deleted');
      loadLegal();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  /* ─── Cancellation Policies ──────────────────────── */

  const loadCancelPolicies = useCallback(async () => {
    setCancelLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: CancelPolicy[] }>(
        API_ENDPOINTS.customerCancellationPolicies.list
      );
      setCancelPolicies(res.data ?? []);
    } catch (err: any) {
      toast.error('Failed to load cancellation policies');
    } finally {
      setCancelLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'cancellation') loadCancelPolicies();
  }, [activeTab, loadCancelPolicies]);

  const saveCancel = async () => {
    if (!editingCancel) return;
    try {
      if (editingCancel._id) {
        await apiRequest(API_ENDPOINTS.customerCancellationPolicies.update(editingCancel._id), {
          method: 'PUT',
          body: JSON.stringify(editingCancel),
        });
        toast.success('Policy updated');
      } else {
        await apiRequest(API_ENDPOINTS.customerCancellationPolicies.create, {
          method: 'POST',
          body: JSON.stringify(editingCancel),
        });
        toast.success('Policy created');
      }
      setCancelDialog(false);
      setEditingCancel(null);
      loadCancelPolicies();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save policy');
    }
  };

  const deleteCancel = async (id: string) => {
    try {
      await apiRequest(API_ENDPOINTS.customerCancellationPolicies.delete(id), { method: 'DELETE' });
      toast.success('Policy deleted');
      loadCancelPolicies();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  /* ─── Render ─────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load configuration</p>
        <Button onClick={loadConfig} variant="outline" className="mt-4">Retry</Button>
      </div>
    );
  }

  const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'auth', label: 'Auth & OTP', icon: KeyRound },
    { id: 'checkout', label: 'Checkout', icon: CreditCard },
    { id: 'features', label: 'Feature Flags', icon: ToggleLeft },
    { id: 'version', label: 'App Version', icon: Rocket },
    { id: 'support', label: 'Support', icon: Headphones },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'coupons', label: 'Coupons', icon: Tag },
    { id: 'legal', label: 'Legal', icon: FileText },
    { id: 'cancellation', label: 'Cancellation', icon: Scale },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer App Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure all aspects of the customer mobile app
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              Unsaved changes
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={resetConfig} disabled={saving}>
            <RotateCcw className="w-4 h-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={saveConfig} disabled={saving || !dirty}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save All
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6">
        <div className="w-48 shrink-0 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                activeTab === id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          {/* Branding */}
          {activeTab === 'branding' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Splash Screen</CardTitle>
                  <CardDescription>Configure the app splash/loading screen</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Title</Label>
                      <Input value={config.branding.splashTitle} onChange={e => updateField('branding', 'splashTitle', e.target.value)} />
                    </div>
                    <div>
                      <Label>Subtitle</Label>
                      <Input value={config.branding.splashSubtitle} onChange={e => updateField('branding', 'splashSubtitle', e.target.value)} />
                    </div>
                    <div>
                      <Label>Background Color</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={config.branding.splashBgColor} onChange={e => updateField('branding', 'splashBgColor', e.target.value)} className="w-10 h-9 rounded border cursor-pointer" />
                        <Input value={config.branding.splashBgColor} onChange={e => updateField('branding', 'splashBgColor', e.target.value)} className="flex-1" />
                      </div>
                    </div>
                    <div>
                      <Label>Duration (ms)</Label>
                      <Input type="number" value={config.branding.splashDurationMs} onChange={e => updateField('branding', 'splashDurationMs', Number(e.target.value))} />
                    </div>
                    <div className="col-span-2">
                      <Label>Logo URL</Label>
                      <Input value={config.branding.splashLogoUrl} onChange={e => updateField('branding', 'splashLogoUrl', e.target.value)} placeholder="https://..." />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Login Screen</CardTitle>
                  <CardDescription>Configure login screen text and branding</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Brand Name</Label>
                      <Input value={config.branding.loginBrandName} onChange={e => updateField('branding', 'loginBrandName', e.target.value)} />
                    </div>
                    <div>
                      <Label>Subtitle</Label>
                      <Input value={config.branding.loginSubtitle} onChange={e => updateField('branding', 'loginSubtitle', e.target.value)} />
                    </div>
                    <div>
                      <Label>Section Title</Label>
                      <Input value={config.branding.loginSectionTitle} onChange={e => updateField('branding', 'loginSectionTitle', e.target.value)} />
                    </div>
                    <div>
                      <Label>Section Subtitle</Label>
                      <Input value={config.branding.loginSectionSubtitle} onChange={e => updateField('branding', 'loginSectionSubtitle', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label>OTP Note</Label>
                      <Input value={config.branding.loginOtpNote} onChange={e => updateField('branding', 'loginOtpNote', e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Regional Settings</CardTitle>
                  <CardDescription>Country code and phone format</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Primary Color</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={config.branding.primaryColor} onChange={e => updateField('branding', 'primaryColor', e.target.value)} className="w-10 h-9 rounded border cursor-pointer" />
                        <Input value={config.branding.primaryColor} onChange={e => updateField('branding', 'primaryColor', e.target.value)} className="flex-1" />
                      </div>
                    </div>
                    <div>
                      <Label>Country Code</Label>
                      <Input value={config.branding.countryCode} onChange={e => updateField('branding', 'countryCode', e.target.value)} />
                    </div>
                    <div>
                      <Label>Phone Max Length</Label>
                      <Input type="number" value={config.branding.phoneMaxLength} onChange={e => updateField('branding', 'phoneMaxLength', Number(e.target.value))} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Auth & OTP */}
          {activeTab === 'auth' && (
            <Card>
              <CardHeader>
                <CardTitle>OTP Verification Settings</CardTitle>
                <CardDescription>Configure OTP length, timer, and screen text</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>OTP Length</Label>
                    <Input type="number" min={4} max={8} value={config.otp.length} onChange={e => updateField('otp', 'length', Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Timer Duration (seconds)</Label>
                    <Input type="number" min={10} max={300} value={config.otp.timerDurationSec} onChange={e => updateField('otp', 'timerDurationSec', Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Max Retries</Label>
                    <Input type="number" min={1} max={10} value={config.otp.maxRetries} onChange={e => updateField('otp', 'maxRetries', Number(e.target.value))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Header Title</Label>
                    <Input value={config.otp.headerTitle} onChange={e => updateField('otp', 'headerTitle', e.target.value)} />
                  </div>
                  <div>
                    <Label>Heading</Label>
                    <Input value={config.otp.heading} onChange={e => updateField('otp', 'heading', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label>Description</Label>
                    <Input value={config.otp.description} onChange={e => updateField('otp', 'description', e.target.value)} />
                  </div>
                  <div>
                    <Label>Button Text</Label>
                    <Input value={config.otp.buttonText} onChange={e => updateField('otp', 'buttonText', e.target.value)} />
                  </div>
                  <div>
                    <Label>Resend Text</Label>
                    <Input value={config.otp.resendText} onChange={e => updateField('otp', 'resendText', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Checkout */}
          {activeTab === 'checkout' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fees & Charges</CardTitle>
                  <CardDescription>Configure checkout charges</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Handling Charge (₹)</Label>
                      <Input type="number" step="0.5" value={config.checkout.handlingCharge} onChange={e => updateField('checkout', 'handlingCharge', Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Delivery Fee (₹)</Label>
                      <Input type="number" step="0.5" value={config.checkout.deliveryFee} onChange={e => updateField('checkout', 'deliveryFee', Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Free Delivery Min Amount (₹)</Label>
                      <Input type="number" value={config.checkout.freeDeliveryMinAmount} onChange={e => updateField('checkout', 'freeDeliveryMinAmount', Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Min Order Amount (₹)</Label>
                      <Input type="number" value={config.checkout.minOrderAmount} onChange={e => updateField('checkout', 'minOrderAmount', Number(e.target.value))} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tip Options</CardTitle>
                  <CardDescription>Rider tip amounts shown at checkout</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(config.checkout.tipAmounts || []).map((amt, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 px-3 py-1.5">
                        ₹{amt}
                        <button onClick={() => {
                          const tips = [...config.checkout.tipAmounts];
                          tips.splice(i, 1);
                          updateField('checkout', 'tipAmounts', tips);
                        }}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => {
                      const val = prompt('Enter tip amount:');
                      if (val && !isNaN(Number(val))) {
                        updateField('checkout', 'tipAmounts', [...(config.checkout.tipAmounts || []), Number(val)]);
                      }
                    }}>
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Delivery Instructions</CardTitle>
                  <CardDescription>Preset delivery instruction options</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(config.checkout.deliveryInstructions || []).map((inst, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input value={inst} onChange={e => {
                          const arr = [...config.checkout.deliveryInstructions];
                          arr[i] = e.target.value;
                          updateField('checkout', 'deliveryInstructions', arr);
                        }} />
                        <Button variant="ghost" size="icon" onClick={() => {
                          const arr = [...config.checkout.deliveryInstructions];
                          arr.splice(i, 1);
                          updateField('checkout', 'deliveryInstructions', arr);
                        }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => {
                      updateField('checkout', 'deliveryInstructions', [...(config.checkout.deliveryInstructions || []), '']);
                    }}>
                      <Plus className="w-3 h-3 mr-1" /> Add Instruction
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Available payment methods for customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(config.paymentMethods || []).map((pm, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{pm.key}</TableCell>
                          <TableCell>
                            <Input value={pm.label} className="h-8" onChange={e => {
                              const pms = [...config.paymentMethods];
                              pms[i] = { ...pms[i], label: e.target.value };
                              setConfig({ ...config, paymentMethods: pms });
                              setDirty(true);
                            }} />
                          </TableCell>
                          <TableCell>
                            <Input value={pm.description} className="h-8" onChange={e => {
                              const pms = [...config.paymentMethods];
                              pms[i] = { ...pms[i], description: e.target.value };
                              setConfig({ ...config, paymentMethods: pms });
                              setDirty(true);
                            }} />
                          </TableCell>
                          <TableCell>
                            <Switch checked={pm.isActive} onCheckedChange={v => {
                              const pms = [...config.paymentMethods];
                              pms[i] = { ...pms[i], isActive: v };
                              setConfig({ ...config, paymentMethods: pms });
                              setDirty(true);
                            }} />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => {
                              const pms = [...config.paymentMethods];
                              pms.splice(i, 1);
                              setConfig({ ...config, paymentMethods: pms });
                              setDirty(true);
                            }}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => {
                    const key = prompt('Payment method key (e.g. "netbanking"):');
                    if (!key) return;
                    setConfig({
                      ...config,
                      paymentMethods: [...(config.paymentMethods || []), { key, label: key, description: '', icon: '', isActive: true, order: (config.paymentMethods?.length || 0) }],
                    });
                    setDirty(true);
                  }}>
                    <Plus className="w-3 h-3 mr-1" /> Add Payment Method
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Empty Cart Messaging</CardTitle>
                  <CardDescription>Messages shown when the cart is empty</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input value={config.checkout.emptyCartTitle} onChange={e => updateField('checkout', 'emptyCartTitle', e.target.value)} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={config.checkout.emptyCartDescription} onChange={e => updateField('checkout', 'emptyCartDescription', e.target.value)} />
                  </div>
                  <div>
                    <Label>CTA Button Text</Label>
                    <Input value={config.checkout.emptyCartCta} onChange={e => updateField('checkout', 'emptyCartCta', e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Feature Flags */}
          {activeTab === 'features' && (
            <Card>
              <CardHeader>
                <CardTitle>Feature Flags</CardTitle>
                <CardDescription>Toggle features on/off in the customer app</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { key: 'showSkipButtonOnLogin', label: 'Show Skip Button on Login', desc: 'Allow users to skip login and browse as guest' },
                    { key: 'enableReferral', label: 'Referral Program', desc: 'Enable refer-a-friend feature' },
                    { key: 'enableWallet', label: 'Wallet', desc: 'Enable in-app wallet for payments' },
                    { key: 'enableChat', label: 'Live Chat', desc: 'Enable live chat with support' },
                    { key: 'enableRatings', label: 'Ratings & Reviews', desc: 'Allow customers to rate orders' },
                    { key: 'enableCoupons', label: 'Coupons', desc: 'Enable coupon code functionality' },
                    { key: 'enableNotifications', label: 'Push Notifications', desc: 'Enable push notification features' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={(config.featureFlags as any)[key]}
                        onCheckedChange={v => updateField('featureFlags', key, v)}
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">Max Cart Items</p>
                      <p className="text-xs text-muted-foreground">Maximum items allowed in cart</p>
                    </div>
                    <Input
                      type="number"
                      className="w-24 h-8"
                      value={config.featureFlags.maxCartItems}
                      onChange={e => updateField('featureFlags', 'maxCartItems', Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* App Version & Maintenance */}
          {activeTab === 'version' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>App Version Control</CardTitle>
                  <CardDescription>Manage app version and force update settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Current Version</Label>
                      <Input value={config.appVersion.currentVersion} onChange={e => updateField('appVersion', 'currentVersion', e.target.value)} />
                    </div>
                    <div>
                      <Label>Minimum Version</Label>
                      <Input value={config.appVersion.minVersion} onChange={e => updateField('appVersion', 'minVersion', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label>Update Message</Label>
                      <Textarea value={config.appVersion.updateMessage} onChange={e => updateField('appVersion', 'updateMessage', e.target.value)} />
                    </div>
                    <div>
                      <Label>Update URL</Label>
                      <Input value={config.appVersion.updateUrl} onChange={e => updateField('appVersion', 'updateUrl', e.target.value)} placeholder="https://play.google.com/..." />
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={config.appVersion.forceUpdate} onCheckedChange={v => updateField('appVersion', 'forceUpdate', v)} />
                      <div>
                        <p className="text-sm font-medium">Force Update</p>
                        <p className="text-xs text-muted-foreground">Block app usage until updated</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={config.maintenance.isActive ? 'border-destructive' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    Maintenance Mode
                    {config.maintenance.isActive && <Badge variant="destructive">ACTIVE</Badge>}
                  </CardTitle>
                  <CardDescription>
                    When enabled, the app shows a maintenance screen to all users
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={config.maintenance.isActive} onCheckedChange={v => updateField('maintenance', 'isActive', v)} />
                    <p className="text-sm font-medium">{config.maintenance.isActive ? 'Maintenance mode is ON' : 'Maintenance mode is OFF'}</p>
                  </div>
                  <div>
                    <Label>Maintenance Message</Label>
                    <Textarea value={config.maintenance.message} onChange={e => updateField('maintenance', 'message', e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Support Categories */}
          {activeTab === 'support' && (
            <Card>
              <CardHeader>
                <CardTitle>Support Categories</CardTitle>
                <CardDescription>Help categories shown in the customer support screen</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Icon</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(config.supportCategories || []).map((cat, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Input value={cat.label} className="h-8" onChange={e => {
                            const cats = [...config.supportCategories];
                            cats[i] = { ...cats[i], label: e.target.value };
                            setConfig({ ...config, supportCategories: cats });
                            setDirty(true);
                          }} />
                        </TableCell>
                        <TableCell>
                          <Input value={cat.description} className="h-8" onChange={e => {
                            const cats = [...config.supportCategories];
                            cats[i] = { ...cats[i], description: e.target.value };
                            setConfig({ ...config, supportCategories: cats });
                            setDirty(true);
                          }} />
                        </TableCell>
                        <TableCell>
                          <Input value={cat.icon} className="h-8 w-28" onChange={e => {
                            const cats = [...config.supportCategories];
                            cats[i] = { ...cats[i], icon: e.target.value };
                            setConfig({ ...config, supportCategories: cats });
                            setDirty(true);
                          }} />
                        </TableCell>
                        <TableCell>
                          <Switch checked={cat.isActive} onCheckedChange={v => {
                            const cats = [...config.supportCategories];
                            cats[i] = { ...cats[i], isActive: v };
                            setConfig({ ...config, supportCategories: cats });
                            setDirty(true);
                          }} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => {
                            const cats = [...config.supportCategories];
                            cats.splice(i, 1);
                            setConfig({ ...config, supportCategories: cats });
                            setDirty(true);
                          }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => {
                  setConfig({
                    ...config,
                    supportCategories: [...(config.supportCategories || []), { key: `cat_${Date.now()}`, label: '', description: '', icon: '', isActive: true, order: config.supportCategories?.length || 0 }],
                  });
                  setDirty(true);
                }}>
                  <Plus className="w-3 h-3 mr-1" /> Add Category
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          {activeTab === 'search' && (
            <Card>
              <CardHeader>
                <CardTitle>Search Configuration</CardTitle>
                <CardDescription>Configure search bar and suggestions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Search Placeholder</Label>
                  <Input value={config.search.placeholder} onChange={e => updateField('search', 'placeholder', e.target.value)} />
                </div>
                <div>
                  <Label>Empty State Title</Label>
                  <Input value={config.search.emptyStateTitle} onChange={e => updateField('search', 'emptyStateTitle', e.target.value)} />
                </div>
                <div>
                  <Label>Empty State Subtitle</Label>
                  <Input value={config.search.emptyStateSubtitle} onChange={e => updateField('search', 'emptyStateSubtitle', e.target.value)} />
                </div>
                <div>
                  <Label>Popular Searches</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(config.search.popularSearches || []).map((s, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 px-3 py-1.5">
                        {s}
                        <button onClick={() => {
                          const arr = [...config.search.popularSearches];
                          arr.splice(i, 1);
                          updateField('search', 'popularSearches', arr);
                        }}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => {
                      const val = prompt('Enter popular search term:');
                      if (val) updateField('search', 'popularSearches', [...(config.search.popularSearches || []), val]);
                    }}>
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Channels</CardTitle>
                <CardDescription>Configure available notification channels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(config.notifications?.channelsAvailable || []).map((ch, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex-1">
                        <Input value={ch.label} className="h-8 mb-1" onChange={e => {
                          const chs = [...config.notifications.channelsAvailable];
                          chs[i] = { ...chs[i], label: e.target.value };
                          setConfig({ ...config, notifications: { ...config.notifications, channelsAvailable: chs } });
                          setDirty(true);
                        }} />
                        <Input value={ch.description} className="h-7 text-xs" placeholder="Description" onChange={e => {
                          const chs = [...config.notifications.channelsAvailable];
                          chs[i] = { ...chs[i], description: e.target.value };
                          setConfig({ ...config, notifications: { ...config.notifications, channelsAvailable: chs } });
                          setDirty(true);
                        }} />
                      </div>
                      <Switch checked={ch.isActive} onCheckedChange={v => {
                        const chs = [...config.notifications.channelsAvailable];
                        chs[i] = { ...chs[i], isActive: v };
                        setConfig({ ...config, notifications: { ...config.notifications, channelsAvailable: chs } });
                        setDirty(true);
                      }} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div>
                    <Label>DND Start Hour (0-23)</Label>
                    <Input type="number" min={0} max={23} value={config.notifications?.dndStartHour ?? 22} onChange={e => {
                      setConfig({ ...config, notifications: { ...config.notifications, dndStartHour: Number(e.target.value) } });
                      setDirty(true);
                    }} />
                  </div>
                  <div>
                    <Label>DND End Hour (0-23)</Label>
                    <Input type="number" min={0} max={23} value={config.notifications?.dndEndHour ?? 7} onChange={e => {
                      setConfig({ ...config, notifications: { ...config.notifications, dndEndHour: Number(e.target.value) } });
                      setDirty(true);
                    }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Coupons */}
          {activeTab === 'coupons' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Coupon Management</CardTitle>
                  <CardDescription>Create and manage discount coupons</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadCoupons}>
                    <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                  </Button>
                  <Button size="sm" onClick={() => { setEditingCoupon({ discountType: 'percent', isActive: true }); setCouponDialog(true); }}>
                    <Plus className="w-4 h-4 mr-1" /> New Coupon
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {couponLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : coupons.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No coupons yet. Create your first coupon.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Min Order</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Uses</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coupons.map(c => (
                        <TableRow key={c._id}>
                          <TableCell className="font-mono font-bold">{c.code}</TableCell>
                          <TableCell>{c.discountType === 'percent' ? `${c.discountValue}%` : `₹${c.discountValue}`}</TableCell>
                          <TableCell>₹{c.minOrderAmount}</TableCell>
                          <TableCell>{c.validTo ? new Date(c.validTo).toLocaleDateString() : '—'}</TableCell>
                          <TableCell>{c.usageCount}{c.usageLimit ? `/${c.usageLimit}` : ''}</TableCell>
                          <TableCell>
                            <Badge variant={c.isActive ? 'default' : 'secondary'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingCoupon(c); setCouponDialog(true); }}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteCoupon(c._id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Legal */}
          {activeTab === 'legal' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Legal Documents</CardTitle>
                  <CardDescription>Manage Terms of Service and Privacy Policy</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadLegal}>
                    <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                  </Button>
                  <Button size="sm" onClick={() => { setEditingLegal({ type: 'terms', contentFormat: 'plain', isCurrent: true }); setLegalDialog(true); }}>
                    <Plus className="w-4 h-4 mr-1" /> New Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {legalLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : legalDocs.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No legal documents yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {legalDocs.map(d => (
                        <TableRow key={d._id}>
                          <TableCell><Badge variant="outline">{d.type}</Badge></TableCell>
                          <TableCell className="font-medium">{d.title}</TableCell>
                          <TableCell>{d.version}</TableCell>
                          <TableCell>{d.contentFormat}</TableCell>
                          <TableCell>{d.isCurrent ? <Badge>Current</Badge> : <Badge variant="secondary">Archived</Badge>}</TableCell>
                          <TableCell>{d.lastUpdated ? new Date(d.lastUpdated).toLocaleDateString() : '—'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingLegal(d); setLegalDialog(true); }}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteLegal(d._id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cancellation */}
          {activeTab === 'cancellation' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Cancellation Policies</CardTitle>
                  <CardDescription>Manage order cancellation rules</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadCancelPolicies}>
                    <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                  </Button>
                  <Button size="sm" onClick={() => { setEditingCancel({ name: '', isActive: true, allowedStatuses: ['pending', 'confirmed'], freeWindowMinutes: 2, cancellationFeePercent: 0, maxCancellationsPerDay: 3, customerCanCancel: true, supportCanCancel: true, autoRefundOnCancel: true, refundMethod: 'original_payment', appliesTo: 'all' }); setCancelDialog(true); }}>
                    <Plus className="w-4 h-4 mr-1" /> New Policy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {cancelLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : cancelPolicies.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No cancellation policies yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Statuses</TableHead>
                        <TableHead>Free Window</TableHead>
                        <TableHead>Fee %</TableHead>
                        <TableHead>Refund</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cancelPolicies.map(p => (
                        <TableRow key={p._id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{(p.allowedStatuses || []).join(', ')}</TableCell>
                          <TableCell>{p.freeWindowMinutes}m</TableCell>
                          <TableCell>{p.cancellationFeePercent}%</TableCell>
                          <TableCell>{p.autoRefundOnCancel ? 'Auto' : 'Manual'}</TableCell>
                          <TableCell><Badge variant={p.isActive ? 'default' : 'secondary'}>{p.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingCancel(p); setCancelDialog(true); }}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteCancel(p._id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ─── Coupon Dialog ────────────────────────────── */}
      <Dialog open={couponDialog} onOpenChange={setCouponDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCoupon?._id ? 'Edit Coupon' : 'New Coupon'}</DialogTitle>
          </DialogHeader>
          {editingCoupon && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Code</Label>
                  <Input value={editingCoupon.code || ''} onChange={e => setEditingCoupon({ ...editingCoupon, code: e.target.value })} placeholder="E.g. SAVE20" />
                </div>
                <div>
                  <Label>Discount Type</Label>
                  <Select value={editingCoupon.discountType || 'percent'} onValueChange={v => setEditingCoupon({ ...editingCoupon, discountType: v as 'percent' | 'fixed' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Discount Value</Label>
                  <Input type="number" value={editingCoupon.discountValue ?? ''} onChange={e => setEditingCoupon({ ...editingCoupon, discountValue: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Min Order (₹)</Label>
                  <Input type="number" value={editingCoupon.minOrderAmount ?? 0} onChange={e => setEditingCoupon({ ...editingCoupon, minOrderAmount: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Max Discount (₹)</Label>
                  <Input type="number" value={editingCoupon.maxDiscountAmount ?? ''} onChange={e => setEditingCoupon({ ...editingCoupon, maxDiscountAmount: e.target.value ? Number(e.target.value) : null })} placeholder="No limit" />
                </div>
                <div>
                  <Label>Usage Limit</Label>
                  <Input type="number" value={editingCoupon.usageLimit ?? ''} onChange={e => setEditingCoupon({ ...editingCoupon, usageLimit: e.target.value ? Number(e.target.value) : null })} placeholder="Unlimited" />
                </div>
                <div>
                  <Label>Valid From</Label>
                  <Input type="date" value={editingCoupon.validFrom ? new Date(editingCoupon.validFrom).toISOString().split('T')[0] : ''} onChange={e => setEditingCoupon({ ...editingCoupon, validFrom: e.target.value || null })} />
                </div>
                <div>
                  <Label>Valid Until</Label>
                  <Input type="date" value={editingCoupon.validTo ? new Date(editingCoupon.validTo).toISOString().split('T')[0] : ''} onChange={e => setEditingCoupon({ ...editingCoupon, validTo: e.target.value || null })} />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editingCoupon.description || ''} onChange={e => setEditingCoupon({ ...editingCoupon, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingCoupon.isActive !== false} onCheckedChange={v => setEditingCoupon({ ...editingCoupon, isActive: v })} />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCouponDialog(false)}>Cancel</Button>
            <Button onClick={saveCoupon}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Legal Dialog ─────────────────────────────── */}
      <Dialog open={legalDialog} onOpenChange={setLegalDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLegal?._id ? 'Edit Document' : 'New Document'}</DialogTitle>
          </DialogHeader>
          {editingLegal && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={editingLegal.type || 'terms'} onValueChange={v => setEditingLegal({ ...editingLegal, type: v as 'terms' | 'privacy' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="terms">Terms of Service</SelectItem>
                      <SelectItem value="privacy">Privacy Policy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Version</Label>
                  <Input value={editingLegal.version || ''} onChange={e => setEditingLegal({ ...editingLegal, version: e.target.value })} placeholder="e.g. 1.0" />
                </div>
                <div>
                  <Label>Format</Label>
                  <Select value={editingLegal.contentFormat || 'plain'} onValueChange={v => setEditingLegal({ ...editingLegal, contentFormat: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plain">Plain Text</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="markdown">Markdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Title</Label>
                <Input value={editingLegal.title || ''} onChange={e => setEditingLegal({ ...editingLegal, title: e.target.value })} />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea rows={12} value={editingLegal.content || ''} onChange={e => setEditingLegal({ ...editingLegal, content: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingLegal.isCurrent !== false} onCheckedChange={v => setEditingLegal({ ...editingLegal, isCurrent: v })} />
                <Label>Set as Current Version</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLegalDialog(false)}>Cancel</Button>
            <Button onClick={saveLegal}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Cancellation Dialog ──────────────────────── */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCancel?._id ? 'Edit Policy' : 'New Cancellation Policy'}</DialogTitle>
          </DialogHeader>
          {editingCancel && (
            <div className="space-y-4">
              <div>
                <Label>Policy Name</Label>
                <Input value={editingCancel.name || ''} onChange={e => setEditingCancel({ ...editingCancel, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Free Window (minutes)</Label>
                  <Input type="number" value={editingCancel.freeWindowMinutes ?? 2} onChange={e => setEditingCancel({ ...editingCancel, freeWindowMinutes: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Cancellation Fee (%)</Label>
                  <Input type="number" value={editingCancel.cancellationFeePercent ?? 0} onChange={e => setEditingCancel({ ...editingCancel, cancellationFeePercent: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Max Cancellations/Day</Label>
                  <Input type="number" value={editingCancel.maxCancellationsPerDay ?? 3} onChange={e => setEditingCancel({ ...editingCancel, maxCancellationsPerDay: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Refund Method</Label>
                  <Select value={editingCancel.refundMethod || 'original_payment'} onValueChange={v => setEditingCancel({ ...editingCancel, refundMethod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="original_payment">Original Payment</SelectItem>
                      <SelectItem value="wallet">Wallet</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Applies To</Label>
                  <Select value={editingCancel.appliesTo || 'all'} onValueChange={v => setEditingCancel({ ...editingCancel, appliesTo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      <SelectItem value="cod">COD Only</SelectItem>
                      <SelectItem value="online">Online Only</SelectItem>
                      <SelectItem value="wallet">Wallet Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch checked={editingCancel.customerCanCancel !== false} onCheckedChange={v => setEditingCancel({ ...editingCancel, customerCanCancel: v })} />
                  <Label>Customer Can Cancel</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editingCancel.autoRefundOnCancel !== false} onCheckedChange={v => setEditingCancel({ ...editingCancel, autoRefundOnCancel: v })} />
                  <Label>Auto Refund on Cancel</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editingCancel.isActive !== false} onCheckedChange={v => setEditingCancel({ ...editingCancel, isActive: v })} />
                  <Label>Active</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>Cancel</Button>
            <Button onClick={saveCancel}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
