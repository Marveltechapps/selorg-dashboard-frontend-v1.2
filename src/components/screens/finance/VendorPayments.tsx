import React, { useState, useEffect, useCallback } from 'react';
import { Plus, FileText } from 'lucide-react';
import { Button } from '../../ui/button';
import { toast } from 'sonner';

import { PayablesSummaryCards } from './PayablesSummaryCards';
import { VendorInvoicesFilters } from './VendorInvoicesFilters';
import { VendorInvoicesTable } from './VendorInvoicesTable';
import { VendorInvoiceDetailsDrawer } from './VendorInvoiceDetailsDrawer';
import { UploadInvoiceModal } from './UploadInvoiceModal';
import { NewPaymentModal } from './NewPaymentModal';
import { RejectInvoiceModal } from './RejectInvoiceModal';

import { 
    VendorInvoice, 
    VendorPayablesSummary, 
    VendorInvoiceFilter, 
    Vendor,
    fetchPayablesSummary,
    fetchVendorInvoices,
    fetchVendorInvoiceDetails,
    fetchVendors,
    approveInvoice,
    bulkApproveInvoices,
    markInvoicePaid,
    rejectInvoice
} from './payablesApi';

export function VendorPayments() {
  // --- State ---
  const [summary, setSummary] = useState<VendorPayablesSummary | null>(null);
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  
  const [filters, setFilters] = useState<VendorInvoiceFilter>({
      page: 1,
      pageSize: 10,
      status: undefined,
      vendorId: undefined,
      dateFrom: undefined,
      dateTo: undefined
  });

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  // --- Data Fetching ---
  const loadSummary = async () => {
      try {
          const data = await fetchPayablesSummary();
          setSummary(data);
      } catch (e) {
          console.error("Failed to load summary", e);
          toast.error("Failed to load summary");
          setSummary(null);
      } finally {
          setIsLoadingSummary(false);
      }
  };

  const loadVendors = async () => {
      try {
          const data = await fetchVendors();
          setVendors(data);
      } catch (e) {
          console.error("Failed to load vendors", e);
          toast.error("Failed to load vendors");
          setVendors([]);
      }
  };

  const loadInvoices = useCallback(async () => {
      setIsLoadingInvoices(true);
      try {
          const result = await fetchVendorInvoices(filters);
          setInvoices(result.data ?? []);
      } catch (e) {
          toast.error("Failed to load invoices");
          setInvoices([]);
      } finally {
          setIsLoadingInvoices(false);
      }
  }, [filters]);

  useEffect(() => {
      loadSummary();
      loadVendors();
  }, []);

  useEffect(() => {
      loadInvoices();
  }, [loadInvoices]);

  // --- Handlers ---
  const handleSummaryFilterClick = (filterType: string) => {
      if (filterType === 'outstanding') {
           // Complex logic to filter multiple statuses not supported by simple filter object yet
           // defaulting to pending approval for now or just clearing status
           setFilters(prev => ({ ...prev, status: undefined, page: 1 }));
      } else {
           setFilters(prev => ({ ...prev, status: filterType, page: 1 }));
      }
  };

  const handleApprove = async (id: string) => {
      try {
          await approveInvoice(id);
          toast.success("Invoice approved");
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          await loadInvoices();
          loadSummary();
      } catch (e) {
          toast.error("Failed to approve invoice");
      }
  };

  const handleToggleSelect = (id: string, selected: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (selected) next.add(id);
        else next.delete(id);
        return next;
      });
  };

  const handleSelectAll = (selected: boolean) => {
      if (selected) {
        const pending = invoices.filter((i) => i.status === 'pending_approval').map((i) => i.id);
        setSelectedIds(new Set(pending));
      } else {
        setSelectedIds(new Set());
      }
  };

  const handleBulkApprove = async () => {
      if (selectedIds.size === 0) return;
      try {
          const ids = Array.from(selectedIds);
          const result = await bulkApproveInvoices(ids);
          toast.success(`Approved ${result.approvedCount} invoice(s)`);
          setSelectedIds(new Set());
          await loadInvoices();
          loadSummary();
      } catch (e) {
          toast.error("Failed to bulk approve invoices");
      }
  };

  const handleMarkPaid = async (id: string) => {
      try {
          await markInvoicePaid(id);
          toast.success("Invoice marked as paid");
          await loadInvoices();
          loadSummary();
      } catch (e) {
          toast.error("Failed to mark as paid");
      }
  };

  const handleReject = async (invoice: VendorInvoice) => {
       // Open reject modal directly, not view details
       setSelectedInvoice(invoice);
       setDetailsOpen(false); // Ensure details drawer is closed
       setRejectOpen(true);
  };

  const handleViewDetails = async (invoice: VendorInvoice) => {
      setSelectedInvoice(invoice);
      setDetailsOpen(true);
      try {
          const detailed = await fetchVendorInvoiceDetails(invoice.id);
          setSelectedInvoice(detailed);
      } catch (e) {
          toast.error("Failed to load invoice details");
      }
  };

  const handleSchedule = (invoice: VendorInvoice) => {
      // Set selected invoice for payment modal with today's date as default
      setSelectedInvoice(invoice);
      setPaymentOpen(true);
  };

  const handleExport = () => {
      // Export filtered invoices (current invoices state is already filtered)
      if (invoices.length === 0) {
        toast.error("No invoices to export");
        return;
      }
      
      const csvRows = ['Invoice Number,Vendor,Date,Due Date,Amount,Status'];
      invoices.forEach(inv => {
        csvRows.push(`${inv.invoiceNumber},${inv.vendorName},${inv.invoiceDate},${inv.dueDate},${inv.amount},${inv.status}`);
      });
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vendor-invoices-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Exported ${invoices.length} invoice(s)`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Vendor & Supplier Payments</h1>
          <p className="text-[#757575] text-sm">Manage payables, invoices, and supplier relationships</p>
        </div>
        <div className="flex gap-3">
             <Button 
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setUploadOpen(true);
                }}
                className="flex items-center gap-2"
            >
                <FileText size={16} />
                Upload Invoice
            </Button>
            <Button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedInvoice(null);
                  setPaymentOpen(true);
                }}
                className="bg-[#14B8A6] hover:bg-[#0D9488] flex items-center gap-2"
            >
                <Plus size={16} />
                New Payment
            </Button>
        </div>
      </div>

      <PayablesSummaryCards 
        summary={summary} 
        isLoading={isLoadingSummary} 
        onFilterClick={handleSummaryFilterClick}
      />

      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm p-4">
        <VendorInvoicesFilters 
            filters={filters} 
            vendors={vendors}
            invoices={invoices}
            onFilterChange={setFilters}
            onExport={handleExport}
        />
        
        <VendorInvoicesTable 
            data={invoices} 
            isLoading={isLoadingInvoices}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onApprove={handleApprove}
            onBulkApprove={handleBulkApprove}
            onMarkPaid={handleMarkPaid}
            onReject={handleReject}
            onSchedule={handleSchedule}
            onViewDetails={handleViewDetails}
        />
      </div>

      <VendorInvoiceDetailsDrawer 
        invoice={selectedInvoice}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onUpdate={() => {
            loadInvoices();
            loadSummary();
        }}
      />

      <UploadInvoiceModal 
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => {
            loadInvoices();
            loadSummary();
        }}
        vendors={vendors}
      />

      <NewPaymentModal 
        open={paymentOpen}
        onClose={() => {
          setPaymentOpen(false);
          setSelectedInvoice(null);
        }}
        onSuccess={() => {
            loadInvoices();
            loadSummary();
        }}
        vendors={vendors}
        preselectedInvoice={selectedInvoice}
      />
      
      <RejectInvoiceModal
        invoice={selectedInvoice}
        open={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          setSelectedInvoice(null);
        }}
        onSuccess={() => {
          loadInvoices();
          loadSummary();
        }}
      />
    </div>
  );
}
