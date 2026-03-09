import { io, Socket } from 'socket.io-client';
import { getAuthToken, getAuthUser } from '../contexts/AuthContext';

/**
 * Resolve the WebSocket server URL and path.
 * Priority: VITE_WS_URL > VITE_API_BASE_URL origin > direct backend (dev) > same origin.
 * Connects directly to backend in dev to avoid Vite proxy "socket hang up" errors.
 * Uses path /hhd-socket.io (backend Socket.IO path).
 */
function resolveWsConfig(): { url: string; path: string } {
  const envUrl = (import.meta.env.VITE_WS_URL ?? '').trim();
  if (envUrl) return { url: envUrl, path: '/hhd-socket.io' };

  const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
  if (apiBase) {
    try {
      const u = new URL(apiBase);
      return { url: u.origin, path: '/hhd-socket.io' };
    } catch {
      /* fallback */
    }
  }

  // Dev: connect directly to backend to bypass Vite proxy (avoids ws proxy "socket hang up")
  const port = (import.meta.env.VITE_PROXY_PORT ?? '5001').toString();
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const origin = window.location.origin;
    const host = origin.includes('localhost') ? 'localhost' : new URL(origin).hostname;
    return { url: `http://${host}:${port}`, path: '/hhd-socket.io' };
  }

  return { url: window.location.origin, path: '/hhd-socket.io' };
}

const RETRY_INTERVAL_MS = 30000; // Retry every 30s when connection failed

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private hasLoggedMaxAttempts = false;
  private connectionFailed = false;
  private retryTimerId: ReturnType<typeof setInterval> | null = null;

  private scheduleRetry() {
    if (this.retryTimerId) return;
    this.retryTimerId = setInterval(() => {
      if (this.socket?.connected) {
        this.clearRetryTimer();
        return;
      }
      this.clearRetryTimer();
      this.connectionFailed = false;
      this.hasLoggedMaxAttempts = false;
      this.reconnectAttempts = 0;
      this.connect();
    }, RETRY_INTERVAL_MS);
  }

  private clearRetryTimer() {
    if (this.retryTimerId) {
      clearInterval(this.retryTimerId);
      this.retryTimerId = null;
    }
  }

  connect() {
    if (this.socket?.connected) return;
    if (this.connectionFailed) return;

    const token = getAuthToken();
    if (!token) return;

    const { url: socketUrl, path } = resolveWsConfig();

    this.socket = io(socketUrl, {
      path,
      auth: { token },

      transports: ['websocket', 'polling'],
      upgrade: true,

      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 2000,

      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.clearRetryTimer();
      this.reconnectAttempts = 0;
      this.hasLoggedMaxAttempts = false;
      this.connectionFailed = false;

      const user = getAuthUser();

      if (user?.role) {
        this.subscribe(`role:${user.role}`);
      }

      if (user?.id) {
        this.subscribe(`user:${user.id}`);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('WebSocket connection error:', err.message);

      this.reconnectAttempts++;

      if (
        this.reconnectAttempts >= this.maxReconnectAttempts &&
        !this.hasLoggedMaxAttempts
      ) {
        this.hasLoggedMaxAttempts = true;
        this.connectionFailed = true;

        console.warn(
          `WebSocket: backend unreachable after ${this.maxReconnectAttempts} attempts. Will retry periodically. Real-time updates paused.`
        );

        this.cleanupSocket();
        this.scheduleRetry();
      }
    });

    this.reattachListeners();
  }

  private cleanupSocket() {
    if (!this.socket) return;

    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }

  private reattachListeners() {
    if (!this.socket) return;

    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => {
        this.socket!.on(event, cb);
      });
    });
  }

  disconnect() {
    this.clearRetryTimer();
    this.cleanupSocket();
    this.listeners.clear();

    this.connectionFailed = false;
    this.hasLoggedMaxAttempts = false;
    this.reconnectAttempts = 0;
  }

  resetConnection() {
    this.clearRetryTimer();
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
