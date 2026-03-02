import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, Upload, Star, X, 
  MoreVertical, Eye, Edit, FileText, MessageSquare,
  BarChart3, Pause, XCircle, Trash2, CheckCircle,
  AlertTriangle, MapPin, Building2, CreditCard, Upload as UploadIcon
} from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { EmptyState, LoadingState, FilterChip, ResultCount } from '../../ui/ux-components';
import { DeleteConfirmation, StatusChangeConfirmation } from '../../ui/confirmation-dialog';
import { toast } from 'sonner';
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

interface AddVendorFormData {
  // Basic Info
  vendorName: string;
  vendorType: string;
  category: string;
  tier: string;
  description: string;
  // Contact
  contactPerson: string;
  phonePrimary: string;
  phoneAlternate: string;
  email: string;
  // Address
  fullAddress: string;
  city: string;
  state: string;
  postalCode: string;
  // Bank Details
  gstNumber: string;
  panNumber: string;
  bankAccount: string;
  bankName: string;
  ifscCode: string;
  accountHolder: string;
  accountType: string;
}

export function VendorList() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addVendorLoading, setAddVendorLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'basic' | 'contact' | 'bank' | 'documents'>('basic');
  const [formData, setFormData] = useState<AddVendorFormData>({
    vendorName: '',
    vendorType: '',
    category: '',
    tier: '',
    description: '',
    contactPerson: '',
    phonePrimary: '',
    phoneAlternate: '',
    email: '',
    fullAddress: '',
    city: '',
    state: '',
    postalCode: '',
    gstNumber: '',
    panNumber: '',
    bankAccount: '',
    bankName: '',
    ifscCode: '',
    accountHolder: '',
    accountType: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '', name: '' });
  
  const handleDeleteVendor = (id: string, name: string) => {
    setDeleteDialog({ open: true, id, name });
  };

  const confirmDelete = () => {
    setVendors(prev => prev.filter(v => v.id !== deleteDialog.id));
    toast.success(`Vendor ${deleteDialog.name} has been removed`);
    setDeleteDialog({ open: false, id: '', name: '' });
  };
 
  // Load vendors from backend on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await vendorApi.listVendors({ page: 1, pageSize: 25 });
        // support multiple shapes: { data: [...] } or { items: [...] } or direct array
        let items = resp && (resp.data || resp.items) ? resp.data || resp.items : resp;
        if (items && items.pagination && Array.isArray(items.data)) items = items.data;
        if (!Array.isArray(items)) items = [];
        if (mounted) setVendors(items);
      } catch (err) {
        console.error('Failed to load vendors', err);
        toast.error('Failed to load vendors — showing demo data');
        // keep vendors empty if backend unavailable
      } finally {
        if (mounted) setIsInitialLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    (async () => {
      setAddVendorLoading(true);
      try {
        const payload = {
          name: formData.vendorName,
          type: formData.vendorType || 'manufacturer',
          contactEmail: formData.email,
          contactName: formData.contactPerson,
          contactPhone: formData.phonePrimary || formData.phoneAlternate,
          metadata: {
            address: formData.fullAddress,
            gstNumber: formData.gstNumber,
          },
        };
        const resp = await vendorApi.createVendor(payload);
        const created = resp && (resp.data || resp) ? resp.data || resp : null;
        if (created) {
          setVendors(prev => [created, ...prev]);
          toast.success(`Vendor ${created.name} added`);
        } else {
          toast.success('Vendor created');
        }
        setIsAddModalOpen(false);
        // reset form
        setFormData({
          vendorName: '',
          vendorType: '',
          category: '',
          tier: '',
          description: '',
          contactPerson: '',
          phonePrimary: '',
          phoneAlternate: '',
          email: '',
          fullAddress: '',
          city: '',
          state: '',
          postalCode: '',
          gstNumber: '',
          panNumber: '',
          bankAccount: '',
          bankName: '',
          ifscCode: '',
          accountHolder: '',
          accountType: ''
        });
        setActiveSection('basic');
      } catch (err) {
        console.error('Failed to create vendor', err);
        toast.error('Failed to create vendor');
      } finally {
        setAddVendorLoading(false);
      }
    })();
  };
  
  const hasActiveFilters = Boolean(searchQuery) || statusFilter !== 'All Status' || categoryFilter !== 'All Categories';

  // Filtered vendors computed from search and filters
  const filteredVendors = vendors.filter(v => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || v.name.toLowerCase().includes(q) || v.id.toLowerCase().includes(q) || v.phone.toLowerCase().includes(q) || v.email.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All Status' || v.status === statusFilter;
    const matchesCategory = categoryFilter === 'All Categories' || v.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        title="Vendor List"
        subtitle="Comprehensive vendor database with contact details, compliance, and operational status."
      />

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6B7280]" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vendor name, ID, phone, email..."
                className="w-full pl-10 pr-4 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>
          
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
            <option>Suspended</option>
            <option>Under Review</option>
          </select>

          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
          >
            <option>All Categories</option>
            <option>Vegetables</option>
            <option>Fruits</option>
            <option>Spices</option>
            <option>Dairy / Perishables</option>
            <option>Packaged Goods</option>
            <option>Fresh Produce</option>
            <option>Packaging</option>
          </select>

          {hasActiveFilters && (
            <button 
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('All Status');
                setCategoryFilter('All Categories');
              }}
              className="text-sm text-[#4F46E5] hover:underline font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-[#6B7280]">
        Showing {filteredVendors.length} of {vendors.length} vendors
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        {filteredVendors.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="font-bold text-[#1F2937] mb-2">No vendors found</h3>
            <p className="text-[#6B7280] text-sm mb-6">
              {searchQuery || statusFilter !== 'All Status' || categoryFilter !== 'All Categories'
                ? 'Try adjusting your filters'
                : 'Ready to add your first vendor?'}
            </p>
            {!searchQuery && statusFilter === 'All Status' && categoryFilter === 'All Categories' && (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="px-6 py-2 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#4338CA]"
              >
                + Add Vendor
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] text-[#6B7280] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-3 text-left">Vendor ID</th>
                  <th className="px-6 py-3 text-left">Vendor Name</th>
                  <th className="px-6 py-3 text-left">Category</th>
                  <th className="px-6 py-3 text-left">Phone No.</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Address</th>
                  <th className="px-6 py-3 text-left">Compliance</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-[#F3F4F6] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-[#6B7280]">{vendor.id}</td>
                    <td className="px-6 py-4 font-semibold text-[#1F2937]">{vendor.name}</td>
                    <td className="px-6 py-4 text-[#6B7280]">{vendor.category}</td>
                    <td className="px-6 py-4 text-[#1F2937]">{vendor.phone}</td>
                    <td className="px-6 py-4">
                      <a href={`mailto:${vendor.email}`} className="text-[#4F46E5] hover:underline">
                        {vendor.email}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-[#6B7280] max-w-[200px] truncate" title={vendor.address}>
                      {vendor.address}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        vendor.complianceStatus === 'Compliant' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        vendor.complianceStatus === 'Pending' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        'bg-[#FEE2E2] text-[#7F1D1D]'
                      }`}>
                        {vendor.complianceStatus === 'Compliant' && '✓'}
                        {vendor.complianceStatus === 'Pending' && '⚠'}
                        {vendor.complianceStatus === 'Non-Compliant' && '✕'}
                        {vendor.complianceStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        vendor.status === 'Active' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        vendor.status === 'Inactive' ? 'bg-[#FEE2E2] text-[#7F1D1D]' :
                        vendor.status === 'Suspended' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        'bg-[#EDE9FE] text-[#5B21B6]'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 relative">
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === vendor.id ? null : vendor.id)}
                        className="p-1 hover:bg-[#F3F4F6] rounded"
                      >
                        <MoreVertical size={18} className="text-[#6B7280]" />
                      </button>
                      
                      {openMenuId === vendor.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 top-8 z-20 bg-white border border-[#E5E7EB] rounded-lg shadow-xl py-1 w-56">
                            <button className="w-full px-4 py-2 text-left text-sm hover:bg-[#F3F4F6] flex items-center gap-2 text-[#4F46E5]">
                              <Eye size={14} /> View Details
                            </button>
                            <button className="w-full px-4 py-2 text-left text-sm hover:bg-[#F3F4F6] flex items-center gap-2 text-[#4F46E5]">
                              <Edit size={14} /> Edit Vendor
                            </button>
                            <button className="w-full px-4 py-2 text-left text-sm hover:bg-[#F3F4F6] flex items-center gap-2 text-[#1F2937]">
                              <FileText size={14} /> View Documents
                            </button>
                            <button className="w-full px-4 py-2 text-left text-sm hover:bg-[#F3F4F6] flex items-center gap-2 text-[#1F2937]">
                              <MessageSquare size={14} /> Send Message
                            </button>
                            <button className="w-full px-4 py-2 text-left text-sm hover:bg-[#F3F4F6] flex items-center gap-2 text-[#1F2937]">
                              <BarChart3 size={14} /> Performance Report
                            </button>
                            <div className="border-t border-[#E5E7EB] my-1" />
                            <button className="w-full px-4 py-2 text-left text-sm hover:bg-[#FEF3C7] flex items-center gap-2 text-[#92400E]">
                              <Pause size={14} /> Suspend Vendor
                            </button>
                            <button className="w-full px-4 py-2 text-left text-sm hover:bg-[#FEE2E2] flex items-center gap-2 text-[#EF4444]">
                              <XCircle size={14} /> Deactivate
                            </button>
                            <button 
                              onClick={() => handleDeleteVendor(vendor.id, vendor.name)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-[#FEE2E2] flex items-center gap-2 text-[#EF4444]"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Vendor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsAddModalOpen(false)}>
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E5E7EB]">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-[#1F2937]">Add New Vendor</h2>
                  <p className="text-sm text-[#6B7280] mt-1">Fill in vendor details to get started</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-[#6B7280] hover:text-[#1F2937] p-1 hover:bg-[#F3F4F6] rounded"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Section Tabs */}
              <div className="flex gap-2 mt-4 overflow-x-auto">
                <button
                  onClick={() => setActiveSection('basic')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
                    activeSection === 'basic'
                      ? 'bg-[#4F46E5] text-white'
                      : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                  }`}
                >
                  Basic Info
                </button>
                <button
                  onClick={() => setActiveSection('contact')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
                    activeSection === 'contact'
                      ? 'bg-[#4F46E5] text-white'
                      : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                  }`}
                >
                  Contact & Address
                </button>
                <button
                  onClick={() => setActiveSection('bank')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
                    activeSection === 'bank'
                      ? 'bg-[#4F46E5] text-white'
                      : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                  }`}
                >
                  Bank Details
                </button>
                <button
                  onClick={() => setActiveSection('documents')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
                    activeSection === 'documents'
                      ? 'bg-[#4F46E5] text-white'
                      : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                  }`}
                >
                  Documents
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6">
                {/* SECTION: Basic Information */}
                {activeSection === 'basic' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-[#1F2937] mb-4">Basic Information</h3>
                    
                    <div>
                      <label className="block text-sm font-bold text-[#1F2937] mb-2">
                        Vendor Name <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.vendorName}
                        onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                        placeholder="e.g., Fresh Farms Inc."
                        className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#1F2937] mb-2">
                        Vendor ID (Auto-generated)
                      </label>
                      <input
                        type="text"
                        value={`VND-${Math.floor(1000 + Math.random() * 9000)}`}
                        disabled
                        className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg text-sm text-[#6B7280]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#1F2937] mb-2">
                        Vendor Type <span className="text-[#EF4444]">*</span>
                      </label>
                      <div className="space-y-2">
                        {['Farmer / Producer', 'Distributor / Wholesaler', 'Aggregator', 'Third-party Vendor'].map((type) => (
                          <label key={type} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="vendorType"
                              value={type}
                              checked={formData.vendorType === type}
                              onChange={(e) => setFormData({ ...formData, vendorType: e.target.value })}
                              className="text-[#4F46E5] focus:ring-[#4F46E5]"
                            />
                            <span className="text-sm text-[#1F2937]">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#1F2937] mb-2">
                        Category <span className="text-[#EF4444]">*</span>
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                        required
                      >
                        <option value="">Select category</option>
                        <option value="Vegetables">Vegetables</option>
                        <option value="Fruits">Fruits</option>
                        <option value="Spices">Spices</option>
                        <option value="Dairy / Perishables">Dairy / Perishables</option>
                        <option value="Packaged Goods">Packaged Goods</option>
                        <option value="Fresh Produce">Fresh Produce</option>
                        <option value="Organic">Organic</option>
                        <option value="Non-Veg">Non-Veg</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#1F2937] mb-2">
                        Vendor Tier <span className="text-[#EF4444]">*</span>
                      </label>
                      <div className="space-y-2">
                        {[
                          { value: 'Preferred', desc: 'Priority vendor with priority support' },
                          { value: 'Standard', desc: 'Regular vendor' },
                          { value: 'New', desc: 'Fresh vendor' }
                        ].map((tier) => (
                          <label key={tier.value} className="flex items-start gap-2">
                            <input
                              type="radio"
                              name="tier"
                              value={tier.value}
                              checked={formData.tier === tier.value}
                              onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                              className="text-[#4F46E5] focus:ring-[#4F46E5] mt-1"
                            />
                            <div>
                              <span className="text-sm font-medium text-[#1F2937]">{tier.value}</span>
                              <p className="text-xs text-[#6B7280]">{tier.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#1F2937] mb-2">
                        Short Description (Optional)
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="e.g., Local organic farm producing fresh vegetables..."
                        maxLength={500}
                        rows={3}
                        className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      />
                      <div className="text-xs text-[#6B7280] text-right mt-1">{formData.description.length}/500</div>
                    </div>
                  </div>
                )}

                {/* SECTION: Contact & Address */}
                {activeSection === 'contact' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-[#1F2937] mb-4">Contact & Address</h3>
                    
                    <div>
                      <label className="block text-sm font-bold text-[#1F2937] mb-2">
                        Primary Contact Person <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        placeholder="John Doe"
                        className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-[#1F2937] mb-2">
                          Phone Number <span className="text-[#EF4444]">*</span>
                        </label>
                        <input
                          type="tel"
                          value={formData.phonePrimary}
                          onChange={(e) => setFormData({ ...formData, phonePrimary: e.target.value })}
                          placeholder="+91-9876543210"
                          className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-[#1F2937] mb-2">
                          Alternate Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.phoneAlternate}
                          onChange={(e) => setFormData({ ...formData, phoneAlternate: e.target.value })}
                          placeholder="+91-9876543211"
                          className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#1F2937] mb-2">
                        Email <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="vendor@example.com"
                        className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#1F2937] mb-2">
                        Full Address <span className="text-[#EF4444]">*</span>
                      </label>
                      <textarea
                        value={formData.fullAddress}
                        onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                        placeholder="123 Market Street, Koyambedu..."
                        rows={2}
                        className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-[#1F2937] mb-2">
                          City <span className="text-[#EF4444]">*</span>
                        </label>
                        <select
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                        >
                          <option value="">Select city</option>
                          <option value="Chennai">Chennai</option>
                          <option value="Coimbatore">Coimbatore</option>
                          <option value="Madurai">Madurai</option>
                          <option value="Salem">Salem</option>
                          <option value="Tiruppur">Tiruppur</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-[#1F2937] mb-2">
                          State <span className="text-[#EF4444]">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#1F2937] mb-2">
                        Postal Code <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        placeholder="600001"
                        maxLength={6}
                        className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        className="flex items-center gap-2 px-4 py-2 bg-[#F3F4F6] text-[#1F2937] rounded-lg hover:bg-[#E5E7EB] text-sm font-medium"
                      >
                        <MapPin size={16} />
                        Pin on Map (Optional)
                      </button>
                    </div>
                  </div>
                )}

                {/* SECTION: Bank Details */}
                {activeSection === 'bank' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-[#1F2937] mb-4">Bank & Financial Details</h3>
                    
                    <div>
                      <label className="block text-sm font-bold text-[#1F2937] mb-2">
                        GST Number <span className="text-[#EF4444]">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.gstNumber}
                          onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                          placeholder="Enter 15-char GST number"
                          maxLength={15}
                          className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                        />
                        <button
                          type="button"
                          className="px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] text-sm font-medium"
                        >
                          Verify
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#1F2937] mb-2">
                        PAN Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.panNumber}
                        onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                        placeholder="AAAAA0000A"
                        maxLength={10}
                        className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#1F2937] mb-2">
                        Bank Account Number <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.bankAccount}
                        onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                        placeholder="Enter account number"
                        className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-[#1F2937] mb-2">
                          Bank Name <span className="text-[#EF4444]">*</span>
                        </label>
                        <select
                          value={formData.bankName}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                          className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                        >
                          <option value="">Select bank</option>
                          <option value="ICICI Bank">ICICI Bank</option>
                          <option value="HDFC Bank">HDFC Bank</option>
                          <option value="State Bank of India">State Bank of India</option>
                          <option value="Axis Bank">Axis Bank</option>
                          <option value="Kotak Mahindra">Kotak Mahindra</option>
                          <option value="Punjab National Bank">Punjab National Bank</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-[#1F2937] mb-2">
                          IFSC Code <span className="text-[#EF4444]">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.ifscCode}
                          onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                          placeholder="ICIC0000001"
                          maxLength={11}
                          className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#1F2937] mb-2">
                        Account Holder Name <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.accountHolder}
                        onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                        placeholder="Account holder name"
                        className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#1F2937] mb-2">
                        Account Type <span className="text-[#EF4444]">*</span>
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="accountType"
                            value="Savings"
                            checked={formData.accountType === 'Savings'}
                            onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                            className="text-[#4F46E5] focus:ring-[#4F46E5]"
                          />
                          <span className="text-sm text-[#1F2937]">Savings</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="accountType"
                            value="Current"
                            checked={formData.accountType === 'Current'}
                            onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                            className="text-[#4F46E5] focus:ring-[#4F46E5]"
                          />
                          <span className="text-sm text-[#1F2937]">Current</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION: Documents */}
                {activeSection === 'documents' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-[#1F2937] mb-4">Document Upload</h3>
                    <p className="text-sm text-[#6B7280] mb-4">Upload required documents for KYC verification</p>
                    
                    {[
                      { name: 'FSSAI License', required: false, desc: 'For food vendors' },
                      { name: 'GST Certificate', required: true, desc: 'If GST registered' },
                      { name: 'Business License', required: false, desc: 'Optional' },
                      { name: 'ISO Certificate', required: false, desc: 'Optional' },
                      { name: 'Insurance Certificate', required: false, desc: 'Optional' }
                    ].map((doc) => (
                      <div key={doc.name} className="border-2 border-dashed border-[#D1D5DB] rounded-lg p-4 hover:border-[#4F46E5] transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <label className="block text-sm font-bold text-[#1F2937]">
                              {doc.name} {doc.required && <span className="text-[#EF4444]">*</span>}
                            </label>
                            <p className="text-xs text-[#6B7280]">{doc.desc}</p>
                          </div>
                          <FileText size={24} className="text-[#6B7280]" />
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="w-full text-sm text-[#6B7280] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#4F46E5] file:text-white hover:file:bg-[#4338CA]"
                        />
                        <p className="text-xs text-[#6B7280] mt-2">Accepted: PDF, JPG, PNG (max 5MB)</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-between items-center">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded text-[#4F46E5] focus:ring-[#4F46E5]" />
                  <span className="text-sm text-[#6B7280]">Save as draft</span>
                </label>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-6 py-2 border border-[#D1D5DB] rounded-lg text-sm font-bold text-[#1F2937] hover:bg-[#F3F4F6] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addVendorLoading}
                    className="px-6 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:bg-[#4338CA] transition-colors disabled:opacity-60"
                  >
                    {addVendorLoading ? 'Saving...' : 'Save & Continue'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        itemName={deleteDialog.name}
        onConfirm={confirmDelete}
        description="This vendor and all associated records will be permanently removed from the system."
      />
    </div>
  );
}