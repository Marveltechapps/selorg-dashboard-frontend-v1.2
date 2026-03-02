import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, X, MoreVertical, Edit, MessageSquare, FileText, 
  BarChart3, Pause, Phone, Mail, MapPin, Building2, CreditCard,
  TrendingUp, TrendingDown, CheckCircle, AlertTriangle, XCircle,
  Download, Eye, RefreshCw, Copy, Trash2, Plus, Save, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { createPDFBlob, createPDFViewHTML } from '../../../utils/pdfHelper';
import * as vendorApi from '../../../api/vendor/vendorManagement.api';

interface Vendor {
  id: string;
  name: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  complianceStatus: 'Compliant' | 'Pending' | 'Non-Compliant';
  status: 'Active' | 'Inactive' | 'Suspended' | 'Under Review';
  statusColor: string;
}

interface VendorProfileProps {
  vendor: Vendor;
  onClose: () => void;
  onEdit: () => void;
  onMessage: () => void;
  onViewDocs: () => void;
  onSuspend: () => void;
  onReport?: () => void;
}

function formatAddress(addr: any): { street: string; city: string; state: string; postal_code: string; country: string } {
  if (!addr) return { street: '', city: '', state: '', postal_code: '', country: 'India' };
  if (typeof addr === 'string') return { street: addr, city: '', state: '', postal_code: '', country: 'India' };
  return {
    street: [addr.line1, addr.line2].filter(Boolean).join(', '),
    city: addr.city || '',
    state: addr.state || '',
    postal_code: addr.pincode || addr.postalCode || '',
    country: addr.country || 'India'
  };
}

export function VendorProfile({ vendor, onClose, onEdit, onMessage, onViewDocs, onSuspend, onReport }: VendorProfileProps) {
  const [openMenu, setOpenMenu] = useState(false);
  const [showFullAccount, setShowFullAccount] = useState(false);
  const [fullVendor, setFullVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [vendorRes, certRes] = await Promise.all([
          vendorApi.getVendorById(vendor.id).catch(() => null),
          vendorApi.listVendorCertificates(vendor.id).catch(() => [])
        ]);
        if (mounted) {
          const data = vendorRes?.data ?? vendorRes;
          setFullVendor(data);
          const certs = Array.isArray(certRes) ? certRes : certRes?.data ?? certRes?.certificates ?? [];
          setCertificates(Array.isArray(certs) ? certs : []);
        }
      } catch (e) {
        if (mounted) setFullVendor(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [vendor.id]);

  const api = fullVendor ?? {};
  const meta = api.metadata ?? {};
  const contact = api.contact ?? {};
  const addr = formatAddress(api.address ?? vendor.address);

  const profileData = {
    photo_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.name)}&size=120&background=4F46E5&color=fff&bold=true`,
    rating: meta.rating ?? '—',
    review_count: meta.reviewCount ?? 0,
    joined_date: api.createdAt ? new Date(api.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—',
    tier: meta.tier || '—',
    contact: {
      person_name: contact.name || vendor.name,
      phone: contact.phone || vendor.phone || '—',
      phone_alt: meta.phoneAlternate || '—',
      email: contact.email || vendor.email || '—',
    },
    address: addr,
    financial: {
      gst_number: meta.gstNumber || '—',
      gst_verified: !!meta.gstVerified,
      pan: meta.panNumber || '—',
      bank_name: meta.bankName || '—',
      account_number: meta.bankAccount || '—',
      account_masked: meta.bankAccount ? `••••••••••••${String(meta.bankAccount).slice(-4)}` : '—',
      account_type: meta.accountType || '—',
      ifsc_code: meta.ifscCode || '—',
      account_holder: meta.accountHolder || '—'
    },
    performance: {
      total_orders: meta.totalOrders ?? '—',
      orders_trend: meta.ordersTrend ?? '—',
      on_time_delivery: meta.onTimeDelivery ?? '—',
      delivery_trend: meta.deliveryTrend ?? '—',
      quality_score: meta.qualityScore ?? '—',
      quality_trend: meta.qualityTrend ?? '—',
      payment_timeliness: meta.paymentTimeliness ?? '—',
      payment_trend: meta.paymentTrend ?? '—'
    },
    compliance: certificates.length > 0
      ? certificates.map((c: any) => ({
          name: c.name || c.type || 'Certificate',
          status: c.status === 'verified' ? 'Valid' : c.status || 'Pending',
          valid_until: c.expiresAt || c.validUntil || null,
          days_left: c.expiresAt ? Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / 86400000) : null
        }))
      : [],
    recent_orders: [] as { date: string; order_id: string; amount: number; status: string; quality: string }[]
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast notification here
  };

  const getDaysLeftColor = (days: number | null) => {
    if (!days) return 'text-[#9CA3AF]';
    if (days < 30) return 'text-[#EF4444]';
    if (days < 90) return 'text-[#F59E0B]';
    return 'text-[#10B981]';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-[#4F46E5]" />
          <p className="text-[#6B7280]">Loading vendor profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-hidden animate-slide-in-right">
      {/* Header Bar - Fixed */}
      <div className="sticky top-0 h-16 bg-white border-b border-[#E5E7EB] shadow-sm flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-[#4F46E5] hover:text-[#4338CA] font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Vendors</span>
          </button>
          <span className="text-[#D1D5DB]">|</span>
          <h1 className="text-lg font-bold text-[#1F2937]">Vendor Profile</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setOpenMenu(!openMenu)}
              className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors"
            >
              <MoreVertical size={20} className="text-[#6B7280]" />
            </button>
            {openMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(false)} />
                <div className="absolute right-0 top-12 z-20 bg-white border border-[#E5E7EB] rounded-lg shadow-xl py-1 w-56">
                  <button onClick={() => { onEdit(); setOpenMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#F3F4F6] flex items-center gap-2">
                    <Edit size={14} /> Edit Vendor
                  </button>
                  <button onClick={() => { onMessage(); setOpenMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#F3F4F6] flex items-center gap-2">
                    <MessageSquare size={14} /> Send Message
                  </button>
                  <button onClick={() => { onViewDocs(); setOpenMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#F3F4F6] flex items-center gap-2">
                    <FileText size={14} /> View Documents
                  </button>
                  <button 
                    onClick={() => { 
                      if (onReport) {
                        onReport();
                      }
                      setOpenMenu(false); 
                    }} 
                    className="w-full px-4 py-2 text-left text-sm hover:bg-[#F3F4F6] flex items-center gap-2"
                  >
                    <BarChart3 size={14} /> Performance Report
                  </button>
                  <div className="border-t border-[#E5E7EB] my-1" />
                  <button onClick={() => { onSuspend(); setOpenMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#FEF3C7] flex items-center gap-2 text-[#92400E]">
                    <Pause size={14} /> Suspend Vendor
                  </button>
                </div>
              </>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors"
          >
            <X size={20} className="text-[#6B7280]" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="h-[calc(100vh-64px)] overflow-y-auto">
        {/* Vendor Hero Card */}
        <div className="bg-gradient-to-b from-[#F9FAFB] to-white border-b border-[#E5E7EB] p-6">
          <div className="max-w-7xl mx-auto flex gap-6">
            {/* Vendor Photo */}
            <div className="flex-shrink-0">
              <img 
                src={profileData.photo_url} 
                alt={vendor.name}
                className={`w-32 h-32 rounded-full object-cover border-4 ${
                  profileData.tier === 'Preferred' ? 'border-[#4F46E5]' : 'border-[#10B981]'
                }`}
              />
            </div>

            {/* Vendor Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-bold text-[#1F2937]">{vendor.name}</h2>
                    <span className="text-sm text-[#6B7280] font-mono">({vendor.id})</span>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                      vendor.status === 'Active' ? 'bg-[#D1FAE5] text-[#065F46]' :
                      vendor.status === 'Inactive' ? 'bg-[#FEE2E2] text-[#7F1D1D]' :
                      vendor.status === 'Suspended' ? 'bg-[#FEF3C7] text-[#92400E]' :
                      'bg-[#EDE9FE] text-[#5B21B6]'
                    }`}>
                      {vendor.status === 'Active' && '✓'} {vendor.status}
                    </span>
                    <span className="text-sm text-[#6B7280]">{vendor.category}</span>
                    <span className="text-sm text-[#1F2937] flex items-center gap-1">
                      ⭐ {profileData.rating}/5 <span className="text-[#6B7280]">({profileData.review_count.toLocaleString()} reviews)</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-[#6B7280]">
                    <span>Joined: {profileData.joined_date}</span>
                    <span>Tier: <span className="font-medium text-[#4F46E5]">{profileData.tier} ◆</span></span>
                    <span>Compliance: <span className={`font-medium ${vendor.complianceStatus === 'Compliant' ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                      {vendor.complianceStatus === 'Compliant' ? '✓' : '⚠'} {vendor.complianceStatus}
                    </span></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={onEdit}
                  className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-medium hover:bg-[#4338CA] flex items-center gap-2"
                >
                  <Edit size={16} /> Edit
                </button>
                <button 
                  onClick={onMessage}
                  className="px-4 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] rounded-lg text-sm font-medium hover:bg-[#F3F4F6] flex items-center gap-2"
                >
                  <MessageSquare size={16} /> Message
                </button>
                <button 
                  onClick={onViewDocs}
                  className="px-4 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] rounded-lg text-sm font-medium hover:bg-[#F3F4F6] flex items-center gap-2"
                >
                  <FileText size={16} /> View Docs
                </button>
                <button 
                  onClick={() => {
                    if (onReport) {
                      onReport();
                    }
                  }}
                  className="px-4 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] rounded-lg text-sm font-medium hover:bg-[#F3F4F6] flex items-center gap-2"
                >
                  <BarChart3 size={16} /> Report
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Contact Information Section */}
          <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
            <h3 className="text-lg font-bold text-[#1F2937] mb-4 flex items-center gap-2">
              <Phone size={20} className="text-[#4F46E5]" />
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              <div>
                <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Contact Person</label>
                <p className="text-sm text-[#1F2937] mt-1">{profileData.contact.person_name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Email</label>
                <a href={`mailto:${profileData.contact.email}`} className="text-sm text-[#4F46E5] hover:underline mt-1 block">
                  {profileData.contact.email}
                </a>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Primary Phone</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-mono text-[#1F2937]">{profileData.contact.phone}</p>
                  <button 
                    onClick={() => copyToClipboard(profileData.contact.phone)}
                    className="p-1 hover:bg-[#F3F4F6] rounded"
                    title="Copy to clipboard"
                  >
                    <Copy size={14} className="text-[#6B7280]" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Alternate Phone</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-mono text-[#1F2937]">{profileData.contact.phone_alt}</p>
                  <button 
                    onClick={() => copyToClipboard(profileData.contact.phone_alt)}
                    className="p-1 hover:bg-[#F3F4F6] rounded"
                    title="Copy to clipboard"
                  >
                    <Copy size={14} className="text-[#6B7280]" />
                  </button>
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide flex items-center gap-1">
                  <MapPin size={14} /> Address
                </label>
                <p className="text-sm text-[#1F2937] mt-1">
                  {profileData.address.street ? (
                    <>
                      {profileData.address.street}<br/>
                      {[profileData.address.city, profileData.address.state, profileData.address.postal_code].filter(Boolean).join(', ') || null}
                      {profileData.address.country && <><br/>{profileData.address.country}</>}
                    </>
                  ) : (vendor.address || '—')}
                </p>
              </div>
            </div>
          </section>

          {/* Financial Information Section */}
          <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
            <h3 className="text-lg font-bold text-[#1F2937] mb-4 flex items-center gap-2">
              <CreditCard size={20} className="text-[#4F46E5]" />
              Financial Details
            </h3>
            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              <div>
                <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">GST Number</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-mono text-[#1F2937]">{profileData.financial.gst_number}</p>
                  {profileData.financial.gst_verified && (
                    <CheckCircle size={16} className="text-[#10B981]" title="Verified" />
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">PAN Number</label>
                <p className="text-sm font-mono text-[#1F2937] mt-1">{profileData.financial.pan}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Bank Name</label>
                <p className="text-sm text-[#1F2937] mt-1">{profileData.financial.bank_name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Account Type</label>
                <p className="text-sm text-[#1F2937] mt-1">{profileData.financial.account_type}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Bank Account</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-mono text-[#1F2937]">
                    {showFullAccount ? profileData.financial.account_number : profileData.financial.account_masked}
                  </p>
                  <button 
                    onClick={() => setShowFullAccount(!showFullAccount)}
                    className="text-xs text-[#4F46E5] hover:underline"
                  >
                    {showFullAccount ? 'Hide' : 'Reveal'}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">IFSC Code</label>
                <p className="text-sm font-mono text-[#1F2937] mt-1">{profileData.financial.ifsc_code}</p>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Account Holder Name</label>
                <p className="text-sm text-[#1F2937] mt-1">{profileData.financial.account_holder}</p>
              </div>
            </div>
          </section>

          {/* Performance KPIs Section */}
          <section>
            <h3 className="text-lg font-bold text-[#1F2937] mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-4 gap-4">
              {/* KPI Card 1 - Total Orders */}
              <div className="bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] border border-[#BFDBFE] rounded-xl p-5 hover:scale-105 transition-transform cursor-pointer">
                <p className="text-xs font-bold text-[#1E40AF] uppercase tracking-wide mb-3">Total Orders</p>
                <p className="text-4xl font-bold text-[#1E3A8A] mb-2">{profileData.performance.total_orders}</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp size={16} className="text-[#10B981]" />
                  <span className="text-[#10B981] font-medium">{profileData.performance.orders_trend}%</span>
                  <span className="text-[#6B7280] text-xs">vs last month</span>
                </div>
              </div>

              {/* KPI Card 2 - On-Time Delivery */}
              <div className="bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] border border-[#BBF7D0] rounded-xl p-5 hover:scale-105 transition-transform cursor-pointer">
                <p className="text-xs font-bold text-[#166534] uppercase tracking-wide mb-3">On-Time Delivery</p>
                <p className="text-4xl font-bold text-[#14532D] mb-2">{profileData.performance.on_time_delivery}%</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp size={16} className="text-[#10B981]" />
                  <span className="text-[#10B981] font-medium">{profileData.performance.delivery_trend}%</span>
                  <span className="text-[#6B7280] text-xs">vs last month</span>
                </div>
              </div>

              {/* KPI Card 3 - Quality Score */}
              <div className="bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] border border-[#FCD34D] rounded-xl p-5 hover:scale-105 transition-transform cursor-pointer">
                <p className="text-xs font-bold text-[#92400E] uppercase tracking-wide mb-3">Quality Score</p>
                <p className="text-4xl font-bold text-[#78350F] mb-2">{profileData.performance.quality_score}/5</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp size={16} className="text-[#10B981]" />
                  <span className="text-[#10B981] font-medium">+{profileData.performance.quality_trend}</span>
                  <span className="text-[#6B7280] text-xs">vs last month</span>
                </div>
              </div>

              {/* KPI Card 4 - Payment Timeliness */}
              <div className="bg-gradient-to-br from-[#FEE2E2] to-[#FECACA] border border-[#FCA5A5] rounded-xl p-5 hover:scale-105 transition-transform cursor-pointer">
                <p className="text-xs font-bold text-[#7F1D1D] uppercase tracking-wide mb-3">Payment Timeliness</p>
                <p className="text-4xl font-bold text-[#991B1B] mb-2">{profileData.performance.payment_timeliness}%</p>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-[#6B7280] font-medium">↔ Same</span>
                  <span className="text-[#6B7280] text-xs">vs last month</span>
                </div>
              </div>
            </div>
          </section>

          {/* Compliance Status Table */}
          <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
            <h3 className="text-lg font-bold text-[#1F2937] mb-4">Compliance Status</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F9FAFB] text-[#6B7280] font-medium border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-4 py-3 text-left">Certificate</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Valid Until</th>
                    <th className="px-4 py-3 text-left">Days Left</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {profileData.compliance.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-[#9CA3AF]">No compliance certificates</td></tr>
                  ) : profileData.compliance.map((cert, index) => (
                    <tr key={index} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3 flex items-center gap-2">
                        <FileText size={16} className="text-[#6B7280]" />
                        <span className="text-[#1F2937]">{cert.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 font-medium ${
                          cert.status === 'Valid' ? 'text-[#10B981]' :
                          cert.status === 'Pending' ? 'text-[#F59E0B]' :
                          'text-[#EF4444]'
                        }`}>
                          {cert.status === 'Valid' && <CheckCircle size={16} />}
                          {cert.status === 'Pending' && <AlertTriangle size={16} />}
                          {cert.status === 'Rejected' && <XCircle size={16} />}
                          {cert.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[#1F2937]">{cert.valid_until || '-'}</td>
                      <td className="px-4 py-3">
                        {cert.days_left ? (
                          <span className={`font-medium ${getDaysLeftColor(cert.days_left)}`}>
                            {cert.days_left} days
                            {cert.days_left < 30 && ' ⚠'}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent Orders Table */}
          <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
            <h3 className="text-lg font-bold text-[#1F2937] mb-4">Recent Orders</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F9FAFB] text-[#6B7280] font-medium border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Order ID</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Quality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {profileData.recent_orders.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[#9CA3AF]">No recent orders</td></tr>
                  ) : profileData.recent_orders.map((order, index) => (
                    <tr key={index} className="hover:bg-[#F9FAFB] transition-colors cursor-pointer">
                      <td className="px-4 py-3 text-[#6B7280]">{order.date}</td>
                      <td className="px-4 py-3">
                        <a href="#" className="text-[#4F46E5] font-medium hover:underline">
                          {order.order_id}
                        </a>
                      </td>
                      <td className="px-4 py-3 font-mono text-[#1F2937]">₹{order.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'Delivered' ? 'bg-[#D1FAE5] text-[#065F46]' :
                          order.status === 'In Transit' ? 'bg-[#DBEAFE] text-[#1E40AF]' :
                          'bg-[#FEF3C7] text-[#92400E]'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {order.quality === 'Pass' ? (
                          <span className="text-[#10B981] font-medium">✓ Pass</span>
                        ) : order.quality === 'Fail' ? (
                          <span className="text-[#EF4444] font-medium">✕ Fail</span>
                        ) : (
                          <span className="text-[#9CA3AF]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center">
              <button 
                onClick={() => {
                  toast.info('Opening all orders for this vendor...');
                  // In a real app, this would navigate to orders page filtered by vendor
                  window.open(`/orders?vendor=${vendor.id}`, '_blank');
                }}
                className="text-[#4F46E5] text-sm font-medium hover:underline"
              >
                View All Orders →
              </button>
            </div>
          </section>

          {/* Documents Quick View */}
          <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 mb-8">
            <h3 className="text-lg font-bold text-[#1F2937] mb-4">Documents</h3>
            <div className="space-y-3">
              {profileData.compliance.length === 0 ? (
                <p className="text-sm text-[#9CA3AF] py-4">No documents on file</p>
              ) : profileData.compliance.map((doc, index) => (
                <div key={index} className="p-4 border border-[#E5E7EB] rounded-lg hover:border-[#4F46E5] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText size={24} className="text-[#4F46E5]" />
                      <div>
                        <p className="font-medium text-[#1F2937]">{doc.name}</p>
                        {doc.valid_until && (
                          <p className={`text-xs ${getDaysLeftColor(doc.days_left)}`}>
                            Expires: {doc.valid_until} {doc.days_left && doc.days_left < 30 && '⚠'}
                          </p>
                        )}
                        {doc.status === 'Pending' && (
                          <p className="text-xs text-[#F59E0B]">⚠ Pending Review</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const content = `Document: ${doc.name}\nStatus: ${doc.status}\nValid Until: ${doc.valid_until || 'N/A'}\nDays Left: ${doc.days_left || 'N/A'}\n\nThis is a sample document for demonstration purposes.\nIn a production environment, this would be the actual document content.`;
                          const htmlContent = createPDFViewHTML(doc.name, content);
                          const blob = new Blob([htmlContent], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          const newWindow = window.open(url, '_blank');
                          if (newWindow) {
                            toast.success(`Opening ${doc.name}...`);
                            setTimeout(() => URL.revokeObjectURL(url), 1000);
                          } else {
                            toast.error('Please allow popups to view documents');
                          }
                        }}
                        className="px-3 py-1 text-xs font-medium text-[#4F46E5] hover:bg-[#F0F7FF] rounded flex items-center gap-1 transition-colors"
                      >
                        <Eye size={14} /> View
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const content = `Document: ${doc.name}\nStatus: ${doc.status}\nValid Until: ${doc.valid_until || 'N/A'}\nDays Left: ${doc.days_left || 'N/A'}\n\nThis is a sample document for demonstration purposes.`;
                          const pdfBlob = createPDFBlob(content, doc.name);
                          const url = URL.createObjectURL(pdfBlob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${doc.name.replace(/\s+/g, '_')}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          setTimeout(() => URL.revokeObjectURL(url), 100);
                          toast.success(`Downloaded ${doc.name} as PDF`);
                        }}
                        className="px-3 py-1 text-xs font-medium text-[#4F46E5] hover:bg-[#F0F7FF] rounded flex items-center gap-1 transition-colors"
                      >
                        <Download size={14} /> Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <button 
                onClick={onViewDocs}
                className="text-[#4F46E5] text-sm font-medium hover:underline"
              >
                View All Documents →
              </button>
            </div>
          </section>

          {/* SECTION 7: Categories & Products */}
          <CategoryManagement vendorId={vendor.id} vendorCategory={vendor.category} />

          {/* SECTION 8: Purchase Limits */}
          <PurchaseLimits />

          {/* SECTION 9: Product-Specific Constraints */}
          <ProductConstraints />
        </div>
      </div>
    </div>
  );
}

// Category Management Component - uses real vendor data
function CategoryManagement({ vendorId, vendorCategory }: { vendorId: string; vendorCategory: string }) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; enabled: boolean; products: { id: string; name: string; type: string }[] }[]>(() =>
    (vendorCategory && vendorCategory.trim()) ? [{ id: '1', name: vendorCategory.trim(), enabled: true, products: [] }] : []
  );
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryEnabled, setEditingCategoryEnabled] = useState(true);
  const [addingProductTo, setAddingProductTo] = useState<string | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductType, setNewProductType] = useState<'Raw' | 'Finished'>('Raw');

  useEffect(() => {
    if ((vendorCategory && vendorCategory.trim()) && categories.length === 0) {
      setCategories([{ id: '1', name: vendorCategory.trim(), enabled: true, products: [] }]);
    }
  }, [vendorCategory]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleEditCategory = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setEditingCategory(categoryId);
      setEditingCategoryName(category.name);
      setEditingCategoryEnabled(category.enabled);
    }
  };

  const handleSaveCategoryEdit = () => {
    if (!editingCategoryName.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }
    setCategories(prev => prev.map(cat => 
      cat.id === editingCategory
        ? { ...cat, name: editingCategoryName, enabled: editingCategoryEnabled }
        : cat
    ));
    setEditingCategory(null);
    setEditingCategoryName('');
    toast.success('Category updated successfully');
  };

  const handleRemoveProduct = (categoryId: string, productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCategories(prev => {
      const updated = prev.map(cat => 
        cat.id === categoryId 
          ? { ...cat, products: cat.products.filter(p => p.id !== productId) }
          : cat
      );
      return updated;
    });
    toast.success('Product removed successfully');
  };

  const handleAddProduct = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddingProductTo(categoryId);
  };

  const handleSaveNewProduct = (categoryId: string) => {
    if (!newProductName.trim()) {
      toast.error('Please enter a product name');
      return;
    }
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { ...cat, products: [...cat.products, { id: `p${Date.now()}`, name: newProductName, type: newProductType }] }
        : cat
    ));
    setNewProductName('');
    setNewProductType('Raw');
    setAddingProductTo(null);
    toast.success('Product added successfully');
  };

  return (
    <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 mb-6">
      <h3 className="text-lg font-bold text-[#1F2937] mb-4">Categories & Products</h3>
      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] py-4">No categories configured</p>
        ) : categories.map((category, index) => (
          <div key={index} className="border border-[#E5E7EB] rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#F9FAFB] transition-colors"
              onClick={() => toggleCategory(category.name)}
            >
              <div className="flex items-center gap-3">
                <button className="text-[#6B7280] transition-transform">
                  {expandedCategories.includes(category.name) ? '▼' : '▶'}
                </button>
                <span className="font-medium text-[#1F2937]">{category.name}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  category.enabled ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#F3F4F6] text-[#6B7280]'
                }`}>
                  {category.enabled ? '✓ Enabled' : 'Disabled'}
                </span>
              </div>
              {editingCategory === category.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingCategoryName}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="px-2 py-1 text-sm border border-[#D1D5DB] rounded focus:outline-none focus:border-[#4F46E5]"
                    placeholder="Category name"
                  />
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={editingCategoryEnabled}
                      onChange={(e) => setEditingCategoryEnabled(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    Enabled
                  </label>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveCategoryEdit();
                    }}
                    className="px-2 py-1 text-xs bg-[#4F46E5] text-white rounded hover:bg-[#4338CA]"
                  >
                    Save
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCategory(null);
                      setEditingCategoryName('');
                    }}
                    className="px-2 py-1 text-xs border border-[#D1D5DB] rounded hover:bg-[#F3F4F6]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={(e) => handleEditCategory(category.id, e)}
                  className="px-3 py-1 text-sm text-[#4F46E5] hover:bg-[#F0F7FF] rounded transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            
            {expandedCategories.includes(category.name) && (
              <div className="px-4 pb-4 bg-[#F9FAFB] border-t border-[#E5E7EB]">
                <div className="mt-3">
                  <p className="text-xs font-medium text-[#6B7280] uppercase mb-2">Products:</p>
                  {category.products.length > 0 ? (
                    <div className="space-y-2">
                      {category.products.map((product, pIndex) => (
                        <div key={pIndex} className="flex items-center justify-between bg-white p-2 rounded border border-[#E5E7EB]">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[#1F2937]">{product.name}</span>
                            <span className="text-xs px-2 py-0.5 bg-[#F3F4F6] text-[#6B7280] rounded">
                              {product.type}
                            </span>
                          </div>
                          <button 
                            onClick={(e) => handleRemoveProduct(category.id, product.id, e)}
                            className="text-xs text-[#EF4444] hover:underline transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#9CA3AF] italic">No products added</p>
                  )}
                  {addingProductTo === category.id ? (
                    <div className="mt-3 p-3 bg-white rounded border border-[#E5E7EB] space-y-2">
                      <input
                        type="text"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        placeholder="Product name"
                        className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                        autoFocus
                      />
                      <select
                        value={newProductType}
                        onChange={(e) => setNewProductType(e.target.value as 'Raw' | 'Finished')}
                        className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                      >
                        <option value="Raw">Raw</option>
                        <option value="Finished">Finished</option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveNewProduct(category.id)}
                          className="flex-1 px-3 py-1.5 bg-[#4F46E5] text-white rounded text-sm font-medium hover:bg-[#4338CA]"
                        >
                          <Save size={14} className="inline mr-1" />
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setAddingProductTo(null);
                            setNewProductName('');
                          }}
                          className="flex-1 px-3 py-1.5 border border-[#D1D5DB] rounded text-sm font-medium hover:bg-[#F3F4F6]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => handleAddProduct(category.id, e)}
                      className="mt-3 text-sm text-[#4F46E5] hover:underline transition-colors"
                    >
                      + Add Product
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// Purchase Limits Component
function PurchaseLimits() {
  
  const defaultGlobalLimits = { min: 100, max: 500, unit: 'kg' };
  const defaultCategoryLimits = [
    { id: '1', category: 'Vegetables', min: 50, max: 200, unit: 'kg' },
    { id: '2', category: 'Fruits', min: 30, max: 150, unit: 'kg' },
    { id: '3', category: 'Dairy', min: 20, max: 100, unit: 'L' },
  ];

  const [isEditingGlobal, setIsEditingGlobal] = useState(false);
  const [globalLimits, setGlobalLimits] = useState(defaultGlobalLimits);
  const [editingLimit, setEditingLimit] = useState<{ min: number; max: number; unit: string } | null>(null);
  const [categoryLimits, setCategoryLimits] = useState(defaultCategoryLimits);
  const [isAddingCategoryLimit, setIsAddingCategoryLimit] = useState(false);
  const [newCategoryLimit, setNewCategoryLimit] = useState({ category: '', min: '', max: '', unit: 'kg' });
  const [editingCategoryLimitId, setEditingCategoryLimitId] = useState<string | null>(null);


  return (
    <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 mb-6">
      <h3 className="text-lg font-bold text-[#1F2937] mb-4">Purchase Limits & Constraints</h3>
      
      {/* Global Limits */}
      <div className="mb-6">
        <h4 className="text-sm font-bold text-[#6B7280] uppercase mb-3">Global Limits</h4>
        {isEditingGlobal ? (
          <div className="bg-[#F9FAFB] rounded-lg p-4 space-y-3 border-2 border-[#4F46E5]">
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Minimum Quantity Per Order</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={editingLimit?.min || globalLimits.min}
                  onChange={(e) => setEditingLimit({ ...(editingLimit || globalLimits), min: parseInt(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                />
                <select
                  value={editingLimit?.unit || globalLimits.unit}
                  onChange={(e) => setEditingLimit({ ...(editingLimit || globalLimits), unit: e.target.value })}
                  className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="pieces">pieces</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Maximum Quantity Per Order</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={editingLimit?.max || globalLimits.max}
                  onChange={(e) => setEditingLimit({ ...(editingLimit || globalLimits), max: parseInt(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                />
                <select
                  value={editingLimit?.unit || globalLimits.unit}
                  onChange={(e) => setEditingLimit({ ...(editingLimit || globalLimits), unit: e.target.value })}
                  className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="pieces">pieces</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  if (editingLimit) {
                    setGlobalLimits(editingLimit);
                    toast.success('Global limits updated successfully');
                  }
                  setIsEditingGlobal(false);
                  setEditingLimit(null);
                }}
                className="flex-1 px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-medium hover:bg-[#4338CA]"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditingGlobal(false);
                  setEditingLimit(null);
                }}
                className="flex-1 px-4 py-2 border border-[#D1D5DB] rounded-lg text-sm font-medium hover:bg-[#F3F4F6]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#F9FAFB] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Minimum Quantity Per Order</p>
                <p className="text-sm text-[#1F2937] font-medium">{globalLimits.min} {globalLimits.unit} per day</p>
              </div>
              <button 
                onClick={() => {
                  setIsEditingGlobal(true);
                  setEditingLimit({ ...globalLimits });
                }}
                className="p-2 hover:bg-white rounded transition-colors"
              >
                <Edit size={16} className="text-[#4F46E5]" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Maximum Quantity Per Order</p>
                <p className="text-sm text-[#1F2937] font-medium">{globalLimits.max} {globalLimits.unit} per day</p>
              </div>
              <button 
                onClick={() => {
                  setIsEditingGlobal(true);
                  setEditingLimit({ ...globalLimits });
                }}
                className="p-2 hover:bg-white rounded transition-colors"
              >
                <Edit size={16} className="text-[#4F46E5]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category-Specific Limits */}
      <div>
        <h4 className="text-sm font-bold text-[#6B7280] uppercase mb-3">Category-Specific Limits</h4>
        <div className="space-y-2">
          {categoryLimits.map((limit) => (
            editingCategoryLimitId === limit.id ? (
              <div key={limit.id} className="p-3 bg-white border-2 border-[#4F46E5] rounded-lg space-y-2">
                <input
                  type="text"
                  value={limit.category}
                  onChange={(e) => setCategoryLimits(prev => prev.map(l => l.id === limit.id ? { ...l, category: e.target.value } : l))}
                  className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={limit.min}
                    onChange={(e) => setCategoryLimits(prev => prev.map(l => l.id === limit.id ? { ...l, min: parseInt(e.target.value) || 0 } : l))}
                    placeholder="Min"
                    className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                  />
                  <input
                    type="number"
                    value={limit.max}
                    onChange={(e) => setCategoryLimits(prev => prev.map(l => l.id === limit.id ? { ...l, max: parseInt(e.target.value) || 0 } : l))}
                    placeholder="Max"
                    className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                  />
                  <select
                    value={limit.unit}
                    onChange={(e) => setCategoryLimits(prev => prev.map(l => l.id === limit.id ? { ...l, unit: e.target.value } : l))}
                    className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="pieces">pieces</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingCategoryLimitId(null);
                      toast.success('Category limit updated');
                    }}
                    className="flex-1 px-3 py-1.5 bg-[#4F46E5] text-white rounded text-xs font-medium hover:bg-[#4338CA]"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingCategoryLimitId(null)}
                    className="flex-1 px-3 py-1.5 border border-[#D1D5DB] rounded text-xs font-medium hover:bg-[#F3F4F6]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={limit.id} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg hover:bg-[#F3F4F6] transition-colors">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1F2937]">{limit.category}</p>
                  <p className="text-xs text-[#6B7280]">
                    Min: {limit.min} {limit.unit} | Max: {limit.max} {limit.unit}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingCategoryLimitId(limit.id)}
                    className="px-3 py-1 text-xs text-[#4F46E5] hover:bg-white rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => {
                      setCategoryLimits(prev => prev.filter(l => l.id !== limit.id));
                      toast.success('Category limit deleted');
                    }}
                    className="px-3 py-1 text-xs text-[#EF4444] hover:bg-white rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
        {isAddingCategoryLimit ? (
          <div className="mt-3 p-3 bg-white border-2 border-[#4F46E5] rounded-lg space-y-2">
            <input
              type="text"
              value={newCategoryLimit.category}
              onChange={(e) => setNewCategoryLimit({ ...newCategoryLimit, category: e.target.value })}
              placeholder="Category name"
              className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={newCategoryLimit.min}
                onChange={(e) => setNewCategoryLimit({ ...newCategoryLimit, min: e.target.value })}
                placeholder="Min"
                className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
              />
              <input
                type="number"
                value={newCategoryLimit.max}
                onChange={(e) => setNewCategoryLimit({ ...newCategoryLimit, max: e.target.value })}
                placeholder="Max"
                className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
              />
              <select
                value={newCategoryLimit.unit}
                onChange={(e) => setNewCategoryLimit({ ...newCategoryLimit, unit: e.target.value })}
                className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="kg">kg</option>
                <option value="L">L</option>
                <option value="pieces">pieces</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (newCategoryLimit.category && newCategoryLimit.min && newCategoryLimit.max) {
                    setCategoryLimits(prev => [...prev, {
                      id: `cl${Date.now()}`,
                      category: newCategoryLimit.category,
                      min: parseInt(newCategoryLimit.min),
                      max: parseInt(newCategoryLimit.max),
                      unit: newCategoryLimit.unit
                    }]);
                    setNewCategoryLimit({ category: '', min: '', max: '', unit: 'kg' });
                    setIsAddingCategoryLimit(false);
                    toast.success('Category limit added');
                  } else {
                    toast.error('Please fill all fields');
                  }
                }}
                className="flex-1 px-3 py-1.5 bg-[#4F46E5] text-white rounded text-xs font-medium hover:bg-[#4338CA]"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsAddingCategoryLimit(false);
                  setNewCategoryLimit({ category: '', min: '', max: '', unit: 'kg' });
                }}
                className="flex-1 px-3 py-1.5 border border-[#D1D5DB] rounded text-xs font-medium hover:bg-[#F3F4F6]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsAddingCategoryLimit(true)}
            className="mt-3 text-sm text-[#4F46E5] hover:underline transition-colors"
          >
            + Add Category Limit
          </button>
        )}
      </div>
    </section>
  );
}

// Product Constraints Component
function ProductConstraints() {
  const defaultConstraints = [
    { id: '1', product: 'Tomato', category: 'Vegetables', min: 50, max: 200, unit: 'kg' },
    { id: '2', product: 'Apple', category: 'Fruits', min: 30, max: 150, unit: 'kg' },
    { id: '3', product: 'Milk', category: 'Dairy', min: 20, max: 100, unit: 'L' },
    { id: '4', product: 'Rice (Basmati)', category: 'Rice', min: 100, max: 500, unit: 'kg' },
    { id: '5', product: 'Mustard Oil', category: 'Oil', min: 50, max: 300, unit: 'L' },
  ];

  const [constraints, setConstraints] = useState(defaultConstraints);
  const [editingConstraintId, setEditingConstraintId] = useState<string | null>(null);
  const [isAddingConstraint, setIsAddingConstraint] = useState(false);
  const [newConstraint, setNewConstraint] = useState({ product: '', category: '', min: '', max: '', unit: 'kg' });


  const handleEditConstraint = (constraintId: string) => {
    setEditingConstraintId(constraintId);
  };

  const handleDeleteConstraint = (constraintId: string) => {
    setConstraints(prev => prev.filter(c => c.id !== constraintId));
    toast.success('Product constraint deleted');
  };

  const handleSaveEdit = (constraintId: string) => {
    setEditingConstraintId(null);
    toast.success('Product constraint updated');
  };

  const handleAddConstraint = () => {
    if (newConstraint.product && newConstraint.category && newConstraint.min && newConstraint.max) {
      setConstraints(prev => [...prev, {
        id: `pc${Date.now()}`,
        product: newConstraint.product,
        category: newConstraint.category,
        min: parseInt(newConstraint.min),
        max: parseInt(newConstraint.max),
        unit: newConstraint.unit
      }]);
      setNewConstraint({ product: '', category: '', min: '', max: '', unit: 'kg' });
      setIsAddingConstraint(false);
      toast.success('Product constraint added');
    } else {
      toast.error('Please fill all fields');
    }
  };

  return (
    <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 mb-8">
      <h3 className="text-lg font-bold text-[#1F2937] mb-4">Product-Specific Constraints</h3>
      <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
        <table className="w-full text-sm">
          <thead className="bg-[#F9FAFB] text-[#6B7280] font-medium border-b border-[#E5E7EB] sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Min/Day</th>
              <th className="px-4 py-3 text-left">Max/Day</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {constraints.map((item) => (
              editingConstraintId === item.id ? (
                <tr key={item.id} className="bg-[#F0F7FF]">
                  <td colSpan={5} className="px-4 py-3">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={item.product}
                          onChange={(e) => setConstraints(prev => prev.map(c => c.id === item.id ? { ...c, product: e.target.value } : c))}
                          className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                          placeholder="Product name"
                        />
                        <input
                          type="text"
                          value={item.category}
                          onChange={(e) => setConstraints(prev => prev.map(c => c.id === item.id ? { ...c, category: e.target.value } : c))}
                          className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                          placeholder="Category"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={item.min}
                          onChange={(e) => setConstraints(prev => prev.map(c => c.id === item.id ? { ...c, min: parseInt(e.target.value) || 0 } : c))}
                          placeholder="Min"
                          className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                        />
                        <input
                          type="number"
                          value={item.max}
                          onChange={(e) => setConstraints(prev => prev.map(c => c.id === item.id ? { ...c, max: parseInt(e.target.value) || 0 } : c))}
                          placeholder="Max"
                          className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                        />
                        <select
                          value={item.unit}
                          onChange={(e) => setConstraints(prev => prev.map(c => c.id === item.id ? { ...c, unit: e.target.value } : c))}
                          className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                        >
                          <option value="kg">kg</option>
                          <option value="L">L</option>
                          <option value="pieces">pieces</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="flex-1 px-3 py-1.5 bg-[#4F46E5] text-white rounded text-xs font-medium hover:bg-[#4338CA]"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingConstraintId(null)}
                          className="flex-1 px-3 py-1.5 border border-[#D1D5DB] rounded text-xs font-medium hover:bg-[#F3F4F6]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={item.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#1F2937]">{item.product}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{item.category}</td>
                  <td className="px-4 py-3 font-mono text-[#1F2937]">{item.min} {item.unit}</td>
                  <td className="px-4 py-3 font-mono text-[#1F2937]">{item.max} {item.unit}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditConstraint(item.id)}
                        className="p-1 hover:bg-[#F0F7FF] rounded transition-colors" 
                        title="Edit"
                      >
                        <Edit size={16} className="text-[#4F46E5]" />
                      </button>
                      <button 
                        onClick={() => handleDeleteConstraint(item.id)}
                        className="p-1 hover:bg-[#FEE2E2] rounded transition-colors" 
                        title="Delete"
                      >
                        <Trash2 size={16} className="text-[#EF4444]" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            ))}
            {isAddingConstraint && (
              <tr className="bg-[#F0F7FF]">
                <td colSpan={5} className="px-4 py-3">
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newConstraint.product}
                        onChange={(e) => setNewConstraint({ ...newConstraint, product: e.target.value })}
                        className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                        placeholder="Product name"
                      />
                      <input
                        type="text"
                        value={newConstraint.category}
                        onChange={(e) => setNewConstraint({ ...newConstraint, category: e.target.value })}
                        className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                        placeholder="Category"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={newConstraint.min}
                        onChange={(e) => setNewConstraint({ ...newConstraint, min: e.target.value })}
                        placeholder="Min"
                        className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                      />
                      <input
                        type="number"
                        value={newConstraint.max}
                        onChange={(e) => setNewConstraint({ ...newConstraint, max: e.target.value })}
                        placeholder="Max"
                        className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                      />
                      <select
                        value={newConstraint.unit}
                        onChange={(e) => setNewConstraint({ ...newConstraint, unit: e.target.value })}
                        className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                      >
                        <option value="kg">kg</option>
                        <option value="L">L</option>
                        <option value="pieces">pieces</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddConstraint}
                        className="flex-1 px-3 py-1.5 bg-[#4F46E5] text-white rounded text-xs font-medium hover:bg-[#4338CA]"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingConstraint(false);
                          setNewConstraint({ product: '', category: '', min: '', max: '', unit: 'kg' });
                        }}
                        className="flex-1 px-3 py-1.5 border border-[#D1D5DB] rounded text-xs font-medium hover:bg-[#F3F4F6]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-center">
        {!isAddingConstraint ? (
          <button 
            onClick={() => setIsAddingConstraint(true)}
            className="text-[#4F46E5] text-sm font-medium hover:underline transition-colors"
          >
            + Add Product Constraint
          </button>
        ) : null}
      </div>
    </section>
  );
}