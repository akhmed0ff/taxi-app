import { io, Socket } from 'socket.io-client';
import { Coords, OrderOffer } from '../types/order';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';

export class DriverRealtimeClient {
  private socket?: Socket;

  connect(accessToken: string) {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { accessToken },
    });

    return this.socket;
  }

  onNewOrder(handler: (order: OrderOffer) => void) {
    this.socket?.on('NEW_ORDER', handler);
    return () => this.socket?.off('NEW_ORDER', handler);
  }

  emitLocationUpdate(coords: Coords) {
    this.socket?.emit('LOCATION_UPDATE', coords);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
  }
}

export const driverRealtimeClient = new DriverRealtimeClient();
