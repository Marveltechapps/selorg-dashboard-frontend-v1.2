import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { BreadcrumbSegment } from '@/components/AdminManagement';
import {
  Search,
  Users,
  UserPlus,
  Activity,
  ShieldBan,
  ShieldCheck,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  LogIn,
  Hash,
  Clock,
  Copy,
  ShoppingCart,
  RotateCcw,
  Headphones,
  ShieldAlert,
  Wallet,
  Plus,
  KeyRound,
  EyeOff,
  Lock,
  MapPin,
  CreditCard,
  Navigation,
  Tag,
  Store,
  Truck,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/api/apiClient';
import {
  type Customer,
  type CustomerStatus,
  type CustomerStats,
  type CustomerListParams,
  type PasswordInfo,
  type CustomerAddress,
  type CustomerPaymentMethod,
  fetchCustomers,
  fetchCustomerStats,
  fetchCustomerById,
  updateCustomer,
  fetchPasswordInfo,
  resetCustomerPassword,
  setCustomerPassword,
  fetchCustomerAddresses,
  fetchCustomerPaymentMethods,
} from './customerManagementApi';

const STATUS_CONFIG: Record<CustomerStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  active: { label: 'Active', variant: 'default', className: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  inactive: { label: 'Inactive', variant: 'secondary', className: 'bg-gray-400 hover:bg-gray-500 text-white' },
  blocked: { label: 'Blocked', variant: 'destructive', className: 'bg-rose-500 hover:bg-rose-600 text-white' },
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Never';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Never';
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

function truncateId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}

function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

interface CustomerManagementProps {
  onBreadcrumbChange?: (segments: BreadcrumbSegment[] | null) => void;
}

export function CustomerManagement({ onBreadcrumbChange }: CustomerManagementProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [params, setParams] = useState<CustomerListParams>({
    page: 1,
    limit: 20,
    search: '',
    status: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    customerId: string;
    customerName: string;
    action: 'block' | 'unblock';
  }>({ open: false, customerId: '', customerName: '', action: 'block' });
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listData, statsData] = await Promise.all([
        fetchCustomers(params),
        fetchCustomerStats(),
      ]);
      setCustomers(listData.customers);
      setTotal(listData.total);
      setTotalPages(listData.totalPages);
      setStats(statsData);
    } catch (err: any) {
      const msg = err?.message || 'Failed to load customer data';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParams(prev => ({ ...prev, page: 1, search: searchInput || undefined }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleStatusFilter = (val: string) => {
    setParams(prev => ({
      ...prev,
      page: 1,
      status: val === 'all' ? undefined : val as CustomerStatus,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setParams(prev => ({ ...prev, page: newPage }));
  };

  const goBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedCustomer(null);
    onBreadcrumbChange?.(null);
  }, [onBreadcrumbChange]);

  const updateDetailBreadcrumb = useCallback((customer: Customer) => {
    const label = customer.name || customer.phoneNumber || 'Customer';
    onBreadcrumbChange?.([
      { label: 'Admin' },
      { label: 'Customers', onClick: goBackToList },
      { label: label },
    ]);
  }, [onBreadcrumbChange, goBackToList]);

  const handleViewCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewMode('detail');
    updateDetailBreadcrumb(customer);
    setDetailLoading(true);
    try {
      const full = await fetchCustomerById(customer._id);
      setSelectedCustomer(full);
      updateDetailBreadcrumb(full);
    } catch {
      // keep the basic customer data from the list row
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!selectedCustomer) return;
    setDetailLoading(true);
    try {
      const full = await fetchCustomerById(selectedCustomer._id);
      setSelectedCustomer(full);
    } catch {
      // keep existing data on failure
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBlockUnblock = (customer: Customer) => {
    setConfirmDialog({
      open: true,
      customerId: customer._id,
      customerName: customer.name || customer.phoneNumber,
      action: customer.status === 'blocked' ? 'unblock' : 'block',
    });
  };

  const confirmAction = async () => {
    setActionLoading(true);
    try {
      const newStatus: CustomerStatus = confirmDialog.action === 'block' ? 'blocked' : 'active';
      await updateCustomer(confirmDialog.customerId, { status: newStatus });
      toast.success(
        confirmDialog.action === 'block'
          ? `Customer ${confirmDialog.customerName} has been blocked`
          : `Customer ${confirmDialog.customerName} has been unblocked`
      );
      setConfirmDialog({ open: false, customerId: '', customerName: '', action: 'block' });
      if (viewMode === 'detail' && selectedCustomer?._id === confirmDialog.customerId) {
        setSelectedCustomer(prev => prev ? { ...prev, status: newStatus } : prev);
      }
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update customer status');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied to clipboard'),
      () => toast.error('Failed to copy')
    );
  };

  if (error && customers.length === 0 && viewMode === 'list') {
    return (
      <div className="space-y-6 w-full min-w-0 max-w-full">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="mx-auto mb-4 text-red-600" size={48} />
          <h2 className="text-xl font-bold text-red-900 mb-2">Failed to Load Customer Management</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={loadData} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Tab data state for customer detail
  const [detailTab, setDetailTab] = useState('profile');
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [customerRefunds, setCustomerRefunds] = useState<any[]>([]);
  const [customerTickets, setCustomerTickets] = useState<any[]>([]);
  const [customerRisk, setCustomerRisk] = useState<any>(null);
  const [customerWallet, setCustomerWallet] = useState<any>(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [walletCreditOpen, setWalletCreditOpen] = useState(false);
  const [walletCreditAmount, setWalletCreditAmount] = useState('');
  const [walletCreditReason, setWalletCreditReason] = useState('');
  const [walletCreditLoading, setWalletCreditLoading] = useState(false);
  const [passwordInfo, setPasswordInfo] = useState<PasswordInfo | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showAutoPassword, setShowAutoPassword] = useState(false);
  const [setPasswordOpen, setSetPasswordOpen] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState<string | null>(null);
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);
  const [customerPaymentMethods, setCustomerPaymentMethods] = useState<CustomerPaymentMethod[]>([]);

  const loadTabData = useCallback(async (tab: string) => {
    if (!selectedCustomer) return;
    setTabLoading(true);
    try {
      if (tab === 'orders') {
        const res = await apiRequest<{ success: boolean; data: any }>(`/admin/customers/${selectedCustomer._id}/orders`);
        setCustomerOrders(res.data?.orders || res.data || []);
      } else if (tab === 'refunds') {
        const res = await apiRequest<{ success: boolean; data: any }>(`/admin/customers/${selectedCustomer._id}/refunds`);
        setCustomerRefunds(res.data?.refunds || res.data || []);
      } else if (tab === 'support') {
        const res = await apiRequest<{ success: boolean; data: any }>(`/admin/customers/${selectedCustomer._id}/tickets`);
        setCustomerTickets(res.data?.tickets || res.data || []);
      } else if (tab === 'risk') {
        const res = await apiRequest<{ success: boolean; data: any }>(`/admin/customers/${selectedCustomer._id}/risk-profile`);
        setCustomerRisk(res.data || null);
      } else if (tab === 'profile') {
        const results = await Promise.allSettled([
          apiRequest<{ success: boolean; data: any }>(`/admin/customers/${selectedCustomer._id}/wallet`),
          fetchCustomerAddresses(selectedCustomer._id),
          fetchCustomerPaymentMethods(selectedCustomer._id),
        ]);
        setCustomerWallet(results[0].status === 'fulfilled' ? results[0].value.data : null);
        setCustomerAddresses(results[1].status === 'fulfilled' ? results[1].value.addresses : []);
        setCustomerPaymentMethods(results[2].status === 'fulfilled' ? results[2].value.paymentMethods : []);
      }
    } catch {
      // silent - show empty state
    } finally {
      setTabLoading(false);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (viewMode === 'detail' && selectedCustomer) {
      loadTabData(detailTab);
    }
  }, [detailTab, viewMode, selectedCustomer, loadTabData]);

  const handleCreditWallet = async () => {
    if (!selectedCustomer || !walletCreditAmount) return;
    setWalletCreditLoading(true);
    try {
      await apiRequest(`/admin/customers/${selectedCustomer._id}/wallet/credit`, {
        method: 'POST',
        body: JSON.stringify({ amount: parseFloat(walletCreditAmount), reason: walletCreditReason }),
      });
      toast.success('Wallet credited successfully');
      setWalletCreditOpen(false);
      setWalletCreditAmount('');
      setWalletCreditReason('');
      loadTabData('profile');
    } catch (err: any) {
      toast.error(err.message || 'Failed to credit wallet');
    } finally {
      setWalletCreditLoading(false);
    }
  };

  const loadPasswordInfo = useCallback(async () => {
    if (!selectedCustomer) return;
    setPasswordLoading(true);
    try {
      const info = await fetchPasswordInfo(selectedCustomer._id);
      setPasswordInfo(info);
    } catch {
      setPasswordInfo(null);
    } finally {
      setPasswordLoading(false);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (viewMode === 'detail' && selectedCustomer && detailTab === 'profile') {
      loadPasswordInfo();
    }
  }, [viewMode, selectedCustomer, detailTab, loadPasswordInfo]);

  const handleResetPassword = async () => {
    if (!selectedCustomer) return;
    setPasswordLoading(true);
    setResetPasswordResult(null);
    try {
      const result = await resetCustomerPassword(selectedCustomer._id);
      setResetPasswordResult(result.newPassword);
      toast.success('Password has been reset');
      loadPasswordInfo();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!selectedCustomer || !newPasswordInput) return;
    if (newPasswordInput.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsSettingPassword(true);
    try {
      await setCustomerPassword(selectedCustomer._id, newPasswordInput);
      toast.success('Password has been set');
      setSetPasswordOpen(false);
      setNewPasswordInput('');
      loadPasswordInfo();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to set password');
    } finally {
      setIsSettingPassword(false);
    }
  };

  const renderDetailView = () => {
    if (!selectedCustomer) return null;
    const cfg = STATUS_CONFIG[selectedCustomer.status] || STATUS_CONFIG.active;
    const customerLabel = selectedCustomer.name || selectedCustomer.phoneNumber || 'Customer';

    return (
      <>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#1F2937] tracking-tight">Customer Details</h1>
            <p className="text-[#6B7280] mt-1">Viewing profile for {customerLabel}</p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshDetail} disabled={detailLoading}>
            <RefreshCw size={16} className={`mr-2 ${detailLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                {customerLabel.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-[#1F2937]">
                  {selectedCustomer.name || 'Unnamed Customer'}
                </h2>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <Badge className={cfg.className}>{cfg.label}</Badge>
                  <span className="flex items-center gap-1.5 text-sm text-[#6B7280]">
                    <Phone size={14} />
                    {selectedCustomer.phoneNumber}
                  </span>
                  {selectedCustomer.email && !selectedCustomer.email.includes('no-email') && (
                    <span className="flex items-center gap-1.5 text-sm text-[#6B7280]">
                      <Mail size={14} />
                      {selectedCustomer.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                {selectedCustomer.status === 'blocked' ? (
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleBlockUnblock(selectedCustomer)}>
                    <ShieldCheck size={16} className="mr-2" /> Unblock Customer
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={() => handleBlockUnblock(selectedCustomer)}>
                    <ShieldBan size={16} className="mr-2" /> Block Customer
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={detailTab} onValueChange={setDetailTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingCart size={14} className="mr-1" /> Orders</TabsTrigger>
            <TabsTrigger value="refunds"><RotateCcw size={14} className="mr-1" /> Refunds</TabsTrigger>
            <TabsTrigger value="support"><Headphones size={14} className="mr-1" /> Support</TabsTrigger>
            <TabsTrigger value="risk"><ShieldAlert size={14} className="mr-1" /> Risk</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Wallet Section (P1-74) */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[#374151] uppercase tracking-wider flex items-center gap-2">
                    <Wallet size={16} /> Wallet
                  </h3>
                  <Button size="sm" onClick={() => setWalletCreditOpen(true)}>
                    <Plus size={14} className="mr-1" /> Credit Wallet
                  </Button>
                </div>
                <div className="flex items-center gap-6 mb-4">
                  <div className="bg-emerald-50 rounded-lg p-4 flex-1">
                    <p className="text-xs text-[#6B7280]">Balance</p>
                    <p className="text-2xl font-bold text-emerald-700">₹{(customerWallet?.balance ?? 0).toFixed(2)}</p>
                  </div>
                </div>
                {customerWallet?.recentTransactions && customerWallet.recentTransactions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#6B7280] mb-2">Recent Transactions</p>
                    <div className="space-y-2">
                      {customerWallet.recentTransactions.slice(0, 5).map((txn: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm p-2 bg-[#F9FAFB] rounded">
                          <div>
                            <span className={`font-medium ${txn.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {txn.type === 'credit' ? '+' : '-'}₹{(txn.amount || 0).toFixed(2)}
                            </span>
                            <span className="text-xs text-[#9CA3AF] ml-2">{txn.reason || txn.reference || ''}</span>
                          </div>
                          <span className="text-xs text-[#9CA3AF]">{txn.createdAt ? new Date(txn.createdAt).toLocaleDateString() : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Password Management Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[#374151] uppercase tracking-wider flex items-center gap-2">
                    <KeyRound size={16} /> Password Management
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handleResetPassword} disabled={passwordLoading}>
                      <RefreshCw size={14} className={`mr-1 ${passwordLoading ? 'animate-spin' : ''}`} /> Reset Password
                    </Button>
                    <Button size="sm" onClick={() => { setSetPasswordOpen(true); setNewPasswordInput(''); }}>
                      <Lock size={14} className="mr-1" /> Set Password
                    </Button>
                  </div>
                </div>

                {passwordLoading && !passwordInfo ? (
                  <div className="text-sm text-[#6B7280] py-4 text-center">Loading password info...</div>
                ) : passwordInfo ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-[#F9FAFB] rounded-lg p-3">
                        <p className="text-xs text-[#6B7280]">Status</p>
                        <p className="text-sm font-semibold mt-0.5">
                          {passwordInfo.hasPassword ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Password Set</Badge>
                          ) : (
                            <Badge className="bg-gray-400 hover:bg-gray-500 text-white">No Password</Badge>
                          )}
                        </p>
                      </div>
                      <div className="bg-[#F9FAFB] rounded-lg p-3">
                        <p className="text-xs text-[#6B7280]">Type</p>
                        <p className="text-sm font-semibold mt-0.5">
                          {passwordInfo.isAutoGenerated ? (
                            <Badge variant="outline" className="text-amber-700 border-amber-300">Auto-Generated</Badge>
                          ) : passwordInfo.hasPassword ? (
                            <Badge variant="outline" className="text-blue-700 border-blue-300">Manually Set</Badge>
                          ) : (
                            <span className="text-[#9CA3AF]">N/A</span>
                          )}
                        </p>
                      </div>
                      <div className="bg-[#F9FAFB] rounded-lg p-3">
                        <p className="text-xs text-[#6B7280]">Last Changed</p>
                        <p className="text-sm font-medium mt-0.5">{formatDateTime(passwordInfo.passwordLastChangedAt ?? undefined)}</p>
                      </div>
                      <div className="bg-[#F9FAFB] rounded-lg p-3">
                        <p className="text-xs text-[#6B7280]">Changed By</p>
                        <p className="text-sm font-medium mt-0.5 capitalize">{passwordInfo.passwordLastChangedBy || '—'}</p>
                      </div>
                    </div>

                    {passwordInfo.autoGeneratedPassword && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-amber-800 mb-1">Auto-Generated Password</p>
                            <code className="font-mono text-sm bg-white px-2 py-1 rounded border border-amber-200">
                              {showAutoPassword ? passwordInfo.autoGeneratedPassword : '••••••••'}
                            </code>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowAutoPassword(!showAutoPassword)}
                              title={showAutoPassword ? 'Hide password' : 'Show password'}
                            >
                              {showAutoPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(passwordInfo.autoGeneratedPassword!)}
                              title="Copy password"
                            >
                              <Copy size={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {resetPasswordResult && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-emerald-800 mb-1">New Password (just generated)</p>
                            <code className="font-mono text-sm bg-white px-2 py-1 rounded border border-emerald-200">
                              {resetPasswordResult}
                            </code>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(resetPasswordResult)}
                            title="Copy password"
                          >
                            <Copy size={16} />
                          </Button>
                        </div>
                        <p className="text-xs text-emerald-700 mt-2">Share this password with the customer securely.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-[#6B7280] py-2">Unable to load password info</div>
                )}
              </CardContent>
            </Card>

            {/* Customer Segmentation & LTV Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#6B7280]">Lifetime Value (LTV)</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        ₹{(customerOrders.reduce((sum: number, o: any) => sum + (o.total || o.totalAmount || 0), 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <TrendingUp size={20} className="text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#6B7280]">Order Frequency</p>
                      <p className="text-2xl font-bold text-[#1F2937]">
                        {customerOrders.length > 0
                          ? `${(customerOrders.length / Math.max(1, Math.ceil(daysSince(selectedCustomer.createdAt) / 30))).toFixed(1)}/mo`
                          : '0/mo'}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <ShoppingCart size={20} className="text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#6B7280]">Segment</p>
                      <p className="text-2xl font-bold text-[#1F2937]">
                        {(() => {
                          const ltv = customerOrders.reduce((sum: number, o: any) => sum + (o.total || o.totalAmount || 0), 0);
                          if (ltv >= 5000) return 'Premium';
                          if (ltv >= 1000) return 'Regular';
                          if (ltv > 0) return 'New';
                          return 'Inactive';
                        })()}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                      <Users size={20} className="text-violet-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-[#6B7280]">Login Count</p><p className="text-2xl font-bold text-[#1F2937]">{selectedCustomer.loginCount ?? 0}</p></div><div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><LogIn size={20} className="text-blue-600" /></div></div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-[#6B7280]">Days Since Registration</p><p className="text-2xl font-bold text-[#1F2937]">{daysSince(selectedCustomer.createdAt)}</p></div><div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center"><Clock size={20} className="text-violet-600" /></div></div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-[#6B7280]">Onboarding</p><p className="text-2xl font-bold text-[#1F2937]">{selectedCustomer.onboardingCompleted ? 'Completed' : 'Incomplete'}</p></div><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedCustomer.onboardingCompleted ? 'bg-emerald-50' : 'bg-amber-50'}`}><Activity size={20} className={selectedCustomer.onboardingCompleted ? 'text-emerald-600' : 'text-amber-600'} /></div></div></CardContent></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardContent className="p-6"><h3 className="text-sm font-semibold text-[#374151] uppercase tracking-wider mb-4">Contact</h3><div className="space-y-3"><div className="flex items-center gap-3"><Phone size={16} className="text-[#9CA3AF]" /><div><p className="text-xs text-[#6B7280]">Phone</p><p className="text-sm font-medium">{selectedCustomer.phoneNumber}</p></div></div><div className="flex items-center gap-3"><Mail size={16} className="text-[#9CA3AF]" /><div><p className="text-xs text-[#6B7280]">Email</p><p className="text-sm font-medium">{selectedCustomer.email && !selectedCustomer.email.includes('no-email') ? selectedCustomer.email : 'Not provided'}</p></div></div></div></CardContent></Card>
              <Card><CardContent className="p-6"><h3 className="text-sm font-semibold text-[#374151] uppercase tracking-wider mb-4">System</h3><div className="space-y-3"><div><p className="text-xs text-[#6B7280]">ID</p><code className="font-mono text-xs bg-[#F9FAFB] px-2 py-1 rounded">{selectedCustomer._id}</code></div><div><p className="text-xs text-[#6B7280]">Registered</p><p className="text-sm font-medium">{formatDateTime(selectedCustomer.createdAt)}</p></div><div><p className="text-xs text-[#6B7280]">Last Login</p><p className="text-sm font-medium">{formatDateTime(selectedCustomer.lastLogin)}</p></div></div></CardContent></Card>
            </div>

            {/* Saved Addresses */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-[#374151] uppercase tracking-wider flex items-center gap-2 mb-4">
                  <MapPin size={16} /> Saved Addresses ({customerAddresses.length})
                </h3>
                {customerAddresses.length === 0 ? (
                  <p className="text-sm text-[#6B7280] py-4 text-center">No saved addresses</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customerAddresses.map((addr) => (
                      <div
                        key={addr._id}
                        className={`border rounded-lg p-4 ${addr.isDefault ? 'border-blue-300 bg-blue-50/50' : 'border-[#E5E7EB] bg-[#F9FAFB]'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Tag size={14} className="text-[#6B7280]" />
                            <span className="text-sm font-semibold text-[#1F2937]">{addr.label}</span>
                          </div>
                          {addr.isDefault && (
                            <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs">Default</Badge>
                          )}
                        </div>
                        <p className="text-sm text-[#374151]">
                          {addr.line1}
                          {addr.line2 ? `, ${addr.line2}` : ''}
                        </p>
                        <p className="text-sm text-[#374151]">
                          {addr.city}
                          {addr.state ? `, ${addr.state}` : ''}
                          {addr.pincode ? ` - ${addr.pincode}` : ''}
                        </p>
                        {(addr.latitude != null && addr.longitude != null) && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-[#6B7280]">
                            <Navigation size={12} />
                            <span>{addr.latitude.toFixed(6)}, {addr.longitude.toFixed(6)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saved Payment Methods */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-[#374151] uppercase tracking-wider flex items-center gap-2 mb-4">
                  <CreditCard size={16} /> Saved Payment Methods ({customerPaymentMethods.length})
                </h3>
                {customerPaymentMethods.length === 0 ? (
                  <p className="text-sm text-[#6B7280] py-4 text-center">No saved payment methods</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customerPaymentMethods.map((pm) => (
                      <div
                        key={pm._id}
                        className={`border rounded-lg p-4 ${pm.isDefault ? 'border-blue-300 bg-blue-50/50' : 'border-[#E5E7EB] bg-[#F9FAFB]'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {pm.type === 'card' ? (
                              <CreditCard size={16} className="text-[#6B7280]" />
                            ) : pm.type === 'upi' ? (
                              <span className="text-xs font-bold text-[#6B7280] border border-[#D1D5DB] rounded px-1">UPI</span>
                            ) : (
                              <Wallet size={16} className="text-[#6B7280]" />
                            )}
                            <span className="text-sm font-semibold text-[#1F2937] capitalize">{pm.type}</span>
                          </div>
                          {pm.isDefault && (
                            <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs">Default</Badge>
                          )}
                        </div>
                        {pm.type === 'card' && (
                          <div className="space-y-1">
                            <p className="text-sm text-[#374151] font-mono">
                              •••• •••• •••• {pm.last4 || '****'}
                            </p>
                            {pm.brand && (
                              <p className="text-xs text-[#6B7280] capitalize">{pm.brand}</p>
                            )}
                            {pm.cardholderName && (
                              <p className="text-xs text-[#6B7280]">{pm.cardholderName}</p>
                            )}
                          </div>
                        )}
                        {pm.type === 'upi' && pm.upiId && (
                          <p className="text-sm text-[#374151]">{pm.upiId}</p>
                        )}
                        {pm.type === 'wallet' && pm.walletName && (
                          <p className="text-sm text-[#374151] capitalize">{pm.walletName}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB]">
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Darkstore</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#6B7280]">Loading orders...</TableCell></TableRow>
                  ) : customerOrders.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#6B7280]">No orders found</TableCell></TableRow>
                  ) : customerOrders.map((order: any) => {
                    const statusColors: Record<string, string> = {
                      pending: 'bg-amber-100 text-amber-800 border-amber-300',
                      confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
                      'getting-packed': 'bg-indigo-100 text-indigo-800 border-indigo-300',
                      'on-the-way': 'bg-violet-100 text-violet-800 border-violet-300',
                      arrived: 'bg-cyan-100 text-cyan-800 border-cyan-300',
                      delivered: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                      cancelled: 'bg-red-100 text-red-800 border-red-300',
                    };
                    const statusClass = statusColors[order.status] || 'bg-gray-100 text-gray-800 border-gray-300';
                    return (
                      <TableRow key={order._id || order.order_id}>
                        <TableCell>
                          <span className="font-mono font-medium text-sm">{order.orderNumber || order.order_id || order.orderId || order._id?.slice(-8)}</span>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(order.createdAt || order.created_at)}</TableCell>
                        <TableCell>
                          {order.storeId ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Store size={14} className="text-[#6B7280]" />
                              <span className="font-mono text-xs" title={String(order.storeId)}>{String(order.storeId).slice(-6)}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-[#9CA3AF]">Unassigned</span>
                          )}
                          {order.riderId && (
                            <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mt-0.5">
                              <Truck size={12} />
                              <span className="font-mono" title={String(order.riderId)}>{String(order.riderId).slice(-6)}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`capitalize text-xs ${statusClass}`}>
                            {(order.status || '—').replace(/-/g, ' ')}
                          </Badge>
                          {order.timeline && order.timeline.length > 0 && (
                            <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                              {timeAgo(order.timeline[order.timeline.length - 1]?.timestamp)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs capitalize">{order.paymentMethod?.methodType || 'cash'}</span>
                          {order.paymentMethod?.last4 && (
                            <span className="text-[10px] text-[#9CA3AF] ml-1">••{order.paymentMethod.last4}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{order.item_count || order.items?.length || '—'}</TableCell>
                        <TableCell className="text-right font-medium">₹{(order.totalBill || order.total || order.totalAmount || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Refunds Tab (P1-16) */}
          <TabsContent value="refunds">
            <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB]">
                    <TableHead>Refund #</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-[#6B7280]">Loading refunds...</TableCell></TableRow>
                  ) : customerRefunds.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-[#6B7280]">No refunds found</TableCell></TableRow>
                  ) : customerRefunds.map((r: any) => (
                    <TableRow key={r._id || r.id}>
                      <TableCell className="font-mono font-medium">{(r._id || r.id || '').slice(-8)}</TableCell>
                      <TableCell className="font-mono text-sm">{r.orderId || '—'}</TableCell>
                      <TableCell className="font-medium">₹{(r.amount || 0).toFixed(2)}</TableCell>
                      <TableCell><Badge variant="outline" className={`capitalize ${r.status === 'approved' ? 'text-green-700' : r.status === 'rejected' ? 'text-red-700' : 'text-amber-700'}`}>{r.status || '—'}</Badge></TableCell>
                      <TableCell className="text-sm capitalize">{(r.reasonCode || r.reason || '—').replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-sm">{formatDate(r.requestedAt || r.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Support Tab (P1-17) */}
          <TabsContent value="support">
            <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB]">
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-[#6B7280]">Loading tickets...</TableCell></TableRow>
                  ) : customerTickets.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-[#6B7280]">No support tickets found</TableCell></TableRow>
                  ) : customerTickets.map((t: any) => (
                    <TableRow key={t._id || t.id}>
                      <TableCell className="font-mono font-medium">{t.ticketNumber || (t._id || t.id || '').slice(-8)}</TableCell>
                      <TableCell className="text-sm font-medium">{t.subject || '—'}</TableCell>
                      <TableCell className="text-sm capitalize">{t.category || '—'}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{(t.status || '—').replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-sm capitalize">{t.channel || '—'}</TableCell>
                      <TableCell className="text-sm">{formatDate(t.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Risk Tab (P1-18) */}
          <TabsContent value="risk">
            {tabLoading ? (
              <div className="text-center py-8 text-[#6B7280]">Loading risk data...</div>
            ) : customerRisk ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">Risk Score</p><p className={`text-2xl font-bold ${(customerRisk.riskScore ?? 0) > 70 ? 'text-red-600' : (customerRisk.riskScore ?? 0) > 40 ? 'text-amber-600' : 'text-emerald-600'}`}>{customerRisk.riskScore ?? 0}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">Refund Rate</p><p className="text-2xl font-bold text-[#1F2937]">{((customerRisk.refundRate ?? 0) * 100).toFixed(1)}%</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">Cancellation Rate</p><p className="text-2xl font-bold text-[#1F2937]">{((customerRisk.cancellationRate ?? 0) * 100).toFixed(1)}%</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">COD Failure Rate</p><p className="text-2xl font-bold text-[#1F2937]">{((customerRisk.codFailureRate ?? 0) * 100).toFixed(1)}%</p></CardContent></Card>
                </div>
                {customerRisk.alerts && customerRisk.alerts.length > 0 && (
                  <Card><CardContent className="p-6"><h3 className="text-sm font-semibold text-[#374151] uppercase tracking-wider mb-4">Active Fraud Alerts</h3><div className="space-y-2">{customerRisk.alerts.map((alert: any, idx: number) => (<div key={idx} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200"><AlertTriangle size={16} className="text-red-500 flex-shrink-0" /><div><p className="text-sm font-medium text-red-800">{alert.type || alert.alertType || 'Alert'}</p><p className="text-xs text-red-600">{alert.description || alert.message || ''}</p></div></div>))}</div></CardContent></Card>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-[#6B7280]">No risk data available</div>
            )}
          </TabsContent>
        </Tabs>

        {/* Wallet Credit Modal */}
        <Dialog open={walletCreditOpen} onOpenChange={setWalletCreditOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Credit Customer Wallet</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><label className="text-sm font-medium text-[#374151]">Amount (₹)</label><Input type="number" value={walletCreditAmount} onChange={e => setWalletCreditAmount(e.target.value)} placeholder="0.00" /></div>
              <div><label className="text-sm font-medium text-[#374151]">Reason</label><Input value={walletCreditReason} onChange={e => setWalletCreditReason(e.target.value)} placeholder="e.g. Goodwill credit" /></div>
              <DialogFooter><Button variant="outline" onClick={() => setWalletCreditOpen(false)}>Cancel</Button><Button onClick={handleCreditWallet} disabled={walletCreditLoading}>{walletCreditLoading ? 'Processing...' : 'Credit Wallet'}</Button></DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Set Password Modal */}
        <Dialog open={setPasswordOpen} onOpenChange={setSetPasswordOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Set Customer Password</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#374151]">New Password</label>
                <Input
                  type="text"
                  value={newPasswordInput}
                  onChange={e => setNewPasswordInput(e.target.value)}
                  placeholder="Enter password (min 6 chars)"
                  minLength={6}
                />
                <p className="text-xs text-[#9CA3AF] mt-1">Minimum 6 characters. This will replace any existing password.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSetPasswordOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleSetPassword}
                  disabled={isSettingPassword || newPasswordInput.length < 6}
                >
                  {isSettingPassword ? 'Setting...' : 'Set Password'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  const renderListView = () => (
    <>
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-[#1F2937] tracking-tight">Customer Management</h1>
          <p className="text-[#6B7280] mt-1">View and manage registered customers</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#6B7280]">Total Customers</p>
                  <p className="text-2xl font-bold text-[#1F2937]">{stats.total.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Users size={20} className="text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#6B7280]">Active</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.active.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Activity size={20} className="text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#6B7280]">New Today</p>
                  <p className="text-2xl font-bold text-[#1F2937]">{stats.newToday.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                  <UserPlus size={20} className="text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#6B7280]">New This Week</p>
                  <p className="text-2xl font-bold text-[#1F2937]">{stats.newThisWeek.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <TrendingUp size={20} className="text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
          <Input
            placeholder="Search by phone, name, or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={params.status || 'all'}
          onValueChange={handleStatusFilter}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F9FAFB]">
              <TableHead>Customer ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Logins</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e11d48] mx-auto mb-3" />
                  <p className="text-[#6B7280]">Loading customers...</p>
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-[#6B7280]">
                  <Users size={40} className="mx-auto mb-3 text-[#D1D5DB]" />
                  <p className="font-medium mb-1">No customers found</p>
                  <p className="text-sm">
                    {params.search || params.status
                      ? 'Try adjusting your filters'
                      : 'Customers will appear here when they register via the app'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => {
                const cfg = STATUS_CONFIG[customer.status] || STATUS_CONFIG.active;
                return (
                  <TableRow key={customer._id} className="hover:bg-[#F9FAFB]">
                    <TableCell>
                      <span className="font-mono text-xs text-[#6B7280]" title={customer._id}>
                        {truncateId(customer._id)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {customer.name || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{customer.phoneNumber}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={cfg.className}>
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(customer.createdAt)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{timeAgo(customer.lastLogin)}</div>
                      {customer.lastLogin && (
                        <div className="text-xs text-[#6B7280]">{formatDate(customer.lastLogin)}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{customer.loginCount ?? 0}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewCustomer(customer)}
                          title="View details"
                        >
                          <Eye size={16} />
                        </Button>
                        {customer.status === 'blocked' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBlockUnblock(customer)}
                            title="Unblock customer"
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            <ShieldCheck size={16} />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBlockUnblock(customer)}
                            title="Block customer"
                            className="text-rose-600 hover:text-rose-700"
                          >
                            <ShieldBan size={16} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-[#6B7280]">
        <div>
          Showing {customers.length} of {total.toLocaleString()} customers
          {totalPages > 1 && ` · Page ${params.page} of ${totalPages}`}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={params.page === 1}
              onClick={() => handlePageChange((params.page ?? 1) - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={params.page === totalPages}
              onClick={() => handlePageChange((params.page ?? 1) + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {viewMode === 'detail' && selectedCustomer ? renderDetailView() : renderListView()}

      {/* Confirmation Dialog (shared between both views) */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => {
        if (!open) setConfirmDialog({ open: false, customerId: '', customerName: '', action: 'block' });
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === 'block' ? 'Block Customer' : 'Unblock Customer'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#6B7280]">
            {confirmDialog.action === 'block'
              ? `Are you sure you want to block "${confirmDialog.customerName}"? They will not be able to access the app.`
              : `Are you sure you want to unblock "${confirmDialog.customerName}"? They will regain app access.`}
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, customerId: '', customerName: '', action: 'block' })}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.action === 'block' ? 'destructive' : 'default'}
              onClick={confirmAction}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : confirmDialog.action === 'block' ? 'Block' : 'Unblock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
