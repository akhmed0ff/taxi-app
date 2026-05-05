import { act, renderHook } from '@testing-library/react-native';
import { usePassengerRideState } from '../passengerRideState';

describe('usePassengerRideState', () => {
  it('has correct initial state', () => {
    const { result } = renderHook(() => usePassengerRideState());

    expect(result.current.state).toEqual({
      selectedTariff: 'STANDARD',
      status: 'IDLE',
    });
  });

  it('applies transitions correctly', () => {
    const { result } = renderHook(() => usePassengerRideState());

    act(() => {
      result.current.selectTariff('COMFORT');
    });
    expect(result.current.state.selectedTariff).toBe('COMFORT');

    act(() => {
      result.current.markOrderCreated('ride-1', 'COMFORT');
    });
    expect(result.current.state.status).toBe('SEARCHING');
    expect(result.current.state.orderId).toBe('ride-1');

    act(() => {
      result.current.markDriverAssigned({
        id: 'ride-1',
        status: 'ACCEPTED',
        pickup: { lat: 41.01, lng: 70.14, address: 'Pickup' },
        dropoff: { lat: 41.02, lng: 70.15, address: 'Dropoff' },
        price: 15000,
        tariff: 'COMFORT',
        driver: {
          id: 'driver-1',
          name: 'Test Driver',
          car: 'Cobalt',
          plate: '01 A 777 AA',
          phone: '+998900000000',
          rating: 4.9,
          etaMinutes: 3,
        },
      });
    });
    expect(result.current.state.status).toBe('DRIVER_FOUND');
    expect(result.current.state.driver?.id).toBe('driver-1');

    act(() => {
      result.current.markRideStarted();
    });
    expect(result.current.state.status).toBe('RIDING');

    act(() => {
      result.current.markRideCompleted();
    });
    expect(result.current.state.status).toBe('COMPLETED');
  });
});
