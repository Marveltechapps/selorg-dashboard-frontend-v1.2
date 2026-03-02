import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Plus, 
  Filter, 
  ChevronDown, 
  MoreVertical,
  X,
  Calendar,
  CloudUpload,
  Download,
  CheckCircle,
  AlertCircle,
  XCircle,
  Pause,
  FileText,
  Edit,
  Share2,
  FileDown
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// Types
type POStatus = 'Pending Approval' | 'Sent' | 'Partially Received' | 'Fully Received' | 'Cancelled' | 'On Hold';
type PaymentTerms = 'Net 15' | 'Net 30' | 'COD' | 'Custom';
type POType = 'Standard' | 'Blanket PO' | 'Contract Release';

interface LineItem {
  sku: string;
  product: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  vendorContact: string;
  vendorEmail: string;
  vendorPhone: string;
  createdDate: string;
  deliveryDue: string;
  totalValue: number;
  status: POStatus;
  poType: POType;
  category: string;
  referenceNumber?: string;
  paymentTerms: PaymentTerms;
  lineItems: LineItem[];
  notes?: string;
  subtotal: number;
  tax: number;
  createdBy: string;
  sentDate?: string;
  receivedDate?: string;
  quantityReceived?: number;
  totalQuantity?: number;
}

// Mock Data
const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: '1',
    poNumber: 'PO-2024-0012',
    vendor: 'Fresh Farms Inc.',
    vendorContact: 'John Smith',
    vendorEmail: 'john@freshfarms.com',
    vendorPhone: '+1 234 567 8900',
    createdDate: 'Oct 15, 2024',
    deliveryDue: 'Oct 20, 2024',
    totalValue: 4500.00,
    status: 'Pending Approval',
    poType: 'Standard',
    category: 'Fruits & Vegetables',
    referenceNumber: 'REF-2024-001',
    paymentTerms: 'Net 30',
    lineItems: [
      { sku: 'SKU-001', product: 'Tomatoes (Fresh)', quantity: 100, unit: 'kg', unitPrice: 2.50, total: 250.00 },
      { sku: 'SKU-002', product: 'Onions (White)', quantity: 50, unit: 'kg', unitPrice: 1.80, total: 90.00 },
      { sku: 'SKU-003', product: 'Potatoes (Organic)', quantity: 200, unit: 'kg', unitPrice: 1.50, total: 300.00 },
    ],
    subtotal: 4500.00,
    tax: 0,
    createdBy: 'Sarah Johnson',
    notes: 'Please ensure all items are fresh and delivered before 10 AM.',
  },
  {
    id: '2',
    poNumber: 'PO-2024-0011',
    vendor: 'Tech Logistics',
    vendorContact: 'Mike Chen',
    vendorEmail: 'mike@techlogistics.com',
    vendorPhone: '+1 234 567 8901',
    createdDate: 'Oct 14, 2024',
    deliveryDue: 'Oct 18, 2024',
    totalValue: 1200.00,
    status: 'Sent',
    poType: 'Standard',
    category: 'Equipment',
    paymentTerms: 'Net 15',
    lineItems: [
      { sku: 'SKU-101', product: 'Delivery Boxes', quantity: 500, unit: 'units', unitPrice: 2.00, total: 1000.00 },
      { sku: 'SKU-102', product: 'Packing Tape', quantity: 20, unit: 'rolls', unitPrice: 10.00, total: 200.00 },
    ],
    subtotal: 1200.00,
    tax: 0,
    createdBy: 'David Lee',
    sentDate: 'Oct 14, 2024',
  },
  {
    id: '3',
    poNumber: 'PO-2024-0009',
    vendor: 'Dairy Delights',
    vendorContact: 'Emma Watson',
    vendorEmail: 'emma@dairydelights.com',
    vendorPhone: '+1 234 567 8902',
    createdDate: 'Oct 10, 2024',
    deliveryDue: 'Oct 12, 2024',
    totalValue: 850.00,
    status: 'Partially Received',
    poType: 'Standard',
    category: 'Dairy Products',
    paymentTerms: 'Net 30',
    lineItems: [
      { sku: 'SKU-201', product: 'Milk (Full Cream)', quantity: 800, unit: 'L', unitPrice: 0.80, total: 640.00 },
      { sku: 'SKU-202', product: 'Yogurt (Greek)', quantity: 200, unit: 'units', unitPrice: 1.05, total: 210.00 },
    ],
    subtotal: 850.00,
    tax: 0,
    createdBy: 'Sarah Johnson',
    sentDate: 'Oct 10, 2024',
    quantityReceived: 500,
    totalQuantity: 1000,
  },
  {
    id: '4',
    poNumber: 'PO-2024-0008',
    vendor: 'Fresh Farms Inc.',
    vendorContact: 'John Smith',
    vendorEmail: 'john@freshfarms.com',
    vendorPhone: '+1 234 567 8900',
    createdDate: 'Oct 8, 2024',
    deliveryDue: 'Oct 10, 2024',
    totalValue: 3200.00,
    status: 'Fully Received',
    poType: 'Standard',
    category: 'Fruits & Vegetables',
    paymentTerms: 'Net 30',
    lineItems: [
      { sku: 'SKU-004', product: 'Apples (Red Delicious)', quantity: 150, unit: 'kg', unitPrice: 3.00, total: 450.00 },
      { sku: 'SKU-005', product: 'Bananas', quantity: 200, unit: 'kg', unitPrice: 1.50, total: 300.00 },
    ],
    subtotal: 3200.00,
    tax: 0,
    createdBy: 'David Lee',
    sentDate: 'Oct 8, 2024',
    receivedDate: 'Oct 10, 2024',
    quantityReceived: 350,
    totalQuantity: 350,
  },
  {
    id: '5',
    poNumber: 'PO-2024-0007',
    vendor: 'Tech Logistics',
    vendorContact: 'Mike Chen',
    vendorEmail: 'mike@techlogistics.com',
    vendorPhone: '+1 234 567 8901',
    createdDate: 'Oct 5, 2024',
    deliveryDue: 'Oct 7, 2024',
    totalValue: 950.00,
    status: 'Cancelled',
    poType: 'Standard',
    category: 'Equipment',
    paymentTerms: 'COD',
    lineItems: [
      { sku: 'SKU-103', product: 'Thermal Bags', quantity: 50, unit: 'units', unitPrice: 19.00, total: 950.00 },
    ],
    subtotal: 950.00,
    tax: 0,
    createdBy: 'Sarah Johnson',
    sentDate: 'Oct 5, 2024',
    notes: 'Cancelled due to vendor stock unavailability',
  },
  {
    id: '6',
    poNumber: 'PO-2024-0006',
    vendor: 'Dairy Delights',
    vendorContact: 'Emma Watson',
    vendorEmail: 'emma@dairydelights.com',
    vendorPhone: '+1 234 567 8902',
    createdDate: 'Oct 3, 2024',
    deliveryDue: 'Oct 5, 2024',
    totalValue: 1450.00,
    status: 'On Hold',
    poType: 'Blanket PO',
    category: 'Dairy Products',
    paymentTerms: 'Net 15',
    lineItems: [
      { sku: 'SKU-203', product: 'Cheese (Cheddar)', quantity: 100, unit: 'kg', unitPrice: 12.50, total: 1250.00 },
      { sku: 'SKU-204', product: 'Butter (Salted)', quantity: 40, unit: 'kg', unitPrice: 5.00, total: 200.00 },
    ],
    subtotal: 1450.00,
    tax: 0,
    createdBy: 'David Lee',
    sentDate: 'Oct 3, 2024',
    notes: 'On hold pending payment confirmation',
  },
];

// Status Badge Component
const StatusBadge: React.FC<{ status: POStatus }> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'Pending Approval':
        return {
          bg: '#FEF3C7',
          text: '#92400E',
          icon: <AlertCircle className="w-3 h-3" />
        };
      case 'Sent':
        return {
          bg: '#DCFCE7',
          text: '#166534',
          icon: <CheckCircle className="w-3 h-3" />
        };
      case 'Partially Received':
        return {
          bg: '#DBEAFE',
          text: '#1E40AF',
          icon: <AlertCircle className="w-3 h-3" />
        };
      case 'Fully Received':
        return {
          bg: '#DCFCE7',
          text: '#166534',
          icon: <CheckCircle className="w-3 h-3" />
        };
      case 'Cancelled':
        return {
          bg: '#FEE2E2',
          text: '#991B1B',
          icon: <XCircle className="w-3 h-3" />
        };
      case 'On Hold':
        return {
          bg: '#FEEDDE',
          text: '#9A3412',
          icon: <Pause className="w-3 h-3" />
        };
      default:
        return {
          bg: '#F3F4F6',
          text: '#6B7280',
          icon: null
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
      style={{ backgroundColor: styles.bg, color: styles.text }}
    >
      {styles.icon}
      {status}
    </div>
  );
};

// Main Component
export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders);
  const [statusFilter, setStatusFilter] = useState<string>('Status: All');
  const [vendorFilter, setVendorFilter] = useState<string>('Vendor: All');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);
  
  // New modal states for dropdown actions
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAddNotesModal, setShowAddNotesModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Form states for new modals
  const [cancelReason, setCancelReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [shareEmail, setShareEmail] = useState('');

  // Bulk upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create PO Form State
  const [createPOForm, setCreatePOForm] = useState({
    vendor: '',
    poType: 'Standard',
    category: '',
    referenceNumber: '',
    poDate: '',
    deliveryDue: '',
    paymentTerms: 'Net 30' as PaymentTerms,
    lineItems: [
      { sku: '', product: '', quantity: 0, unit: 'kg', unitPrice: 0, total: 0 }
    ],
    notes: '',
    attachments: [] as File[],
    saveAsDraft: false,
  });

  // Filter purchase orders
  const filteredOrders = purchaseOrders.filter(po => {
    const statusMatch = statusFilter === 'Status: All' || po.status === statusFilter.replace('Status: ', '');
    const vendorMatch = vendorFilter === 'Vendor: All' || po.vendor === vendorFilter.replace('Vendor: ', '');
    return statusMatch && vendorMatch;
  });

  // Get action button for status
  const getActionButton = (po: PurchaseOrder) => {
    switch (po.status) {
      case 'Pending Approval':
        return (
          <button
            onClick={() => {
              setSelectedPO(po);
              setShowDetailsModal(true);
            }}
            className="px-4 py-2 bg-[#4F46E5] text-white text-xs font-medium rounded-md hover:bg-[#4338CA] transition-all duration-200 hover:shadow-md"
          >
            Review
          </button>
        );
      case 'Sent':
        return (
          <button
            onClick={() => {
              setSelectedPO(po);
              setShowDetailsModal(true);
            }}
            className="px-4 py-2 bg-[#6B7280] text-white text-xs font-medium rounded-md hover:bg-[#4B5563] transition-all duration-200 hover:shadow-md"
          >
            View
          </button>
        );
      case 'Partially Received':
      case 'Fully Received':
        return (
          <button
            onClick={() => {
              setSelectedPO(po);
              setShowTrackingModal(true);
            }}
            className="px-4 py-2 bg-[#0EA5E9] text-white text-xs font-medium rounded-md hover:bg-[#0284C7] transition-all duration-200 hover:shadow-md"
          >
            Track
          </button>
        );
      default:
        return (
          <button
            onClick={() => {
              setSelectedPO(po);
              setShowDetailsModal(true);
            }}
            className="px-4 py-2 bg-[#6B7280] text-white text-xs font-medium rounded-md hover:bg-[#4B5563] transition-all duration-200 hover:shadow-md"
          >
            View
          </button>
        );
    }
  };

  // Add line item
  const addLineItem = () => {
    setCreatePOForm(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { sku: '', product: '', quantity: 0, unit: 'kg', unitPrice: 0, total: 0 }
      ]
    }));
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    setCreatePOForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = createPOForm.lineItems.reduce((sum, item) => sum + item.total, 0);
    const tax = 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const totals = calculateTotals();

  // Generate PO number
  const generatePONumber = () => {
    const year = new Date().getFullYear();
    const count = purchaseOrders.length + 1;
    return `PO-${year}-${String(count).padStart(4, '0')}`;
  };

  // Handle download template
  const handleDownloadTemplate = () => {
    try {
      // Create a simple Excel-like CSV template
      const csvContent = `Vendor,PO Type,Category,PO Date,Delivery Due,Payment Terms,SKU,Product,Quantity,Unit,Unit Price,Notes
Fresh Farms Inc.,Standard,Fruits & Vegetables,2024-10-15,2024-10-20,Net 30,SKU-001,Tomatoes,100,kg,2.50,Please ensure fresh delivery
Tech Logistics,Standard,Equipment,2024-10-14,2024-10-18,Net 15,SKU-101,Delivery Boxes,500,units,2.00,Standard packaging`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'purchase-order-template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Template downloaded successfully');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  // Handle file selection for bulk upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setUploadFile(file);
        // Simulate preview data
        setUploadPreview([
          { vendor: 'Fresh Farms Inc.', items: 3, total: 4500.00 },
          { vendor: 'Tech Logistics', items: 2, total: 1200.00 },
        ]);
        toast.success(`File selected: ${file.name}`);
      } else {
        toast.error('Please select a CSV or Excel file');
      }
    }
  };

  // Handle bulk upload
  const handleBulkUpload = () => {
    if (!uploadFile) {
      toast.error('Please select a file first');
      return;
    }
    // Simulate upload
    toast.success(`Successfully uploaded ${uploadPreview.length} purchase orders`);
    setShowBulkUploadModal(false);
    setUploadFile(null);
    setUploadPreview([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file attachment for create PO
  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setCreatePOForm(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...files]
      }));
      toast.success(`${files.length} file(s) attached`);
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setCreatePOForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  // Handle create PO
  const handleCreatePO = (send: boolean = false) => {
    // Validation
    if (!createPOForm.vendor) {
      toast.error('Please select a vendor');
      return;
    }
    if (!createPOForm.category) {
      toast.error('Please select a category');
      return;
    }
    if (!createPOForm.poDate || !createPOForm.deliveryDue) {
      toast.error('Please select PO date and delivery due date');
      return;
    }
    if (createPOForm.lineItems.length === 0 || createPOForm.lineItems.every(item => !item.product || item.quantity === 0)) {
      toast.error('Please add at least one line item');
      return;
    }

    // Create new PO
    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: generatePONumber(),
      vendor: createPOForm.vendor,
      vendorContact: 'Contact Person', // Would come from vendor data
      vendorEmail: 'vendor@example.com', // Would come from vendor data
      vendorPhone: '+1 234 567 8900', // Would come from vendor data
      createdDate: createPOForm.poDate ? new Date(createPOForm.poDate).toLocaleDateString() : new Date().toLocaleDateString(),
      deliveryDue: createPOForm.deliveryDue ? new Date(createPOForm.deliveryDue).toLocaleDateString() : new Date().toLocaleDateString(),
      totalValue: totals.total,
      status: send ? 'Sent' : (createPOForm.saveAsDraft ? 'Pending Approval' : 'Pending Approval'),
      poType: createPOForm.poType as POType,
      category: createPOForm.category,
      referenceNumber: createPOForm.referenceNumber || undefined,
      paymentTerms: createPOForm.paymentTerms,
      lineItems: createPOForm.lineItems.filter(item => item.product && item.quantity > 0),
      notes: createPOForm.notes || undefined,
      subtotal: totals.subtotal,
      tax: totals.tax,
      createdBy: 'Current User', // Would come from auth
      sentDate: send ? new Date().toLocaleDateString() : undefined,
    };

    // Add to purchase orders
    setPurchaseOrders(prev => [newPO, ...prev]);
    
    // Reset form
    setCreatePOForm({
      vendor: '',
      poType: 'Standard',
      category: '',
      referenceNumber: '',
      poDate: '',
      deliveryDue: '',
      paymentTerms: 'Net 30',
      lineItems: [
        { sku: '', product: '', quantity: 0, unit: 'kg', unitPrice: 0, total: 0 }
      ],
      notes: '',
      attachments: [],
      saveAsDraft: false,
    });
    
    setShowCreateModal(false);
    toast.success(send ? `Purchase order ${newPO.poNumber} created and sent successfully` : `Purchase order ${newPO.poNumber} saved as draft`);
  };

  // Handle save draft
  const handleSaveDraft = () => {
    handleCreatePO(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-[#E5E7EB] bg-white px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-[32px] font-bold text-[#1F2937]">Purchase Orders</h1>
            <div className="px-3 py-1 bg-[#EFF6FF] rounded-xl">
              <span className="text-xs font-bold text-[#1E40AF]">COMPLIANT</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-[#6B7280]">
            Create, approve, and track purchase orders
          </p>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowBulkUploadModal(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              <Upload className="w-4 h-4" />
              Bulk Upload
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA] transition-all duration-200 hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Create PO
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#6B7280]" />
            <span className="text-sm font-medium text-[#1F2937]">Filters:</span>
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none w-[180px] h-10 px-3 pr-8 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
            >
              <option>Status: All</option>
              <option>Pending Approval</option>
              <option>Sent</option>
              <option>Partially Received</option>
              <option>Fully Received</option>
              <option>Cancelled</option>
              <option>On Hold</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="appearance-none w-[180px] h-10 px-3 pr-8 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
            >
              <option>Vendor: All</option>
              <option>Fresh Farms Inc.</option>
              <option>Tech Logistics</option>
              <option>Dairy Delights</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wide">
                    PO Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wide">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wide">
                    Created Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wide">
                    Delivery Due
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-[#6B7280] uppercase tracking-wide">
                    Total Value
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-[#6B7280] uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-[#6B7280] uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#E5E7EB]">
                {filteredOrders.map((po) => (
                  <tr 
                    key={po.id}
                    className="hover:bg-[#F9FAFB] transition-colors duration-100 cursor-pointer"
                  >
                    <td className="px-4 py-4 text-sm text-[#1F2937] font-medium">
                      {po.poNumber}
                    </td>
                    <td className="px-4 py-4 text-sm text-[#1F2937]">
                      {po.vendor}
                    </td>
                    <td className="px-4 py-4 text-sm text-[#1F2937]">
                      {po.createdDate}
                    </td>
                    <td className="px-4 py-4 text-sm text-[#1F2937]">
                      {po.deliveryDue}
                    </td>
                    <td className="px-4 py-4 text-sm text-[#1F2937] text-right font-medium">
                      ₹{po.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusBadge status={po.status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {getActionButton(po)}
                        <div className="relative">
                          <button
                            onClick={() => setShowMoreMenu(showMoreMenu === po.id ? null : po.id)}
                            className="p-1.5 border border-[#D1D5DB] rounded hover:bg-[#F3F4F6] hover:border-[#9CA3AF] transition-all duration-200"
                          >
                            <MoreVertical className="w-4 h-4 text-[#6B7280]" />
                          </button>
                          {showMoreMenu === po.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-10">
                              <button 
                                onClick={() => {
                                  setSelectedPO(po);
                                  setShowDetailsModal(true);
                                  setShowMoreMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] flex items-center gap-2"
                              >
                                <FileText className="w-4 h-4" />
                                View Details
                              </button>
                              {po.status === 'Pending Approval' && (
                                <button 
                                  onClick={() => {
                                    setSelectedPO(po);
                                    setShowEditModal(true);
                                    setShowMoreMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] flex items-center gap-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  setSelectedPO(po);
                                  setShowCancelModal(true);
                                  setShowMoreMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] flex items-center gap-2"
                              >
                                <XCircle className="w-4 h-4" />
                                Cancel PO
                              </button>
                              <button 
                                onClick={() => {
                                  toast.success(`PDF downloaded for ${po.poNumber}`, {
                                    description: 'The purchase order has been downloaded successfully.'
                                  });
                                  setShowMoreMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] flex items-center gap-2"
                              >
                                <FileDown className="w-4 h-4" />
                                Download PDF
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedPO(po);
                                  setShowDetailsModal(true);
                                  setShowMoreMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] flex items-center gap-2"
                              >
                                <FileText className="w-4 h-4" />
                                View Details
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedPO(po);
                                  setShowAddNotesModal(true);
                                  setShowMoreMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] flex items-center gap-2"
                              >
                                <FileText className="w-4 h-4" />
                                Add Notes
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedPO(po);
                                  setShowShareModal(true);
                                  setShowMoreMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] flex items-center gap-2 rounded-b-lg"
                              >
                                <Share2 className="w-4 h-4" />
                                Share with Team
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal 1: Create PO */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Create New Purchase Order
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              Fill in the details below to create a new purchase order
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Vendor Selection */}
            <div>
              <h3 className="text-base font-bold text-[#1F2937] mb-4">Select Vendor</h3>
              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  Vendor <span className="text-red-500">*</span>
                </label>
                <select
                  value={createPOForm.vendor}
                  onChange={(e) => setCreatePOForm(prev => ({ ...prev, vendor: e.target.value }))}
                  className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="">Search and select vendor...</option>
                  <option value="Fresh Farms Inc.">Fresh Farms Inc.</option>
                  <option value="Tech Logistics">Tech Logistics</option>
                  <option value="Dairy Delights">Dairy Delights</option>
                </select>
              </div>
            </div>

            {/* PO Details */}
            <div>
              <h3 className="text-base font-bold text-[#1F2937] mb-4">PO Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                    PO Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createPOForm.poType}
                    onChange={(e) => setCreatePOForm(prev => ({ ...prev, poType: e.target.value }))}
                    className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Blanket PO">Blanket PO</option>
                    <option value="Contract Release">Contract Release</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createPOForm.category}
                    onChange={(e) => setCreatePOForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="">Select category...</option>
                    <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                    <option value="Dairy Products">Dairy Products</option>
                    <option value="Equipment">Equipment</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  Reference Number (Optional)
                </label>
                <input
                  type="text"
                  value={createPOForm.referenceNumber}
                  onChange={(e) => setCreatePOForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  placeholder="PO-REF-12345"
                  className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>
            </div>

            {/* Dates */}
            <div>
              <h3 className="text-base font-bold text-[#1F2937] mb-4">Dates</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                    PO Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={createPOForm.poDate}
                      onChange={(e) => setCreatePOForm(prev => ({ ...prev, poDate: e.target.value }))}
                      className="w-full h-10 px-3 pr-10 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                    Delivery Due Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={createPOForm.deliveryDue}
                      onChange={(e) => setCreatePOForm(prev => ({ ...prev, deliveryDue: e.target.value }))}
                      className="w-full h-10 px-3 pr-10 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  Payment Terms <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  {(['Net 15', 'Net 30', 'COD', 'Custom'] as PaymentTerms[]).map((term) => (
                    <label key={term} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentTerms"
                        value={term}
                        checked={createPOForm.paymentTerms === term}
                        onChange={(e) => setCreatePOForm(prev => ({ ...prev, paymentTerms: e.target.value as PaymentTerms }))}
                        className="w-4 h-4 text-[#4F46E5] border-[#D1D5DB] focus:ring-[#4F46E5]"
                      />
                      <span className="text-sm text-[#1F2937]">{term}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h3 className="text-base font-bold text-[#1F2937] mb-2">Line Items</h3>
              <p className="text-xs text-[#6B7280] mb-4">Add products/items to this PO</p>
              
              <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-[#F9FAFB] sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Item SKU</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Unit</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Unit Price</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Total</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] bg-white">
                      {createPOForm.lineItems.map((item, index) => (
                        <tr key={index} className="hover:bg-[#F9FAFB]">
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.sku}
                              onChange={(e) => {
                                const newItems = [...createPOForm.lineItems];
                                newItems[index].sku = e.target.value;
                                setCreatePOForm(prev => ({ ...prev, lineItems: newItems }));
                              }}
                              placeholder="SKU-001"
                              className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.product}
                              onChange={(e) => {
                                const newItems = [...createPOForm.lineItems];
                                newItems[index].product = e.target.value;
                                setCreatePOForm(prev => ({ ...prev, lineItems: newItems }));
                              }}
                              placeholder="Product name"
                              className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.quantity || ''}
                              onChange={(e) => {
                                const newItems = [...createPOForm.lineItems];
                                newItems[index].quantity = Number(e.target.value);
                                newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
                                setCreatePOForm(prev => ({ ...prev, lineItems: newItems }));
                              }}
                              placeholder="0"
                              className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={item.unit}
                              onChange={(e) => {
                                const newItems = [...createPOForm.lineItems];
                                newItems[index].unit = e.target.value;
                                setCreatePOForm(prev => ({ ...prev, lineItems: newItems }));
                              }}
                              className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                            >
                              <option value="kg">kg</option>
                              <option value="L">L</option>
                              <option value="units">units</option>
                              <option value="boxes">boxes</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice || ''}
                              onChange={(e) => {
                                const newItems = [...createPOForm.lineItems];
                                newItems[index].unitPrice = Number(e.target.value);
                                newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
                                setCreatePOForm(prev => ({ ...prev, lineItems: newItems }));
                              }}
                              placeholder="0.00"
                              className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-[#1F2937]">
                            ₹{item.total.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => removeLineItem(index)}
                              className="p-2 text-[#6B7280] hover:text-[#EF4444] hover:bg-[#FEE2E2] rounded transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                onClick={addLineItem}
                className="mt-3 text-sm text-[#4F46E5] hover:text-[#4338CA] font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>

              <div className="mt-4 space-y-2 text-right">
                <div className="flex justify-end gap-4 text-xs text-[#6B7280]">
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-end gap-4 text-xs text-[#6B7280]">
                  <span>Tax (0%):</span>
                  <span>₹{totals.tax.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-[#E5E7EB]">
                  <div className="flex justify-end gap-4 text-sm font-bold text-[#1F2937]">
                    <span>Total:</span>
                    <span>₹{totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes & Attachments */}
            <div>
              <h3 className="text-base font-bold text-[#1F2937] mb-4">Additional Information</h3>
              
              <div className="mb-4">
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={createPOForm.notes}
                  onChange={(e) => setCreatePOForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any special instructions or notes..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  Attachments (Optional)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
                  onChange={handleAttachmentChange}
                  className="hidden"
                  id="po-attachments"
                />
                <label
                  htmlFor="po-attachments"
                  className="bg-[#F9FAFB] border-2 border-dashed border-[#D1D5DB] rounded-lg p-8 text-center cursor-pointer hover:border-[#4F46E5] hover:bg-[#F3F4F6] transition-colors block"
                >
                  <CloudUpload className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
                  <p className="text-xs text-[#6B7280]">Drag files here or click to upload</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">PDF, Excel, images • Max 10MB per file</p>
                </label>
                {createPOForm.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {createPOForm.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#F9FAFB] p-2 rounded text-sm">
                        <span className="text-[#1F2937]">{file.name}</span>
                        <button
                          onClick={() => removeAttachment(idx)}
                          className="text-[#EF4444] hover:text-[#DC2626]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createPOForm.saveAsDraft}
                onChange={(e) => setCreatePOForm(prev => ({ ...prev, saveAsDraft: e.target.checked }))}
                className="w-4 h-4 text-[#4F46E5] border-[#D1D5DB] rounded focus:ring-[#4F46E5]"
              />
              <span className="text-xs text-[#1F2937]">Save as draft</span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreatePOForm({
                    vendor: '',
                    poType: 'Standard',
                    category: '',
                    referenceNumber: '',
                    poDate: '',
                    deliveryDue: '',
                    paymentTerms: 'Net 30',
                    lineItems: [
                      { sku: '', product: '', quantity: 0, unit: 'kg', unitPrice: 0, total: 0 }
                    ],
                    notes: '',
                    attachments: [],
                    saveAsDraft: false,
                  });
                }}
                className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDraft}
                className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] transition-all duration-200"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleCreatePO(true)}
                className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA] transition-all duration-200"
              >
                Create & Send
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: PO Details/Review */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-[700px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB] flex-shrink-0">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Purchase Order Details
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              {selectedPO?.poNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedPO && (
            <div className="px-6 py-6 space-y-6 overflow-y-auto flex-1">
              {/* Vendor Information */}
              <div>
                <h3 className="text-base font-bold text-[#1F2937] mb-3">Vendor Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Vendor Name</span>
                    <span className="text-[#1F2937]">{selectedPO.vendor}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Contact Person</span>
                    <span className="text-[#1F2937]">{selectedPO.vendorContact}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Email</span>
                    <span className="text-[#1F2937]">{selectedPO.vendorEmail}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Phone</span>
                    <span className="text-[#1F2937]">{selectedPO.vendorPhone}</span>
                  </div>
                </div>
              </div>

              {/* PO Information */}
              <div>
                <h3 className="text-base font-bold text-[#1F2937] mb-3">PO Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs font-bold text-[#6B7280] uppercase block mb-1">PO Number</span>
                    <span className="text-[#1F2937]">{selectedPO.poNumber}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#6B7280] uppercase block mb-1">PO Date</span>
                    <span className="text-[#1F2937]">{selectedPO.createdDate}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Delivery Due</span>
                    <span className="text-[#1F2937]">{selectedPO.deliveryDue}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Payment Terms</span>
                    <span className="text-[#1F2937]">{selectedPO.paymentTerms}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Status</span>
                    <StatusBadge status={selectedPO.status} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Category</span>
                    <span className="text-[#1F2937]">{selectedPO.category}</span>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h3 className="text-base font-bold text-[#1F2937] mb-3">Line Items</h3>
                <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#F9FAFB]">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-bold text-[#6B7280] uppercase">SKU</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-[#6B7280] uppercase">Product</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-[#6B7280] uppercase">Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-[#6B7280] uppercase">Unit</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-[#6B7280] uppercase">Price</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-[#6B7280] uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {selectedPO.lineItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-xs text-[#1F2937]">{item.sku}</td>
                          <td className="px-3 py-2 text-xs text-[#1F2937]">{item.product}</td>
                          <td className="px-3 py-2 text-xs text-[#1F2937] text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-xs text-[#1F2937]">{item.unit}</td>
                          <td className="px-3 py-2 text-xs text-[#1F2937] text-right">₹{item.unitPrice.toFixed(2)}</td>
                          <td className="px-3 py-2 text-xs text-[#1F2937] text-right font-medium">₹{item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 space-y-2 text-right">
                  <div className="flex justify-end gap-4 text-xs text-[#6B7280]">
                    <span>Subtotal:</span>
                    <span>₹{selectedPO.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end gap-4 text-xs text-[#6B7280]">
                    <span>Tax (0%):</span>
                    <span>₹{selectedPO.tax.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-[#E5E7EB]">
                    <div className="flex justify-end gap-4 text-sm font-bold text-[#1F2937]">
                      <span>Total:</span>
                      <span>₹{selectedPO.totalValue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Timeline */}
              <div>
                <h3 className="text-base font-bold text-[#1F2937] mb-3">Activity Timeline</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 bg-[#10B981] rounded-full mt-1.5"></div>
                    <div>
                      <p className="text-sm text-[#1F2937]">Created: {selectedPO.createdDate} by {selectedPO.createdBy}</p>
                    </div>
                  </div>
                  {selectedPO.sentDate && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 bg-[#10B981] rounded-full mt-1.5"></div>
                      <div>
                        <p className="text-sm text-[#1F2937]">Sent: {selectedPO.sentDate} to Vendor</p>
                      </div>
                    </div>
                  )}
                  {selectedPO.receivedDate && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 bg-[#10B981] rounded-full mt-1.5"></div>
                      <div>
                        <p className="text-sm text-[#1F2937]">Received: {selectedPO.receivedDate}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedPO.notes && (
                <div>
                  <h3 className="text-base font-bold text-[#1F2937] mb-3">Notes</h3>
                  <p className="text-sm text-[#6B7280] bg-[#F9FAFB] p-4 rounded-lg">
                    {selectedPO.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3 flex-shrink-0">
            {selectedPO?.status === 'Pending Approval' && (
              <>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Reject clicked');
                    toast.error('Purchase order rejected', {
                      description: `${selectedPO?.poNumber} has been rejected.`
                    });
                    setShowDetailsModal(false);
                  }}
                  className="px-6 py-2.5 bg-[#EF4444] text-white text-sm font-medium rounded-md hover:bg-[#DC2626] transition-all duration-200"
                >
                  Reject
                </button>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Approve clicked');
                    toast.success('Purchase order approved', {
                      description: `${selectedPO?.poNumber} has been approved and sent to vendor.`
                    });
                    setShowDetailsModal(false);
                  }}
                  className="px-6 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-md hover:bg-[#059669] transition-all duration-200"
                >
                  Approve
                </button>
              </>
            )}
            {selectedPO?.status === 'Sent' && (
              <>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Cancel PO clicked');
                    setShowDetailsModal(false);
                    setShowCancelModal(true);
                  }}
                  className="px-6 py-2.5 bg-[#EF4444] text-white text-sm font-medium rounded-md hover:bg-[#DC2626] transition-all duration-200"
                >
                  Cancel PO
                </button>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Edit clicked');
                    setShowDetailsModal(false);
                    setShowEditModal(true);
                  }}
                  className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA] transition-all duration-200"
                >
                  Edit
                </button>
              </>
            )}
            {(selectedPO?.status === 'Partially Received' || selectedPO?.status === 'Fully Received') && (
              <>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Record Receipt clicked');
                    toast.success('Receipt recorded', {
                      description: `Receipt has been recorded for ${selectedPO?.poNumber}`
                    });
                  }}
                  className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA] transition-all duration-200"
                >
                  Record Receipt
                </button>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('View Tracking clicked');
                    setShowDetailsModal(false);
                    setShowTrackingModal(true);
                  }}
                  className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] transition-all duration-200"
                >
                  View Tracking
                </button>
              </>
            )}
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Download PDF clicked');
                toast.success(`PDF downloaded for ${selectedPO?.poNumber}`, {
                  description: 'The purchase order has been downloaded successfully.'
                });
              }}
              className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] transition-all duration-200 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Close clicked');
                setShowDetailsModal(false);
              }}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Bulk Upload */}
      <Dialog open={showBulkUploadModal} onOpenChange={setShowBulkUploadModal}>
        <DialogContent className="max-w-[600px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB] flex-shrink-0">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Bulk Upload Purchase Orders
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              Upload multiple purchase orders at once using our Excel template
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6 overflow-y-auto flex-1">
            {/* Step 1 */}
            <div>
              <h3 className="text-base font-bold text-[#1F2937] mb-2">Step 1: Download Template</h3>
              <p className="text-sm text-[#6B7280] mb-3">
                Download the Excel template to fill with your PO data
              </p>
              <button 
                onClick={handleDownloadTemplate}
                className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA] transition-all duration-200 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>

            {/* Step 2 */}
            <div>
              <h3 className="text-base font-bold text-[#1F2937] mb-2">Step 2: Select File</h3>
              <p className="text-sm text-[#6B7280] mb-3">
                Select your filled Excel file
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="bulk-upload-file"
              />
              <label
                htmlFor="bulk-upload-file"
                className="bg-[#F9FAFB] border-2 border-dashed border-[#D1D5DB] rounded-lg p-12 text-center cursor-pointer hover:border-[#4F46E5] hover:bg-[#F3F4F6] transition-colors block"
              >
                <CloudUpload className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
                <p className="text-xs text-[#6B7280] mb-1">Drag file here or click to browse</p>
                <p className="text-xs text-[#9CA3AF]">CSV, Excel files only (.csv, .xlsx, .xls)</p>
                {uploadFile && (
                  <p className="text-xs text-[#10B981] font-medium mt-2">Selected: {uploadFile.name}</p>
                )}
              </label>
            </div>

            {/* Step 3 - Preview */}
            {uploadFile && uploadPreview.length > 0 && (
              <div>
                <h3 className="text-base font-bold text-[#1F2937] mb-2">Step 3: Preview & Validation</h3>
                <div className="bg-[#DCFCE7] border border-[#86EFAC] rounded-lg p-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#166534]" />
                  <span className="text-sm text-[#166534] font-medium">✓ {uploadPreview.length} POs ready to upload</span>
                </div>
                <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
                  {uploadPreview.map((preview, idx) => (
                    <div key={idx} className="bg-[#F9FAFB] p-3 rounded text-sm">
                      <p className="font-medium text-[#1F2937]">{preview.vendor}</p>
                      <p className="text-xs text-[#6B7280]">{preview.items} items • ₹{preview.total.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3 flex-shrink-0">
            <button
              onClick={() => {
                setShowBulkUploadModal(false);
                setUploadFile(null);
                setUploadPreview([]);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Cancel
            </button>
            <button 
              onClick={handleBulkUpload}
              disabled={!uploadFile}
              className="px-6 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-md hover:bg-[#059669] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload POs
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Track Delivery */}
      <Dialog open={showTrackingModal} onOpenChange={setShowTrackingModal}>
        <DialogContent className="max-w-[600px] p-0">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Track Delivery
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              {selectedPO?.poNumber} - {selectedPO?.vendor}
            </DialogDescription>
          </DialogHeader>

          {selectedPO && (
            <div className="px-6 py-6 space-y-6">
              {/* Expected Delivery */}
              <div className="bg-[#F9FAFB] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-[#1F2937]">Expected Delivery</span>
                  <CheckCircle className="w-5 h-5 text-[#10B981]" />
                </div>
                <span className="text-sm text-[#6B7280]">{selectedPO.deliveryDue}</span>
              </div>

              {/* Current Status */}
              <div className="bg-[#DBEAFE] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-[#1F2937]">Current Status</span>
                  <AlertCircle className="w-5 h-5 text-[#1E40AF]" />
                </div>
                <StatusBadge status={selectedPO.status} />

                {selectedPO.status === 'Partially Received' && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-bold text-[#1F2937]">Items Received:</p>
                    {selectedPO.lineItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {index === 0 ? (
                            <CheckCircle className="w-4 h-4 text-[#10B981]" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-[#F59E0B]" />
                          )}
                          <span className="text-sm text-[#1F2937]">
                            {item.product} ({index === 0 ? '500' : '0'} of {item.quantity} {item.unit})
                          </span>
                        </div>
                        <span className="text-xs font-medium text-[#6B7280]">
                          {index === 0 ? '62.5%' : '0%'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-base font-bold text-[#1F2937] mb-4">Updates:</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 bg-[#10B981] rounded-full mt-1.5"></div>
                    <div>
                      <p className="text-sm text-[#1F2937] font-medium">{selectedPO.deliveryDue}, 10:30 AM</p>
                      <p className="text-sm text-[#6B7280]">Vendor received shipment</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 h-2 bg-[#0EA5E9] rounded-full mt-1.5"></div>
                    <div>
                      <p className="text-sm text-[#1F2937] font-medium">Oct 11, 2:45 PM</p>
                      <p className="text-sm text-[#6B7280]">Partial delivery in transit</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 h-2 bg-[#6B7280] rounded-full mt-1.5"></div>
                    <div>
                      <p className="text-sm text-[#1F2937] font-medium">{selectedPO.createdDate}, 8:00 AM</p>
                      <p className="text-sm text-[#6B7280]">Order confirmed & processing</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            {selectedPO?.status === 'Fully Received' && (
              <button className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA] transition-all duration-200 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download Receipt
              </button>
            )}
            <button
              onClick={() => setShowTrackingModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Edit PO */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Edit Purchase Order
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              {selectedPO?.poNumber} - Make changes to this purchase order
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                Delivery Due Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  defaultValue={selectedPO?.deliveryDue}
                  className="w-full h-10 px-3 pr-10 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                Payment Terms
              </label>
              <select
                defaultValue={selectedPO?.paymentTerms}
                className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="COD">COD</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                Notes
              </label>
              <textarea
                defaultValue={selectedPO?.notes}
                rows={3}
                className="w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] resize-none"
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.success('Purchase order updated', {
                  description: `${selectedPO?.poNumber} has been updated successfully.`
                });
                setShowEditModal(false);
              }}
              className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA] transition-all duration-200"
            >
              Save Changes
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 6: Cancel PO */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-[500px] p-0">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Cancel Purchase Order
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              {selectedPO?.poNumber} - This action cannot be undone
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-4">
            <div className="bg-[#FEF3C7] border border-[#FCD34D] rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#92400E] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#92400E] mb-1">Warning</p>
                <p className="text-xs text-[#92400E]">
                  Cancelling this PO will notify the vendor and update all related records.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please provide a reason for cancelling this PO..."
                rows={4}
                className="w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] resize-none"
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => {
                setShowCancelModal(false);
                setCancelReason('');
              }}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Go Back
            </button>
            <button
              onClick={() => {
                if (cancelReason.trim()) {
                  toast.error('Purchase order cancelled', {
                    description: `${selectedPO?.poNumber} has been cancelled and vendor notified.`
                  });
                  setShowCancelModal(false);
                  setCancelReason('');
                } else {
                  toast.error('Please provide a reason for cancellation');
                }
              }}
              className="px-6 py-2.5 bg-[#EF4444] text-white text-sm font-medium rounded-md hover:bg-[#DC2626] transition-all duration-200"
            >
              Confirm Cancellation
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 8: Add Notes */}
      <Dialog open={showAddNotesModal} onOpenChange={setShowAddNotesModal}>
        <DialogContent className="max-w-[500px] p-0">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Add Notes
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              {selectedPO?.poNumber} - Add internal notes to this purchase order
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-4">
            {selectedPO?.notes && (
              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                  Existing Notes
                </label>
                <div className="bg-[#F9FAFB] p-3 rounded-md text-sm text-[#1F2937]">
                  {selectedPO.notes}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                New Note <span className="text-red-500">*</span>
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Enter additional notes..."
                rows={5}
                className="w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] resize-none"
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => {
                setShowAddNotesModal(false);
                setAdditionalNotes('');
              }}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (additionalNotes.trim()) {
                  toast.success('Note added successfully', {
                    description: `Note has been added to ${selectedPO?.poNumber}`
                  });
                  setShowAddNotesModal(false);
                  setAdditionalNotes('');
                } else {
                  toast.error('Please enter a note');
                }
              }}
              className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA] transition-all duration-200"
            >
              Save Note
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 9: Share with Team */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="max-w-[500px] p-0">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Share with Team
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              {selectedPO?.poNumber} - Share this purchase order with team members
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            <div className="bg-[#F9FAFB] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#1F2937]">PO Summary</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Vendor:</span>
                  <span className="text-[#1F2937]">{selectedPO?.vendor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Total Value:</span>
                  <span className="text-[#1F2937] font-medium">
                    ₹{selectedPO?.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Delivery Due:</span>
                  <span className="text-[#1F2937]">{selectedPO?.deliveryDue}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                Share with <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="Enter email address..."
                className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              />
              <p className="text-xs text-[#6B7280] mt-2">
                You can enter multiple emails separated by commas
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeAttachments"
                defaultChecked
                className="w-4 h-4 text-[#4F46E5] border-[#D1D5DB] rounded focus:ring-[#4F46E5]"
              />
              <label htmlFor="includeAttachments" className="text-sm text-[#1F2937]">
                Include PDF attachments
              </label>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => {
                setShowShareModal(false);
                setShareEmail('');
              }}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (shareEmail.trim()) {
                  toast.success('Purchase order shared', {
                    description: `${selectedPO?.poNumber} has been shared with ${shareEmail}`
                  });
                  setShowShareModal(false);
                  setShareEmail('');
                } else {
                  toast.error('Please enter an email address');
                }
              }}
              className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA] transition-all duration-200 flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
