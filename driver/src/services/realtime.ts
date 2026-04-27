import { io, Socket } from 'socket.io-client';
import { OrderOffer } from '../types/order';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';

interface NewOrderPayload {
  ride?: {
    id: string;
    pickupLat: number;
    pickupLng: number;
    pickupAddress?: string;
    dropoffLat: number;
    dropoffLng: number;
    dropoffAddress?: string;
    estimatedFare?: number;
  };
  distanceMeters?: number;
  expiresInSeconds?: number;
}

export class DriverRealtimeClient {
  private socket?: Socket;

  connect(accessToken: string) {
    this.disconnect();

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { accessToken },
    });

    return this.socket;
  }

  onNewOrder(handler: (order: OrderOffer) => void) {
    const wrappedHandler = (payload: NewOrderPayload) => {
      if (!payload.ride) {
        return;
      }

      handler({
        id: payload.ride.id,
        pickupAddress: payload.ride.pickupAddress ?? 'Pickup',
        dropoffAddress: payload.ride.dropoffAddress ?? 'Dropoff',
        pickup: {
          lat: payload.ride.pickupLat,
          lng: payload.ride.pickupLng,
        },
        dropoff: {
          lat: payload.ride.dropoffLat,
          lng: payload.ride.dropoffLng,
        },
        price: payload.ride.estimatedFare ?? 0,
        distanceMeters: payload.distanceMeters ?? 0,
        expiresInSeconds: payload.expiresInSeconds ?? 25,
      });
    };

    this.socket?.on('NEW_ORDER', wrappedHandler);
    return () => {
      this.socket?.off('NEW_ORDER', wrappedHandler);
    };
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
  }
}

export const driverRealtimeClient = new DriverRealtimeClient();
