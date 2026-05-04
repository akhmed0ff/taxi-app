import { io, Socket } from 'socket.io-client';
import { mapRideToOrder } from './api';
import { Order, TariffClass } from '../types/order';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';

type BackendOrderEvent = Partial<Order> & {
  ride?: unknown;
  order?: unknown;
  payment?: unknown;
  rideId?: string;
  driverId?: string;
  driverName?: string;
  name?: string;
  car?: string;
  eta?: string;
  etaMinutes?: number;
  plate?: string;
  phone?: string;
  rating?: number;
  driver?: {
    id?: string;
    driverName?: string;
    eta?: string;
    name?: string;
    car?: string;
    plate?: string;
    phone?: string;
    rating?: number;
    etaMinutes?: number;
  };
  lat?: number;
  lng?: number;
};

export type OrderEventHandler = (payload: Partial<Order>) => void;

export class RealtimeClient {
  private socket?: Socket;

  connect(accessToken: string, passengerId?: string) {
    this.disconnect();

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { accessToken },
    });

    if (passengerId) {
      this.socket.on('connect', () => {
        this.socket?.emit('passenger.join', { passengerId });
      });
    }

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
      const ride = payload.ride ?? payload.order ?? payload;
      const nextOrder = mapRideToOrder(
        ride as Parameters<typeof mapRideToOrder>[0],
        tariff,
      );

      onEvent({
        ...nextOrder,
        status: nextOrder.status,
        driver: mapDriver(payload, nextOrder),
      });
    };
    const handleStatusEvent = (
      payload: BackendOrderEvent,
      status: Order['status'],
    ) => {
      const ride = payload.ride ?? payload.order;

      if (ride) {
        const nextOrder = mapRideToOrder(
          ride as Parameters<typeof mapRideToOrder>[0],
          tariff,
        );
        onEvent({
          ...nextOrder,
          status,
          driver: mapDriver(payload, nextOrder),
        });
        return;
      }

      onEvent({
        status,
        driver: mapDriver(payload, {} as Order),
      });
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

    this.socket.on('ride.driver_assigned', handleRideEvent);
    this.socket.on('ride.driver_arrived', handleRideEvent);
    this.socket.on('ride.started', handleRideEvent);
    this.socket.on('ride.completed', handleRideEvent);
    this.socket.on('ride.matching_failed', handleRideEvent);
    this.socket.on('ride.cancelled', handleRideEvent);
    this.socket.on('DRIVER_ACCEPTED', handleRideEvent);
    this.socket.on('DRIVER_ASSIGNED', handleRideEvent);
    const handleDriverAssigned = (payload: BackendOrderEvent) =>
      handleStatusEvent(payload, 'DRIVER_ASSIGNED');
    const handleDriverArrived = (payload: BackendOrderEvent) =>
      handleStatusEvent(payload, 'DRIVER_ARRIVED');
    const handleRideStarted = (payload: BackendOrderEvent) =>
      handleStatusEvent(payload, 'IN_PROGRESS');
    const handleRideCompleted = (payload: BackendOrderEvent) =>
      handleStatusEvent(payload, 'COMPLETED');
    const handleRideCancelled = (payload: BackendOrderEvent) =>
      handleStatusEvent(payload, 'CANCELLED');

    this.socket.on('driver_assigned', handleDriverAssigned);
    this.socket.on('DRIVER_ARRIVED', handleRideEvent);
    this.socket.on('driver_arrived', handleDriverArrived);
    this.socket.on('DRIVER_LOCATION', handleLocation);
    this.socket.on('TRIP_STARTED', handleRideEvent);
    this.socket.on('ride_started', handleRideStarted);
    this.socket.on('TRIP_COMPLETED', handleRideEvent);
    this.socket.on('ride_completed', handleRideCompleted);
    this.socket.on('PAYMENT_COMPLETED', handleRideEvent);
    this.socket.on('MATCHING_FAILED', handleRideEvent);
    this.socket.on('RIDE_CANCELLED', handleRideEvent);
    this.socket.on('ride_cancelled', handleRideCancelled);

    return () => {
      this.socket?.off('DRIVER_ACCEPTED', handleRideEvent);
      this.socket?.off('ride.driver_assigned', handleRideEvent);
      this.socket?.off('ride.driver_arrived', handleRideEvent);
      this.socket?.off('ride.started', handleRideEvent);
      this.socket?.off('ride.completed', handleRideEvent);
      this.socket?.off('ride.matching_failed', handleRideEvent);
      this.socket?.off('ride.cancelled', handleRideEvent);
      this.socket?.off('DRIVER_ASSIGNED', handleRideEvent);
      this.socket?.off('driver_assigned', handleDriverAssigned);
      this.socket?.off('DRIVER_ARRIVED', handleRideEvent);
      this.socket?.off('driver_arrived', handleDriverArrived);
      this.socket?.off('DRIVER_LOCATION', handleLocation);
      this.socket?.off('TRIP_STARTED', handleRideEvent);
      this.socket?.off('ride_started', handleRideStarted);
      this.socket?.off('TRIP_COMPLETED', handleRideEvent);
      this.socket?.off('ride_completed', handleRideCompleted);
      this.socket?.off('PAYMENT_COMPLETED', handleRideEvent);
      this.socket?.off('MATCHING_FAILED', handleRideEvent);
      this.socket?.off('RIDE_CANCELLED', handleRideEvent);
      this.socket?.off('ride_cancelled', handleRideCancelled);
    };
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
  }
}

export const realtimeClient = new RealtimeClient();

function mapDriver(payload: BackendOrderEvent, order: Order) {
  const driver = payload.driver ?? payload;

  if (
    !driver.driverName &&
    !driver.name &&
    !driver.car &&
    !driver.plate &&
    !driver.rating &&
    !driver.eta &&
    !driver.etaMinutes &&
    !payload.driverId
  ) {
    return order.driver;
  }

  return {
    id: payload.driver?.id ?? payload.driverId ?? order.driver?.id ?? 'driver',
    name:
      driver.driverName ??
      driver.name ??
      payload.driverName ??
      order.driver?.name ??
      'ANGREN TAXI',
    car: driver.car ?? payload.car ?? order.driver?.car ?? 'ANGREN TAXI',
    eta: driver.eta ?? payload.eta ?? order.driver?.eta,
    plate: driver.plate ?? payload.plate ?? order.driver?.plate,
    phone: driver.phone ?? payload.phone ?? order.driver?.phone,
    rating: driver.rating ?? payload.rating ?? order.driver?.rating ?? 5,
    etaMinutes:
      driver.etaMinutes ?? payload.etaMinutes ?? order.driver?.etaMinutes ?? 3,
  };
}
