import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { websocketService } from '../utils/websocket';
import { notificationService } from '../utils/notificationService';
import { toast } from 'sonner';

type EventName = string;
type Handler = (data: any) => void;

const ROLE_EVENTS: Record<string, EventName[]> = {
  darkstore: ['order:created', 'order:updated', 'order:cancelled'],
  admin: ['order:created', 'order:updated', 'order:cancelled', 'customer:registered', 'customer:updated', 'payment:created'],
  super_admin: ['order:created', 'order:updated', 'order:cancelled', 'customer:registered', 'customer:updated', 'payment:created'],
  finance: ['payment:created', 'order:created', 'order:cancelled'],
  production: ['order:created', 'order:updated'],
  merch: ['order:created'],
  rider: ['order:created', 'order:updated', 'order:cancelled'],
  vendor: ['order:created'],
  warehouse: ['order:created', 'order:updated'],
};

export function NotificationHandler() {
  const { isAuthenticated, user } = useAuth();
  const handlersRef = useRef<Map<EventName, Handler>>(new Map());
  const permissionRequested = useRef(false);

  const storeId = user?.role === 'darkstore'
    ? (sessionStorage.getItem('selorg_active_store') || '')
    : '';

  const createHandler = useCallback((event: EventName): Handler => {
    return (data: any) => {
      if (storeId && data?.store_id && data.store_id !== storeId) return;

      switch (event) {
        case 'order:created':
          notificationService.showOrderCreated(data);
          break;
        case 'order:updated':
          notificationService.showOrderUpdated(data);
          break;
        case 'order:cancelled':
          notificationService.showOrderCancelled(data);
          break;
        case 'payment:created':
          notificationService.showPaymentCreated(data);
          break;
        case 'customer:registered':
          notificationService.showCustomerRegistered(data);
          break;
        case 'customer:updated':
          break;
        default:
          break;
      }
    };
  }, [storeId]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    if (!permissionRequested.current) {
      permissionRequested.current = true;
      notificationService.requestPermission().then((granted) => {
        if (granted) {
          toast.success('Notifications enabled', {
            description: 'You will receive real-time alerts for order and payment events.',
            duration: 3000,
          });
        }
      });
    }

    websocketService.connect();

    const role = user.role || 'admin';
    const events = ROLE_EVENTS[role] || ROLE_EVENTS.admin;

    const currentHandlers = handlersRef.current;
    currentHandlers.forEach((handler, event) => {
      websocketService.off(event, handler);
    });
    currentHandlers.clear();

    events.forEach((event) => {
      const handler = createHandler(event);
      currentHandlers.set(event, handler);
      websocketService.on(event, handler);
    });

    return () => {
      currentHandlers.forEach((handler, event) => {
        websocketService.off(event, handler);
      });
      currentHandlers.clear();
    };
  }, [isAuthenticated, user, createHandler]);

  return null;
}

export default NotificationHandler;
