import { OrderCommandDrawer } from '@/components/rider/OrderCommandDrawer';
import type { Order, Rider } from './types';

interface OrderDetailsDrawerProps {
  order: Order | null;
  rider: Rider | undefined;
  riders?: Rider[];
  isOpen: boolean;
  onClose: () => void;
  onReassign: (order: Order) => void;
  onAlert: (orderId: string, reason: string) => Promise<void>;
  onOpenDispatch?: (orderId: string) => void;
  onEscalate?: (orderId: string) => void;
}

/** Unified order command drawer — wraps shared OrderCommandDrawer for fleet overview. */
export function OrderDetailsDrawer(props: OrderDetailsDrawerProps) {
  return (
    <OrderCommandDrawer
      order={props.order}
      rider={props.rider}
      riders={props.riders}
      isOpen={props.isOpen}
      onClose={props.onClose}
      onReassign={props.onReassign}
      onAlert={props.onAlert}
      onOpenDispatch={props.onOpenDispatch}
      onEscalate={props.onEscalate}
    />
  );
}
