import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, Truck, Star, Clock, X, ChevronDown, FileText, Download, CheckCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../ui/page-header';
import { exportToCSV, exportToCSVForExcel } from '../../../utils/csvExport';
import { exportToPDF } from '../../../utils/pdfExport';
import { EmptyState } from '../../ui/ux-components';
import * as vendorApi from '../../../api/vendor/vendorManagement.api';

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: string;
  trendUp?: boolean;
  icon?: React.ReactNode;
  color?: string;
}

function MetricCard({ label, value, subValue, trend, trendUp, icon, color = "indigo" }: MetricCardProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[#757575] font-medium text-xs uppercase tracking-wider">{label}</span>
        {icon && <div className={`text-${color}-500 p-1.5 bg-${color}-50 rounded-lg`}>{icon}</div>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-[#212121]">{value}</span>
        {subValue && <span className="text-sm text-[#757575] mb-1">{subValue}</span>}
      </div>
      {trend && (
        <div className={`text-xs font-medium mt-2 flex items-center gap-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          <span>{trendUp ? '↑' : '↓'}</span>
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

interface VendorOverviewProps {
  searchQuery?: string;
}

interface Vendor {
  id: string;
  code?: string;
  name: string;
  category: string;
  rating: string;
  status: string;
  statusColor: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

interface VendorSummary {
  activeVendors?: number;
  totalVendors?: number;
  pendingVendors?: number;
  slaCompliance?: number;
  openPOs?: number;
  openPOValue?: number | string;
  criticalAlerts?: number;
  deliveryTimeliness?: number;
  productQuality?: number;
  complianceStatus?: number;
  topPerformers?: string[];
}

export function VendorOverview({ searchQuery = '' }: VendorOverviewProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [summary, setSummary] = useState<VendorSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showVendorDetail, setShowVendorDetail] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    contactPerson: '',
    email: '',
    phone: ''
  });
  const [saving, setSaving] = useState(false);

  // Generate unique vendor code
  const generateVendorCode = (name: string): string => {
    const prefix = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 3)
      .padEnd(3, 'X');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${random}`;
  };

  // Load vendors from API
  const loadVendors = async () => {
    try {
      setLoading(true);
      const response = await vendorApi.getVendors();
      
      // Handle different response structures
      let vendorsData: any[] = [];
      if (Array.isArray(response)) {
        vendorsData = response;
      } else if (response.data && Array.isArray(response.data)) {
        vendorsData = response.data;
      } else if (response.vendors && Array.isArray(response.vendors)) {
        vendorsData = response.vendors;
      } else if (response.meta && response.data) {
        vendorsData = response.data;
      }
      
      // Transform API data to match component format
      const transformedVendors: Vendor[] = vendorsData.map((v: any) => {
        // Use _id (MongoDB ID) for updates, but display code in UI
        const vendorId = v._id || v.id || v.code || `VND-${Math.floor(1000 + Math.random() * 9000)}`;
        const vendorCode = v.code || vendorId;
        const status = v.status || 'pending';
        
        return {
          id: vendorId, // Store MongoDB _id for API calls
          code: vendorCode, // Store code for display
          name: v.name || 'Unknown',
          category: v.metadata?.category || v.onboarding?.category || 'Uncategorized',
          rating: v.metadata?.rating || '4.0',
          status: status === 'pending' ? 'Under Review' : 
                  status === 'active' ? 'Active' : 
                  status === 'inactive' ? 'On Hold' : 
                  status || 'Active',
          statusColor: status === 'active' ? 'green' : 
                       status === 'pending' ? 'yellow' : 'red',
          contactPerson: v.contact?.name || '',
          email: v.contact?.email || '',
          phone: v.contact?.phone || ''
        };
      });
      
      setVendors(transformedVendors);
      
      if (transformedVendors.length === 0) {
        console.log('No vendors found in API response');
      }
    } catch (error: any) {
      console.error('Failed to load vendors:', error);
      toast.error(error.message || 'Failed to load vendors from server');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  // Load vendor summary (metrics, counts)
  const loadSummary = async () => {
    try {
      setSummaryLoading(true);
      const resp = await vendorApi.getVendorSummary();
      setSummary(resp?.data ?? resp ?? null);
    } catch (error: any) {
      console.error('Failed to load vendor summary:', error);
      toast.error(error?.message || 'Failed to load vendor summary');
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    loadSummary();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) {
      toast.error('Please fill in required fields (Name and Category are required)');
      return;
    }

    try {
      setSaving(true);
      
      // Generate unique vendor code (only for new vendors)
      let vendorCode: string;
      if (isEditing && selectedVendor) {
        // For updates, preserve the existing code if available
        vendorCode = selectedVendor.code?.replace(/^VND-/, '') || generateVendorCode(formData.name);
      } else {
        vendorCode = generateVendorCode(formData.name);
      }
      
      // Structure payload according to backend schema
      const payload: any = {
        name: formData.name,
        code: `VND-${vendorCode}`,
        status: isEditing 
          ? (selectedVendor?.status === 'Active' ? 'active' : selectedVendor?.status === 'On Hold' ? 'inactive' : 'pending')
          : 'active',
        contact: {
          name: formData.contactPerson || '',
          email: formData.email || '',
          phone: formData.phone || ''
        },
        address: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          pincode: ''
        },
        metadata: {
          category: formData.category,
          rating: '4.0'
        }
      };

      if (isEditing && selectedVendor) {
        // Update existing vendor - use MongoDB _id (stored in id field)
        const vendorId = selectedVendor.id;
        await vendorApi.updateVendor(vendorId, payload);
        toast.success('Vendor updated successfully');
        setIsEditing(false);
        setSelectedVendor(null);
      } else {
        // Create new vendor
        const response = await vendorApi.createVendor(payload);
        toast.success('Vendor created successfully');
        
        // Add to local state immediately
        const newVendor: Vendor = {
          id: response._id || response.id || `temp-${Date.now()}`, // Use MongoDB _id
          code: response.code || payload.code, // Store code for display
          name: formData.name,
          category: formData.category,
          rating: '4.0',
          status: 'Active',
          statusColor: 'green',
          contactPerson: formData.contactPerson,
          email: formData.email,
          phone: formData.phone
        };
        setVendors([newVendor, ...vendors]);
      }

      setFormData({ name: '', category: '', contactPerson: '', email: '', phone: '' });
      setIsDialogOpen(false);
      
      // Reload vendors to ensure data is synced with backend
      await loadVendors();
    } catch (error: any) {
      console.error('Failed to save vendor:', error);
      const errorMessage = error.message || 'Failed to save vendor. Please try again.';
      toast.error(errorMessage);
      
      // If validation error, show details
      if (error.details && Array.isArray(error.details)) {
        const validationErrors = error.details.map((d: any) => d.msg || d.message).join(', ');
        toast.error(`Validation errors: ${validationErrors}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = (format: string) => {
    setShowDownloadMenu(false);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      
      if (format.toLowerCase() === 'csv' || format.toLowerCase() === 'xlsx') {
        const csvData: (string | number)[][] = [
          ['Vendor Overview Report', `Date: ${today}`, `Time: ${timestamp}`],
          [''],
          ['Vendor ID', 'Name', 'Category', 'Rating', 'Status'],
          ...filteredVendors.map(v => [
            v.id,
            v.name,
            v.category,
            v.rating,
            v.status
          ]),
        ];
        exportToCSVForExcel(csvData, `vendor-overview-${today}-${timestamp.replace(/:/g, '-')}`);
      } else if (format.toLowerCase() === 'pdf') {
        const htmlContent = `
          <h1>Vendor Overview Report</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
          <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse;">
            <tr>
              <th>Vendor ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Rating</th>
              <th>Status</th>
            </tr>
            ${filteredVendors.map(v => `
              <tr>
                <td>${v.id}</td>
                <td>${v.name}</td>
                <td>${v.category}</td>
                <td>${v.rating}</td>
                <td>${v.status}</td>
              </tr>
            `).join('')}
          </table>
        `;
        exportToPDF(htmlContent, `vendor-overview-${today}`);
      }
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export report');
      console.error('Export error:', error);
    }
  };

  const handleViewVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowVendorDetail(true);
    setIsEditing(false);
    setFormData({
      name: vendor.name,
      category: vendor.category,
      contactPerson: vendor.contactPerson || '',
      email: vendor.email || '',
      phone: vendor.phone || ''
    });
  };

  const handleEditVendor = () => {
    setIsEditing(true);
    setShowVendorDetail(false);
    setIsDialogOpen(true);
  };

  const handleToggleVendorStatus = async (vendorId: string) => {
    try {
      const vendor = vendors.find(v => v.id === vendorId);
      if (!vendor) return;

      const newStatus = vendor.statusColor === 'red' ? 'Active' : 'On Hold';
      const newStatusColor = vendor.statusColor === 'red' ? 'green' : 'red';
      const apiStatus = newStatus === 'Active' ? 'active' : 'inactive';

      await vendorApi.updateVendor(vendorId, { status: apiStatus });
      
      setVendors(vendors.map(v => {
        if (v.id === vendorId) {
          return { ...v, status: newStatus, statusColor: newStatusColor };
        }
        return v;
      }));
      
      toast.success(`Vendor ${newStatus === 'Active' ? 'activated' : 'put on hold'}`);
      setShowVendorDetail(false);
      
      // Reload to ensure sync
      await loadVendors();
    } catch (error: any) {
      console.error('Failed to update vendor status:', error);
      toast.error(error.message || 'Failed to update vendor status');
    }
  };

  // Filter vendors by status and search query
  const filteredVendors = vendors.filter(vendor => {
    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && vendor.status !== 'Active') return false;
      if (filterStatus === 'review' && vendor.status !== 'Review Due' && vendor.status !== 'Under Review') return false;
      if (filterStatus === 'hold' && vendor.status !== 'On Hold') return false;
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        vendor.id.toLowerCase().includes(query) ||
        vendor.name.toLowerCase().includes(query) ||
        vendor.category.toLowerCase().includes(query) ||
        vendor.contactPerson?.toLowerCase().includes(query) ||
        vendor.email?.toLowerCase().includes(query) ||
        vendor.phone?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Overview"
        subtitle="Supplier performance, active relationships, and health monitoring"
        actions={
          <button 
            onClick={() => setIsDialogOpen(true)}
            className="px-4 py-2 bg-[#1677FF] text-white font-medium rounded-lg hover:bg-[#409EFF] flex items-center gap-2"
          >
            <Plus size={16} />
            Add New Vendor
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label="Active Vendors" 
          value={summaryLoading ? '—' : String(summary?.activeVendors ?? vendors.filter(v => v.status === 'Active').length ?? 0)} 
          subValue={summary?.pendingVendors != null ? `+${summary.pendingVendors} pending` : undefined}
          trend={summaryLoading ? undefined : 'Live'}
          trendUp={true}
          icon={<Users size={18} />}
          color="indigo"
        />
        <MetricCard 
          label="SLA Compliance" 
          value={summaryLoading ? '—' : (summary?.slaCompliance != null ? `${summary.slaCompliance}%` : '—')} 
          trend={summary?.slaCompliance != null && summary.slaCompliance >= 90 ? 'Above Target' : undefined}
          trendUp={summary?.slaCompliance != null && summary.slaCompliance >= 90}
          icon={<Clock size={18} />}
          color="green"
        />
        <MetricCard 
          label="Open POs" 
          value={summaryLoading ? '—' : String(summary?.openPOs ?? 0)} 
          subValue={summary?.openPOValue != null ? `₹${summary.openPOValue}` : undefined}
          trend={summary?.openPOs != null && summary.openPOs > 0 ? 'Live' : undefined}
          trendUp={true}
          icon={<Truck size={18} />}
          color="blue"
        />
        <MetricCard 
          label="Critical Alerts" 
          value={summaryLoading ? '—' : String(summary?.criticalAlerts ?? 0)} 
          trend={summary?.criticalAlerts != null && summary.criticalAlerts > 0 ? 'Needs Attention' : undefined}
          trendUp={false}
          icon={<AlertTriangle size={18} />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vendor Health Monitor */}
          <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm p-6">
              <h3 className="font-bold text-[#212121] mb-4">Vendor Health Monitor</h3>
              <div className="space-y-4">
                  <div className="flex items-center gap-4">
                      <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-[#212121]">Delivery Timeliness</span>
                              <span className="font-bold text-green-600">{summary?.deliveryTimeliness ?? '—'}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500" style={{ width: `${summary?.deliveryTimeliness ?? 0}%` }}></div>
                          </div>
                      </div>
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-[#212121]">Product Quality</span>
                              <span className="font-bold text-blue-600">{summary?.productQuality ?? '—'}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${summary?.productQuality ?? 0}%` }}></div>
                          </div>
                      </div>
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-[#212121]">Compliance Status</span>
                              <span className="font-bold text-orange-600">{summary?.complianceStatus ?? '—'}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500" style={{ width: `${summary?.complianceStatus ?? 0}%` }}></div>
                          </div>
                      </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#F5F5F5]">
                      <h4 className="text-xs font-bold text-[#757575] uppercase mb-2">Top Performers</h4>
                      <div className="flex flex-wrap gap-2">
                          {(summary?.topPerformers ?? vendors.filter(v => v.status === 'Active').slice(0, 3).map(v => v.name)).length > 0
                            ? (summary?.topPerformers ?? vendors.filter(v => v.status === 'Active').slice(0, 3).map(v => v.name)).map((name, i) => (
                                <span key={i} className="px-2 py-1 bg-[#F0FDF4] text-[#166534] text-xs font-medium rounded border border-[#DCFCE7]">{name}</span>
                              ))
                            : <span className="text-xs text-[#9CA3AF]">No data yet</span>
                          }
                      </div>
                  </div>
              </div>
          </div>

          {/* Active Vendor List */}
          <div className="lg:col-span-2 bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
              <h3 className="font-bold text-[#212121]">Live Vendor Dashboard</h3>
              <div className="relative">
                 <button 
                   onClick={() => setShowFilterMenu(!showFilterMenu)}
                   className="text-xs font-medium px-2 py-1 bg-[#E0E7FF] text-[#4F46E5] rounded hover:bg-[#C7D2FE] flex items-center gap-2"
                 >
                   Filter: {filterStatus === 'all' ? 'All' : filterStatus}
                   <ChevronDown size={16} className={`transition-transform duration-200 ${showFilterMenu ? 'rotate-180' : ''}`} />
                 </button>
                 {/* Filter Dropdown Menu */}
                 {showFilterMenu && (
                   <>
                     <div 
                       className="fixed inset-0 z-10" 
                       onClick={() => setShowFilterMenu(false)}
                     />
                     <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-20 py-1">
                       <button 
                         onClick={() => { setFilterStatus('all'); setShowFilterMenu(false); }}
                         className="w-full px-4 py-2.5 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] flex items-center gap-3 transition-colors"
                       >
                         <span>All</span>
                       </button>
                       <button 
                         onClick={() => { setFilterStatus('active'); setShowFilterMenu(false); }}
                         className="w-full px-4 py-2.5 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] flex items-center gap-3 transition-colors"
                       >
                         <span>Active</span>
                       </button>
                       <button 
                         onClick={() => { setFilterStatus('review'); setShowFilterMenu(false); }}
                         className="w-full px-4 py-2.5 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] flex items-center gap-3 transition-colors"
                       >
                         <span>Review Due</span>
                       </button>
                       <button 
                         onClick={() => { setFilterStatus('hold'); setShowFilterMenu(false); }}
                         className="w-full px-4 py-2.5 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] flex items-center gap-3 transition-colors"
                       >
                         <span>On Hold</span>
                       </button>
                     </div>
                   </>
                 )}
              </div>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
                <tr>
                  <th className="px-6 py-3">Vendor Name</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Rating</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E0E0]">
                {filteredVendors.map((vendor, index) => (
                  <tr key={index} className="hover:bg-[#FAFAFA]">
                    <td className="px-6 py-4">
                        <p className="font-medium text-[#212121]">{vendor.name}</p>
                        <p className="text-xs text-[#757575]">ID: {vendor.code || vendor.id}</p>
                    </td>
                    <td className="px-6 py-4 text-[#616161]">{vendor.category}</td>
                    <td className="px-6 py-4 flex items-center gap-1 text-[#F59E0B] font-bold">
                      <Star size={14} fill="#F59E0B" /> {vendor.rating}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        vendor.statusColor === 'green' ? 'bg-[#DCFCE7] text-[#166534]' :
                        vendor.statusColor === 'yellow' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        'bg-[#FEE2E2] text-[#991B1B]'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[#4F46E5] hover:text-[#4338CA] font-medium text-xs" onClick={() => handleViewVendor(vendor)}>
                        {vendor.statusColor === 'red' ? 'Manage' : 'Profile'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>

      {/* Add Vendor Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsDialogOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-[#212121] text-lg">{isEditing ? 'Edit Vendor' : 'Add New Vendor'}</h3>
              <button 
                onClick={() => {
                  setIsDialogOpen(false);
                  setIsEditing(false);
                  setSelectedVendor(null);
                  setFormData({ name: '', category: '', contactPerson: '', email: '', phone: '' });
                }}
                className="text-[#616161] hover:text-[#212121] p-1 hover:bg-[#F5F5F5] rounded"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#212121] mb-2">
                  Vendor Name <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter vendor name"
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#212121] mb-2">
                  Category <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  required
                >
                  <option value="">Select category</option>
                  <option value="Grocery / Spices">Grocery / Spices</option>
                  <option value="Dairy / Perishables">Dairy / Perishables</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Frozen Foods">Frozen Foods</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Fresh Produce">Fresh Produce</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Cleaning Supplies">Cleaning Supplies</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#212121] mb-2">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Primary contact name"
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[#212121] mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vendor@example.com"
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#212121] mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1 px-4 py-2 border border-[#E0E0E0] rounded-lg text-sm font-bold text-[#616161] hover:bg-[#F5F5F5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:bg-[#4338CA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : (isEditing ? 'Update Vendor' : 'Add Vendor')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Detail Dialog */}
      {showVendorDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowVendorDetail(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-[#212121] text-lg">Vendor Details</h3>
              <button 
                onClick={() => setShowVendorDetail(false)}
                className="text-[#616161] hover:text-[#212121] p-1 hover:bg-[#F5F5F5] rounded"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-[#212121]">Vendor Name</span>
                    <span className="font-bold text-[#212121]">{selectedVendor.name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-[#212121]">Category</span>
                    <span className="font-bold text-[#212121]">{selectedVendor.category}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-[#212121]">Rating</span>
                    <span className="font-bold text-[#F59E0B]">{selectedVendor.rating}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-[#212121]">Status</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedVendor.statusColor === 'green' ? 'bg-[#DCFCE7] text-[#166534]' :
                      selectedVendor.statusColor === 'yellow' ? 'bg-[#FEF3C7] text-[#92400E]' :
                      'bg-[#FEE2E2] text-[#991B1B]'
                    }`}>
                      {selectedVendor.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-[#212121]">Contact Person</span>
                    <span className="font-bold text-[#212121]">{selectedVendor.contactPerson}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-[#212121]">Email</span>
                    <span className="font-bold text-[#212121]">{selectedVendor.email}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-[#212121]">Phone</span>
                    <span className="font-bold text-[#212121]">{selectedVendor.phone}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleEditVendor}
                  className="flex-1 px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:bg-[#4338CA] transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleVendorStatus(selectedVendor.id)}
                  className="flex-1 px-4 py-2 border border-[#E0E0E0] rounded-lg text-sm font-bold text-[#616161] hover:bg-[#F5F5F5] transition-colors"
                >
                  {selectedVendor.statusColor === 'red' ? 'Activate' : 'Hold'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}