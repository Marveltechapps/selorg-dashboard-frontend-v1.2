import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Search, ShieldCheck, X, Loader2, FileText, CreditCard, Building2, Receipt, ArrowRight } from 'lucide-react';
import { fetchCustomerPayments } from '../screens/finance/customerPaymentsApi';
import { fetchVendorInvoices } from '../screens/finance/payablesApi';
import { fetchInvoices } from '../screens/finance/invoicingApi';
import { fetchAlerts, FinanceAlert } from '../screens/finance/financeAlertsApi';

interface SearchResult {
  id: string;
  type: 'customer_payment' | 'vendor_invoice' | 'invoice';
  title: string;
  subtitle: string;
  amount?: number;
  status?: string;
}

export function FinanceTopBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notifications, setNotifications] = useState<FinanceAlert[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, []);

  // Handle search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      performSearch();
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async () => {
    if (searchQuery.trim().length < 2) return;

    setSearchLoading(true);
    setSearchOpen(true);
    
    try {
      const query = searchQuery.trim().toLowerCase();
      const results: SearchResult[] = [];

      // Search customer payments
      try {
        const customerPayments = await fetchCustomerPayments({
          query: searchQuery,
          status: 'all',
          page: 1,
          pageSize: 5
        });
        
        customerPayments.data.forEach(payment => {
          results.push({
            id: payment.id,
            type: 'customer_payment',
            title: `Payment - ${payment.orderId}`,
            subtitle: `${payment.customerName} • ${payment.paymentMethodDisplay}`,
            amount: payment.amount,
            status: payment.status
          });
        });
      } catch (e) {
        console.error('Failed to search customer payments:', e);
      }

      // Search vendor invoices
      try {
        const vendorInvoices = await fetchVendorInvoices({
          query: searchQuery,
          page: 1,
          pageSize: 5
        });
        
        vendorInvoices.data.forEach(invoice => {
          results.push({
            id: invoice.id,
            type: 'vendor_invoice',
            title: `Invoice - ${invoice.invoiceNumber}`,
            subtitle: `${invoice.vendorName} • ${invoice.status}`,
            amount: invoice.amount,
            status: invoice.status
          });
        });
      } catch (e) {
        console.error('Failed to search vendor invoices:', e);
      }

      // Search invoices (billing)
      try {
        const invoices = await fetchInvoices(undefined, searchQuery);
        
        invoices.slice(0, 5).forEach(invoice => {
          results.push({
            id: invoice.id,
            type: 'invoice',
            title: `Invoice - ${invoice.invoiceNumber}`,
            subtitle: `${invoice.customerName} • ${invoice.status}`,
            amount: invoice.amount,
            status: invoice.status
          });
        });
      } catch (e) {
        console.error('Failed to search invoices:', e);
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const alerts = await fetchAlerts('open');
      setNotifications(alerts.slice(0, 10)); // Show latest 10
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    // Dispatch navigation event
    let tab = '';
    switch (result.type) {
      case 'customer_payment':
        tab = 'customer-payments';
        break;
      case 'vendor_invoice':
        tab = 'vendor-payments';
        break;
      case 'invoice':
        tab = 'billing';
        break;
    }
    
    if (tab) {
      window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab } }));
    }
    
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleNotificationClick = (alert: FinanceAlert) => {
    window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'alerts' } }));
    setNotificationsOpen(false);
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'customer_payment':
        return <CreditCard size={16} className="text-[#14B8A6]" />;
      case 'vendor_invoice':
        return <Building2 size={16} className="text-[#F97316]" />;
      case 'invoice':
        return <Receipt size={16} className="text-[#3B82F6]" />;
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const s = status.toLowerCase();
    if (s.includes('paid') || s.includes('captured')) return 'bg-green-100 text-green-800';
    if (s.includes('pending') || s.includes('authorized')) return 'bg-yellow-100 text-yellow-800';
    if (s.includes('declined') || s.includes('rejected') || s.includes('overdue')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="h-[72px] bg-white border-b border-[#E0E0E0] fixed top-0 left-[240px] right-0 z-40 flex items-center px-8 justify-between shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      {/* Left: System Status */}
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
           <span className="text-xl font-bold text-[#212121]">Finance Command Center</span>
           <span className="bg-[#CCFBF1] text-[#0F766E] text-xs font-bold px-2 py-0.5 rounded-full border border-[#0F766E]/20 flex items-center gap-1">
             <ShieldCheck size={12} />
             SECURE
           </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-6 ml-6 border-l pl-6 border-[#E0E0E0] h-10">
        {/* Search */}
        <div className="relative" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
          <input 
            type="text" 
            placeholder="Search txn ID, invoice #..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setSearchOpen(true);
            }}
            className="h-9 pl-9 pr-4 rounded-lg bg-[#F5F5F5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#14B8A6] focus:border-transparent w-64 transition-all focus:w-80 placeholder-[#BDBDBD]"
          />
          
          {/* Search Results Dropdown */}
          {searchOpen && (searchLoading || searchResults.length > 0) && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-[#E0E0E0] rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
              {searchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-[#14B8A6]" />
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  <div className="px-4 py-2 border-b border-[#E0E0E0] flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#212121]">Search Results</span>
                    <button
                      type="button"
                      onClick={() => setSearchOpen(false)}
                      className="p-1 hover:bg-[#F5F5F5] rounded"
                    >
                      <X size={14} className="text-[#757575]" />
                    </button>
                  </div>
                  <div className="py-2">
                    {searchResults.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        type="button"
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left px-4 py-3 hover:bg-[#F5F5F5] transition-colors flex items-start gap-3"
                      >
                        <div className="mt-0.5">{getTypeIcon(result.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[#212121] truncate">{result.title}</div>
                          <div className="text-xs text-[#757575] mt-0.5 truncate">{result.subtitle}</div>
                          {result.amount && (
                            <div className="text-xs font-semibold text-[#212121] mt-1">
                              ${result.amount.toLocaleString()}
                            </div>
                          )}
                        </div>
                        {result.status && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(result.status)}`}>
                            {result.status}
                          </span>
                        )}
                        <ArrowRight size={14} className="text-[#9E9E9E] mt-1" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-[#757575]">
                  No results found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              if (!notificationsOpen) loadNotifications();
            }}
            className="relative p-2 text-[#757575] hover:bg-[#F5F5F5] rounded-full transition-colors"
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-[#EF4444] rounded-full border-2 border-white">
                {notifications.length > 99 ? '99+' : notifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute top-full right-2 mt-2 w-80 bg-white border border-[#E0E0E0] rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
              <div className="px-4 py-3 border-b border-[#E0E0E0] flex items-center justify-between">
                <span className="font-semibold text-[#212121]">Notifications</span>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  className="p-1 hover:bg-[#F5F5F5] rounded"
                >
                  <X size={16} className="text-[#757575]" />
                </button>
              </div>
              
              {notificationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-[#14B8A6]" />
                </div>
              ) : notifications.length > 0 ? (
                <div className="py-2">
                  {notifications.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => handleNotificationClick(alert)}
                      className="w-full text-left px-4 py-3 hover:bg-[#F5F5F5] transition-colors border-b border-[#F5F5F5] last:border-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-1.5 rounded-full ${
                          alert.severity === 'critical' ? 'bg-red-100' :
                          alert.severity === 'high' ? 'bg-orange-100' :
                          alert.severity === 'medium' ? 'bg-yellow-100' :
                          'bg-blue-100'
                        }`}>
                          <ShieldCheck size={14} className={
                            alert.severity === 'critical' ? 'text-red-600' :
                            alert.severity === 'high' ? 'text-orange-600' :
                            alert.severity === 'medium' ? 'text-yellow-600' :
                            'text-blue-600'
                          } />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[#212121]">{alert.title}</div>
                          <div className="text-xs text-[#757575] mt-0.5 line-clamp-2">{alert.description}</div>
                          <div className="text-xs text-[#9E9E9E] mt-1">
                            {new Date(alert.createdAt).toLocaleDateString()} • {alert.severity}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-[#757575]">
                  No notifications
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
