import { io, Socket } from 'socket.io-client';
import { mapRideToOrder } from './api';
import { Order, TariffClass } from '../types/order';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';

type BackendOrderEvent = Partial<Order> & {
  ride?: unknown;
  payment?: unknown;
  rideId?: string;
  driverId?: string;
  lat?: number;
  lng?: number;
};

export type OrderEventHandler = (payload: Partial<Order>) => void;

export class RealtimeClient {
  private socket?: Socket;

  connect(accessToken: string) {
    this.disconnect();

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { accessToken },
    });

    return this.socket;
  }

  subscribeToOrder(
    orderId: string,
    tariff: TariffClass,
    onEvent: OrderEventHandler,
  ) {
    if (!this.socket) {
      return () => undefined;
    }

    this.socket.emit('order.join', { orderId });

    const handleRideEvent = (payload: BackendOrderEvent) => {
      const ride = payload.ride ?? payload;
      onEvent(mapRideToOrder(ride as Parameters<typeof mapRideToOrder>[0], tariff));
    };
    const handleLocation = (payload: BackendOrderEvent) => {
      if (typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
        return;
      }

      onEvent({
        driverLocation: {
          lat: payload.lat,
          lng: payload.lng,
        },
      });
    };

    this.socket.on('DRIVER_ACCEPTED', handleRideEvent);
    this.socket.on('DRIVER_LOCATION', handleLocation);
    this.socket.on('TRIP_STARTED', handleRideEvent);
    this.socket.on('TRIP_COMPLETED', handleRideEvent);
    this.socket.on('PAYMENT_COMPLETED', handleRideEvent);
    this.socket.on('MATCHING_FAILED', handleRideEvent);

    return () => {
      this.socket?.off('DRIVER_ACCEPTED', handleRideEvent);
      this.socket?.off('DRIVER_LOCATION', handleLocation);
      this.socket?.off('TRIP_STARTED', handleRideEvent);
      this.socket?.off('TRIP_COMPLETED', handleRideEvent);
      this.socket?.off('PAYMENT_COMPLETED', handleRideEvent);
      this.socket?.off('MATCHING_FAILED', handleRideEvent);
    };
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
  }
}

export const realtimeClient = new RealtimeClient();
