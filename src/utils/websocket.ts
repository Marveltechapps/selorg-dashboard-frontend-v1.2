import { io, Socket } from 'socket.io-client';
import { getAuthToken, getAuthUser } from '../contexts/AuthContext';

/**
 * Resolve the WebSocket server URL.
 * Priority: VITE_WS_URL env var > Vite proxy (same origin, /socket.io path).
 */
function resolveWsUrl(): string {
  const envUrl = (import.meta.env.VITE_WS_URL ?? '').trim();
  if (envUrl) return envUrl;
  return window.location.origin;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private hasLoggedMaxAttempts = false;
  private connectionFailed = false;

  connect() {
    if (this.socket?.connected) {
      return;
    }

    if (this.connectionFailed) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      return;
    }

    const socketUrl = resolveWsUrl();

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.hasLoggedMaxAttempts = false;
      this.connectionFailed = false;

      const user = getAuthUser();
      if (user?.role) this.subscribe(`role:${user.role}`);
      if (user?.id) this.subscribe(`user:${user.id}`);
    });

    this.socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        console.warn('WebSocket: server disconnected');
      }
    });

    this.socket.on('connect_error', () => {
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts && !this.hasLoggedMaxAttempts) {
        this.hasLoggedMaxAttempts = true;
        this.connectionFailed = true;
        console.warn(
          'WebSocket: backend unreachable after %d attempts. Real-time updates disabled. Start the backend server and refresh to reconnect.',
          this.maxReconnectAttempts
        );
        this.cleanupSocket();
      }
    });

    this.reattachListeners();
  }

  private cleanupSocket() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private reattachListeners() {
    if (!this.socket) return;
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => this.socket!.on(event, cb));
    });
  }

  disconnect() {
    this.cleanupSocket();
    this.listeners.clear();
    this.connectionFailed = false;
    this.hasLoggedMaxAttempts = false;
    this.reconnectAttempts = 0;
  }

  resetConnection() {
    this.connectionFailed = false;
    this.hasLoggedMaxAttempts = false;
    this.reconnectAttempts = 0;
    this.cleanupSocket();
  }

  subscribe(room: string) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe', room);
    }
  }

  unsubscribe(room: string) {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', room);
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      this.listeners.get(event)?.clear();
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const websocketService = new WebSocketService();
export default websocketService;
