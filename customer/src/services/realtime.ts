import { io, Socket } from 'socket.io-client';
import { Order } from '../types/order';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';

export type OrderEventHandler = (payload: Partial<Order>) => void;

export class RealtimeClient {
  private socket?: Socket;

  connect(passengerId: string) {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { passengerId },
    });

    return this.socket;
  }

  subscribeToOrder(orderId: string, onEvent: OrderEventHandler) {
    if (!this.socket) {
      return () => undefined;
    }

    this.socket.emit('order.join', { orderId });
    this.socket.on('DRIVER_ACCEPTED', onEvent);
    this.socket.on('DRIVER_LOCATION', onEvent);
    this.socket.on('TRIP_STARTED', onEvent);
    this.socket.on('TRIP_COMPLETED', onEvent);

    return () => {
      this.socket?.off('DRIVER_ACCEPTED', onEvent);
      this.socket?.off('DRIVER_LOCATION', onEvent);
      this.socket?.off('TRIP_STARTED', onEvent);
      this.socket?.off('TRIP_COMPLETED', onEvent);
    };
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
  }
}

export const realtimeClient = new RealtimeClient();
