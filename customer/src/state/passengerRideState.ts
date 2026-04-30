import { useCallback, useReducer } from 'react';
import { DriverPreview, Order, TariffClass } from '../types/order';

export type PassengerRideStatus =
  | 'IDLE'
  | 'SEARCHING'
  | 'DRIVER_FOUND'
  | 'RIDING'
  | 'COMPLETED';

interface PassengerRideState {
  driver?: DriverPreview;
  orderId?: string;
  selectedTariff: TariffClass;
  status: PassengerRideStatus;
}

type PassengerRideAction =
  | { type: 'SELECT_TARIFF'; tariff: TariffClass }
  | { type: 'ORDER_CREATED'; orderId: string; tariff: TariffClass }
  | { type: 'DRIVER_ASSIGNED'; driver?: DriverPreview; orderId: string }
  | { type: 'RIDE_STARTED' }
  | { type: 'RIDE_COMPLETED' }
  | { type: 'RESET' };

const initialPassengerRideState: PassengerRideState = {
  selectedTariff: 'STANDARD',
  status: 'IDLE',
};

function passengerRideReducer(
  state: PassengerRideState,
  action: PassengerRideAction,
): PassengerRideState {
  switch (action.type) {
    case 'SELECT_TARIFF':
      return {
        ...state,
        selectedTariff: action.tariff,
      };
    case 'ORDER_CREATED':
      return {
        ...state,
        driver: undefined,
        orderId: action.orderId,
        selectedTariff: action.tariff,
        status: 'SEARCHING',
      };
    case 'DRIVER_ASSIGNED':
      return {
        ...state,
        driver: action.driver ?? state.driver,
        orderId: action.orderId,
        status: 'DRIVER_FOUND',
      };
    case 'RIDE_STARTED':
      return {
        ...state,
        status: 'RIDING',
      };
    case 'RIDE_COMPLETED':
      return {
        ...state,
        status: 'COMPLETED',
      };
    case 'RESET':
      return initialPassengerRideState;
    default:
      return state;
  }
}

export function usePassengerRideState() {
  const [state, dispatch] = useReducer(
    passengerRideReducer,
    initialPassengerRideState,
  );

  const selectTariff = useCallback(
    (tariff: TariffClass) => dispatch({ type: 'SELECT_TARIFF', tariff }),
    [],
  );
  const markOrderCreated = useCallback(
    (orderId: string, tariff: TariffClass) =>
      dispatch({ type: 'ORDER_CREATED', orderId, tariff }),
    [],
  );
  const markDriverAssigned = useCallback(
    (order: Order) =>
      dispatch({
        type: 'DRIVER_ASSIGNED',
        driver: order.driver,
        orderId: order.id,
      }),
    [],
  );
  const markRideStarted = useCallback(
    () => dispatch({ type: 'RIDE_STARTED' }),
    [],
  );
  const markRideCompleted = useCallback(
    () => dispatch({ type: 'RIDE_COMPLETED' }),
    [],
  );
  const resetRide = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    state,
    selectTariff,
    markOrderCreated,
    markDriverAssigned,
    markRideStarted,
    markRideCompleted,
    resetRide,
  };
}
