import { io, Socket } from 'socket.io-client';
import { API_URL, getAdminAccessToken } from './api';

type AdminRealtimeEvent = 'ORDER_UPDATED' | 'DRIVER_UPDATED';
type AdminRealtimeHandler = (payload: unknown) => void;

export class AdminRealtimeClient {
  private socket?: Socket;

  async connect(handlers: Record<AdminRealtimeEvent, AdminRealtimeHandler>) {
    const accessToken = await getAdminAccessToken();

    this.socket?.disconnect();
    this.socket = io(API_URL, {
      transports: ['websocket'],
      auth: { accessToken },
    });

    this.socket.on('ORDER_UPDATED', handlers.ORDER_UPDATED);
    this.socket.on('DRIVER_UPDATED', handlers.DRIVER_UPDATED);

    return () => {
      this.socket?.off('ORDER_UPDATED', handlers.ORDER_UPDATED);
      this.socket?.off('DRIVER_UPDATED', handlers.DRIVER_UPDATED);
      this.socket?.disconnect();
      this.socket = undefined;
    };
  }
}
