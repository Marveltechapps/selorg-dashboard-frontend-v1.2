import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Coupon,
  PricingStats,
  fetchCoupons,
  fetchPricingStats,
  deleteCoupon,
  updateCouponStatus,
} from './pricingApi';
import { AddCouponModal } from './modals/AddCouponModal';
import { toast } from 'sonner';
import {
  Plus,
  Ticket,
  Edit,
  Trash2,
  MoreVertical,
  Copy,
  Pause,
  Play,
  CheckCircle,
  AlertCircle,
  Clock3,
  Activity,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export function PricingManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<PricingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [addCouponOpen, setAddCouponOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [couponData, statsData] = await Promise.all([
        fetchCoupons(),
        fetchPricingStats(),
      ]);
      setCoupons(couponData);
      setStats(statsData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load pricing data';
      setError(msg);
      toast.error(msg);
      setCoupons([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // Refresh button handler
  const handleRefresh = async () => {
    await loadData();
    toast.success('Data refreshed');
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete coupon "${code}"?`)) return;
    try {
      await deleteCoupon(id);
      toast.success('Coupon deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete coupon');
    }
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    const newStatus = coupon.status === 'active' ? 'paused' : 'active';
    try {
      await updateCouponStatus(coupon.id, newStatus);
      toast.success(`Coupon ${newStatus === 'active' ? 'activated' : 'paused'}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update coupon');
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Coupon code "${code}" copied to clipboard`);
  };

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Coupons</h1>
          <p className="text-[#71717a] text-sm">Manage coupons and customer promo redemption</p>
        </div>
        <Button size="sm" onClick={handleRefresh} variant="outline">
          <RefreshCw size={14} className="mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Statistics Cards - only show when stats loaded (no fake data) */}
      {stats && !error && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-[#71717a] uppercase tracking-wider">Total Coupons</p>
                <p className="text-2xl font-bold text-[#18181b] mt-1">{stats.totalCoupons ?? 0}</p>
                <p className="text-xs text-[#71717a] mt-1">created in system</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Ticket className="text-emerald-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-[#71717a] uppercase tracking-wider">Active Coupons</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.activeCoupons ?? 0}</p>
                <p className="text-xs text-[#71717a] mt-1">{stats.expiringSoonCoupons ?? 0} expiring soon</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-amber-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-[#71717a] uppercase tracking-wider">Total Redemptions</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalRedemptions ?? 0}</p>
                <p className="text-xs text-[#71717a] mt-1">{stats.couponRedemptionRate ?? 0}% redemption rate</p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Activity className="text-purple-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-[#71717a] uppercase tracking-wider">Avg Discount Value</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.avgDiscountValue ?? 0}%</p>
                <p className="text-xs text-[#71717a] mt-1">across all coupons</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Clock3 className="text-blue-600" size={20} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
          <AlertCircle size={20} />
          <div className="flex-1">
            <p className="font-medium">Unable to load pricing data</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>Retry</Button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-[#71717a]">
          <RefreshCw size={24} className="animate-spin mr-2" />
          <span>Loading pricing data...</span>
        </div>
      )}

      {/* Main Content */}
      {!loading && (
      <Tabs defaultValue="coupons" className="space-y-4">
        <TabsList className="w-fit px-[10px] justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap">
          <TabsTrigger value="coupons" className="shrink-0">
            <Ticket size={14} className="mr-1.5" /> Coupons
          </TabsTrigger>
        </TabsList>
        <TabsContent value="coupons">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#18181b]">Coupon Codes</h3>
                <p className="text-xs text-[#71717a] mt-0.5">Generate and manage discount coupons for customers</p>
              </div>
              <Button size="sm" onClick={() => setAddCouponOpen(true)}>
                <Plus size={14} className="mr-1.5" /> Create Coupon
              </Button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coupons.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-[#71717a]">
                    No coupons configured
                  </div>
                ) : (
                coupons.map((coupon) => {
                  const usagePercent = coupon.usageLimit 
                    ? (coupon.usageCount / coupon.usageLimit) * 100 
                    : 0;
                  
                  return (
                    <div key={coupon.id} className="border border-[#e4e4e7] rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Sparkles size={16} />
                            <span className="text-xs opacity-90">COUPON CODE</span>
                          </div>
                          {coupon.status === 'active' && <Badge className="bg-white/20 text-white border-white/30">Active</Badge>}
                          {coupon.status === 'paused' && <Badge className="bg-amber-500/20 text-white border-amber-300/30">Paused</Badge>}
                          {coupon.status === 'expired' && <Badge variant="secondary">Expired</Badge>}
                        </div>
                        <div className="text-2xl font-bold font-mono tracking-wider mb-1">{coupon.code}</div>
                        <div className="text-sm opacity-90">{coupon.name}</div>
                      </div>

                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            {coupon.discountType === 'percentage' && (
                              <div className="text-2xl font-bold text-purple-600">{coupon.discountValue}% OFF</div>
                            )}
                            {coupon.discountType === 'flat' && (
                              <div className="text-2xl font-bold text-purple-600">₹{coupon.discountValue} OFF</div>
                            )}
                            {coupon.discountType === 'free_delivery' && (
                              <div className="text-xl font-bold text-purple-600">FREE DELIVERY</div>
                            )}
                            {coupon.minOrderValue > 0 && (
                              <div className="text-xs text-[#71717a] mt-1">Min order: ₹{coupon.minOrderValue}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-[#18181b]">{coupon.usageCount.toLocaleString()}</div>
                            <div className="text-xs text-[#71717a]">uses</div>
                          </div>
                        </div>

                        {coupon.usageLimit && (
                          <div className="mb-4">
                            <div className="flex justify-between text-xs text-[#71717a] mb-1">
                              <span>Redemptions</span>
                              <span>{usagePercent.toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-2 bg-[#e4e4e7] rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-500 transition-all"
                                style={{ width: `${Math.min(usagePercent, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleCopyCoupon(coupon.code)}
                          >
                            <Copy size={12} className="mr-1.5" /> Copy
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleToggleCoupon(coupon)}
                            disabled={coupon.status === 'expired'}
                          >
                            {coupon.status === 'active' ? <Pause size={12} /> : <Play size={12} />}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreVertical size={12} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setEditCoupon(coupon);
                                setAddCouponOpen(true);
                              }}>
                                <Edit size={14} className="mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyCoupon(coupon.code)}>
                                <Copy size={14} className="mr-2" /> Copy Code
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                                className="text-rose-600"
                              >
                                <Trash2 size={14} className="mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  );
                })
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      )}

      {/* Modals */}
      <AddCouponModal
        open={addCouponOpen}
        onOpenChange={(open) => {
          setAddCouponOpen(open);
          if (!open) setEditCoupon(null);
        }}
        onSuccess={loadData}
        editCoupon={editCoupon}
      />
    </div>
  );
}
