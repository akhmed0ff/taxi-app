'use client';

import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';
import { DriverLocationPayload, Ride } from './types';

export type RideRealtimeEvent =
  | 'DRIVER_ACCEPTED'
  | 'DRIVER_LOCATION'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'RIDE_CANCELLED'
  | 'PAYMENT_COMPLETED';

export interface RideRealtimeHandlers {
  onRide: (event: RideRealtimeEvent, ride: Ride) => void;
  onDriverLocation: (payload: DriverLocationPayload) => void;
  onInfo: (message: string) => void;
}

type RideRealtimePayload = Ride | { ride: Ride };

export function connectRideRealtime(
  rideId: string,
  accessToken: string,
  handlers: RideRealtimeHandlers,
) {
  const socket: Socket = io(API_URL, {
    transports: ['websocket'],
    auth: { accessToken },
  });

  socket.on('connect', () => {
    socket.emit('order.join', { orderId: rideId }, (response?: { ok: boolean }) => {
      handlers.onInfo(response?.ok ? 'Подключено к поездке' : 'Нет доступа к поездке');
    });
  });

  socket.on('DRIVER_ACCEPTED', (payload: RideRealtimePayload) =>
    handlers.onRide('DRIVER_ACCEPTED', unwrapRide(payload)),
  );
  socket.on('TRIP_STARTED', (payload: RideRealtimePayload) =>
    handlers.onRide('TRIP_STARTED', unwrapRide(payload)),
  );
  socket.on('TRIP_COMPLETED', (payload: RideRealtimePayload) =>
    handlers.onRide('TRIP_COMPLETED', unwrapRide(payload)),
  );
  socket.on('RIDE_CANCELLED', (payload: RideRealtimePayload) =>
    handlers.onRide('RIDE_CANCELLED', unwrapRide(payload)),
  );
  socket.on('PAYMENT_COMPLETED', (payload: RideRealtimePayload) =>
    handlers.onRide('PAYMENT_COMPLETED', unwrapRide(payload)),
  );
  socket.on('DRIVER_LOCATION', handlers.onDriverLocation);
  socket.on('connect_error', () =>
    handlers.onInfo('Не удалось подключиться к realtime'),
  );

  return () => {
    socket.disconnect();
  };
}

function unwrapRide(payload: RideRealtimePayload) {
  return 'ride' in payload ? payload.ride : payload;
}
