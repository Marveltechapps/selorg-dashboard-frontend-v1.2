import React, { useState, useEffect, useCallback } from 'react';
import { CustomerPaymentsFilters } from './CustomerPaymentsFilters';
import { CustomerPaymentsTable } from './CustomerPaymentsTable';
import { PaymentDetailsDrawer } from './PaymentDetailsDrawer';
import { RetryPaymentModal } from './RetryPaymentModal';
import { 
    CustomerPayment, 
    CustomerPaymentFilter, 
    fetchCustomerPayments, 
    fetchCustomerPaymentDetails,
    retryCustomerPayment
} from './customerPaymentsApi';
import { toast } from 'sonner';

export function CustomerPayments() {
  // Filters State
  const [filters, setFilters] = useState<CustomerPaymentFilter>({
      page: 1,
      pageSize: 10,
      query: '',
      status: undefined
  });

  // Data State
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Modal/Drawer State
  const [selectedPayment, setSelectedPayment] = useState<CustomerPayment | null>(null);
  const [retryPayment, setRetryPayment] = useState<CustomerPayment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [retryOpen, setRetryOpen] = useState(false);

  // Fetch Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
        // Fetch customer payments with current filters
        const result = await fetchCustomerPayments(filters);
        
        setPayments(result.data);
        setTotalCount(result.total);
    } catch (error) {
        toast.error("Failed to load payments");
    } finally {
        setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleViewDetails = async (payment: CustomerPayment) => {
    // Optimistically show current data, then fetch full details if needed
    // but in real app it might fetch more fields.
    setSelectedPayment(payment);
    setDetailsOpen(true);
    
    try {
        const fullDetails = await fetchCustomerPaymentDetails(payment.id);
        setSelectedPayment(fullDetails);
    } catch (e) {
        toast.error("Failed to fetch full details");
    }
  };

  const handleRetryClick = (payment: CustomerPayment) => {
      setRetryPayment(payment);
      setRetryOpen(true);
  };

  const handleRetryConfirm = async (id: string, amount: number) => {
      try {
          const updated = await retryCustomerPayment(id, amount);
          toast.success("Payment retry initiated successfully");
          
          // Update local state immediately
          setPayments(prev => prev.map(p => p.id === id ? updated : p));
          
          if (selectedPayment?.id === id) {
              setSelectedPayment(updated);
          }
          
          // Reload data to ensure consistency with filters
          await loadData();
      } catch (e) {
          toast.error("Failed to retry payment");
          throw e; // Let modal handle error state
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Customer Payments</h1>
          <p className="text-[#757575] text-sm">Transaction history, payment attempts, and user payment profiles</p>
        </div>
      </div>

      <CustomerPaymentsFilters 
        filters={filters} 
        onFilterChange={setFilters} 
      />

      <CustomerPaymentsTable 
        data={payments} 
        isLoading={isLoading} 
        onViewDetails={handleViewDetails}
        onRetry={handleRetryClick}
      />

      <PaymentDetailsDrawer 
        payment={selectedPayment} 
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onRetry={handleRetryClick}
      />

      <RetryPaymentModal
        payment={retryPayment}
        open={retryOpen}
        onClose={() => setRetryOpen(false)}
        onConfirm={handleRetryConfirm}
      />
    </div>
  );
}
