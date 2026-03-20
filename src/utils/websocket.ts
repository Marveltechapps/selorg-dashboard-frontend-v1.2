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

  // Dev fallback: if backend WebSocket endpoint is not explicitly configured,
  // disable Socket.IO by returning an empty URL. The caller will treat this
  // as "no realtime backend" and rely on HTTP polling instead of spamming
  // ERR_CONNECTION_REFUSED logs to /hhd-socket.io.
  return { url: '', path: '/hhd-socket.io' };
}

/**
 * Use polling-only when proxy doesn't support WebSocket upgrade (e.g. api.selorg.com).
 * Set VITE_WS_TRANSPORT=websocket to enable WebSocket when proxy is configured.
 */
function getTransports(): ('polling' | 'websocket')[] {
  const env = (import.meta.env.VITE_WS_TRANSPORT ?? '').toLowerCase();
  if (env === 'websocket') return ['polling', 'websocket'];
  return ['polling'];
}

const RETRY_INTERVAL_MS = 30000; // Retry every 30s when connection failed
const isProd = import.meta.env.PROD;

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

    // If resolveWsConfig returns an empty URL, it means WebSocket backend
    // is not configured for this environment. Skip connecting entirely to
    // avoid continuous net::ERR_CONNECTION_REFUSED noise.
    if (!socketUrl) {
      if (!isProd) {
        console.warn(
          'Socket.io disabled: no VITE_WS_URL / VITE_API_BASE_URL configured for realtime. Falling back to HTTP polling.'
        );
      }
      this.connectionFailed = true;
      return;
    }

    const transports = getTransports();
    this.socket = io(socketUrl, {
      path,
      auth: { token },

      transports,
      upgrade: transports.includes('websocket'),

      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 2000,

      timeout: 10000,
    });

    this.socket.on('connect', () => {
      if (!isProd) console.log('Socket connected');
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
      if (!isProd) console.warn('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      if (!isProd) console.warn('Socket connection error:', err.message);

      this.reconnectAttempts++;

      if (
        this.reconnectAttempts >= this.maxReconnectAttempts &&
        !this.hasLoggedMaxAttempts
      ) {
        this.hasLoggedMaxAttempts = true;
        this.connectionFailed = true;

        if (!isProd) {
          console.warn(
            `Socket: backend unreachable after ${this.maxReconnectAttempts} attempts. Will retry periodically. Real-time updates paused.`
          );
        }

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
