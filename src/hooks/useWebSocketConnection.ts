import { useState, useEffect } from 'react';
import { websocketService } from '../utils/websocket';

/** Hook that returns whether the WebSocket is connected for real-time updates */
export function useWebSocketConnection(): boolean {
  const [isConnected, setIsConnected] = useState(websocketService.isConnected());

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    websocketService.on('connect', onConnect);
    websocketService.on('disconnect', onDisconnect);
    setIsConnected(websocketService.isConnected());
    return () => {
      websocketService.off('connect', onConnect);
      websocketService.off('disconnect', onDisconnect);
    };
  }, []);

  return isConnected;
}
