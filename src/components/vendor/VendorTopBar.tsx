import React from 'react';
import { Bell, Search, ShieldCheck, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface VendorTopBarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export function VendorTopBar({ searchQuery = '', onSearchChange }: VendorTopBarProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const notificationsRef = React.useRef<HTMLDivElement>(null);

  // Sample notifications data
  const notifications = [
    {
      id: 1,
      type: 'success' as const,
      title: 'New vendor approved',
      message: 'Vendor "Fresh Farms LLC" has been approved and activated',
      time: '5 min ago',
      unread: true
    },
    {
      id: 2,
      type: 'warning' as const,
      title: 'Document pending review',
      message: 'Tax certificate for "Metro Supplies" expires in 7 days',
      time: '1 hour ago',
      unread: true
    },
    {
      id: 3,
      type: 'info' as const,
      title: 'Performance report ready',
      message: 'Weekly vendor performance report is now available',
      time: '2 hours ago',
      unread: true
    },
    {
      id: 4,
      type: 'warning' as const,
      title: 'Contract renewal required',
      message: 'Contract for "Quality Distributors" expires in 30 days',
      time: '3 hours ago',
      unread: false
    },
    {
      id: 5,
      type: 'success' as const,
      title: 'Payment processed',
      message: 'Payment of ₹15,450 processed to "Urban Wholesale"',
      time: '5 hours ago',
      unread: false
    }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  // Click outside handler
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }

    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isNotificationsOpen]);

  const getNotificationIcon = (type: 'success' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} className="text-[#10B981]" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-[#F59E0B]" />;
      case 'info':
        return <Clock size={16} className="text-[#4F46E5]" />;
    }
  };

  return (
    <div className="h-[72px] bg-white border-b border-[#E0E0E0] fixed top-0 left-[240px] right-0 z-40 flex items-center px-8 justify-between shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      {/* Left: System Status */}
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
           <span className="text-xl font-bold text-[#212121]">Vendor Control Tower</span>
           <span className="bg-[#E0E7FF] text-[#4F46E5] text-xs font-bold px-2 py-0.5 rounded-full border border-[#4F46E5]/20 flex items-center gap-1">
             <ShieldCheck size={12} />
             COMPLIANT
           </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-6 ml-6 border-l pl-6 border-[#E0E0E0] h-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
          <input 
            type="text" 
            placeholder="Search vendor, PO #, SKU..." 
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-9 pl-9 pr-4 rounded-lg bg-[#F5F5F5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent w-64 transition-all focus:w-80 placeholder-[#BDBDBD]"
          />
        </div>
        <div ref={notificationsRef} className="relative">
          <button className="relative p-2 text-[#757575] hover:bg-[#F5F5F5] rounded-full transition-colors" onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}>
            <Bell size={20} />
            {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#EF4444] border-2 border-white rounded-full shadow-sm"></span>}
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <div className="absolute top-full right-2 mt-2 bg-white border border-[#E0E0E0] shadow-lg rounded-lg min-w-[480px] max-w-[600px] w-[90vw] z-50 overflow-x-hidden">
              {/* Header */}
              <div className="p-4 border-b border-[#E0E0E0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm text-[#212121] whitespace-nowrap">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-[#EF4444] text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <button 
                  className="text-xs text-[#4F46E5] hover:underline"
                  onClick={() => setIsNotificationsOpen(false)}
                >
                  Close
                </button>
              </div>

              {/* Notifications List */}
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-[#9E9E9E] text-sm">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-[#F5F5F5] hover:bg-[#FAFAFA] transition-colors ${
                        notification.unread ? 'bg-[#F5F5F5]' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm text-[#212121] break-words overflow-wrap-anywhere flex-1 min-w-0">
                              {notification.title}
                            </h4>
                            {notification.unread && (
                              <span className="w-2 h-2 bg-[#4F46E5] rounded-full flex-shrink-0 mt-1.5"></span>
                            )}
                          </div>
                          <p className="text-xs text-[#757575] mt-1 break-words overflow-wrap-anywhere">
                            {notification.message}
                          </p>
                          <p className="text-xs text-[#9E9E9E] mt-1 whitespace-nowrap">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-3 border-t border-[#E0E0E0] text-center">
                  <button className="text-xs text-[#4F46E5] hover:underline">
                    View all notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
