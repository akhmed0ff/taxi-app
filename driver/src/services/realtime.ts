import { io, Socket } from 'socket.io-client';
import { DriverStatus, OrderOffer } from '../types/order';

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
    tariffClass?: string;
  };
  order?: NewOrderPayload['ride'];
  distanceMeters?: number;
  expiresInSeconds?: number;
}

export class DriverRealtimeClient {
  private socket?: Socket;

  connect(
    accessToken: string,
    driverId?: string,
    onConnectionChange?: (connected: boolean) => void,
  ) {
    this.disconnect();

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { accessToken },
    });

    if (driverId) {
      this.socket.on('connect', () => {
        this.socket?.emit('driver.join', { driverId });
        onConnectionChange?.(true);
      });
    } else {
      this.socket.on('connect', () => onConnectionChange?.(true));
    }

    this.socket.on('disconnect', () => onConnectionChange?.(false));
    this.socket.on('connect_error', () => onConnectionChange?.(false));

    return this.socket;
  }

  emitDriverStatus(driverId: string, status: DriverStatus) {
    this.socket?.emit('driver.status', { driverId, status });
  }

  rejectRideOffer(orderId: string, driverId: string) {
    this.socket?.emit('ride.reject', { rideId: orderId, driverId });
  }

  onNewOrder(handler: (order: OrderOffer) => void) {
    let lastOfferId: string | undefined;

    const wrappedHandler = (payload: NewOrderPayload) => {
      const ride = payload.ride ?? payload.order;

      if (!ride) {
        return;
      }

      if (ride.id === lastOfferId) {
        return;
      }

      lastOfferId = ride.id;

      handler({
        id: ride.id,
        pickupAddress: ride.pickupAddress ?? 'Pickup',
        dropoffAddress: ride.dropoffAddress ?? 'Dropoff',
        pickup: {
          lat: ride.pickupLat,
          lng: ride.pickupLng,
        },
        dropoff: {
          lat: ride.dropoffLat,
          lng: ride.dropoffLng,
        },
        price: ride.estimatedFare ?? 0,
        distanceMeters: payload.distanceMeters ?? 0,
        expiresInSeconds: payload.expiresInSeconds ?? 10,
        tariffClass: ride.tariffClass,
      });
    };

    this.socket?.on('NEW_ORDER', wrappedHandler);
    this.socket?.on('new_ride_offer', wrappedHandler);
    return () => {
      this.socket?.off('NEW_ORDER', wrappedHandler);
      this.socket?.off('new_ride_offer', wrappedHandler);
    };
  }

  onRideCancelled(handler: (rideId: string) => void) {
    const wrappedHandler = (payload: { ride?: { id?: string }; rideId?: string }) => {
      const rideId = payload.ride?.id ?? payload.rideId;

      if (rideId) {
        handler(rideId);
      }
    };

    this.socket?.on('RIDE_CANCELLED', wrappedHandler);
    return () => {
      this.socket?.off('RIDE_CANCELLED', wrappedHandler);
    };
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
  }
}

export const driverRealtimeClient = new DriverRealtimeClient();
