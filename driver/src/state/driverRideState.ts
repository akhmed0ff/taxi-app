import { useCallback, useReducer } from 'react';
import { ActiveTrip, OrderOffer } from '../types/order';

export type DriverRideStatus =
  | 'OFFLINE'
  | 'ONLINE_IDLE'
  | 'OFFER_RECEIVED'
  | 'GOING_TO_PICKUP'
  | 'ARRIVED'
  | 'RIDING'
  | 'COMPLETED';

interface DriverRideState {
  offer?: OrderOffer;
  status: DriverRideStatus;
  trip?: ActiveTrip;
}

type DriverRideAction =
  | { type: 'GO_ONLINE' }
  | { type: 'GO_OFFLINE' }
  | { type: 'OFFER_RECEIVED'; offer: OrderOffer }
  | { type: 'OFFER_DECLINED' }
  | { type: 'OFFER_ACCEPTED'; offer: OrderOffer }
  | { type: 'ARRIVED' }
  | { type: 'RIDE_STARTED' }
  | { type: 'RIDE_COMPLETED' }
  | { type: 'BACK_ONLINE' }
  | { type: 'RESET' };

const initialDriverRideState: DriverRideState = {
  status: 'OFFLINE',
};

function driverRideReducer(
  state: DriverRideState,
  action: DriverRideAction,
): DriverRideState {
  switch (action.type) {
    case 'GO_ONLINE':
      return {
        offer: undefined,
        status: 'ONLINE_IDLE',
        trip: undefined,
      };
    case 'GO_OFFLINE':
    case 'RESET':
      return initialDriverRideState;
    case 'OFFER_RECEIVED':
      if (state.status !== 'ONLINE_IDLE') {
        return state;
      }

      return {
        ...state,
        offer: action.offer,
        status: 'OFFER_RECEIVED',
      };
    case 'OFFER_DECLINED':
      return {
        ...state,
        offer: undefined,
        status: 'ONLINE_IDLE',
      };
    case 'OFFER_ACCEPTED':
      return {
        offer: undefined,
        status: 'GOING_TO_PICKUP',
        trip: {
          ...action.offer,
          status: 'ACCEPTED',
        },
      };
    case 'ARRIVED':
      if (!state.trip) {
        return state;
      }

      return {
        ...state,
        status: 'ARRIVED',
        trip: {
          ...state.trip,
          status: 'DRIVER_ARRIVED',
        },
      };
    case 'RIDE_STARTED':
      if (!state.trip) {
        return state;
      }

      return {
        ...state,
        status: 'RIDING',
        trip: {
          ...state.trip,
          status: 'IN_PROGRESS',
        },
      };
    case 'RIDE_COMPLETED':
      if (!state.trip) {
        return state;
      }

      return {
        ...state,
        status: 'COMPLETED',
        trip: {
          ...state.trip,
          status: 'COMPLETED',
        },
      };
    case 'BACK_ONLINE':
      return {
        offer: undefined,
        status: 'ONLINE_IDLE',
        trip: undefined,
      };
    default:
      return state;
  }
}

export function useDriverRideState() {
  const [state, dispatch] = useReducer(
    driverRideReducer,
    initialDriverRideState,
  );

  return {
    state,
    goOnline: useCallback(() => dispatch({ type: 'GO_ONLINE' }), []),
    goOffline: useCallback(() => dispatch({ type: 'GO_OFFLINE' }), []),
    receiveOffer: useCallback(
      (offer: OrderOffer) => dispatch({ type: 'OFFER_RECEIVED', offer }),
      [],
    ),
    declineOffer: useCallback(() => dispatch({ type: 'OFFER_DECLINED' }), []),
    acceptOffer: useCallback(
      (offer: OrderOffer) => dispatch({ type: 'OFFER_ACCEPTED', offer }),
      [],
    ),
    markArrived: useCallback(() => dispatch({ type: 'ARRIVED' }), []),
    startRide: useCallback(() => dispatch({ type: 'RIDE_STARTED' }), []),
    completeRide: useCallback(() => dispatch({ type: 'RIDE_COMPLETED' }), []),
    backOnline: useCallback(() => dispatch({ type: 'BACK_ONLINE' }), []),
    reset: useCallback(() => dispatch({ type: 'RESET' }), []),
  };
}
