import React from 'react';
import { View } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { HomeScreen } from '../HomeScreen';
import { Order } from '../../types/order';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('../../components/map', () => ({
  FakeMapPlaceholder: () => null,
  PassengerMapboxMap: () => null,
}));

jest.mock('../../services/api', () => ({
  getTariffs: jest.fn().mockResolvedValue([
    {
      id: 't1',
      code: 'STANDARD',
      title: 'Стандарт',
      isActive: true,
      sortOrder: 1,
      baseFare: 8000,
      pricePerKm: 2500,
      etaMinutes: 7,
      seats: 4,
      minimumFare: 12000,
      freeWaitingMinutes: 3,
      waitingPerMinute: 500,
      stopPerMinute: 500,
    },
  ]),
  ensurePassengerDevSession: jest.fn().mockResolvedValue({
    accessToken: 'token',
    refreshToken: 'refresh',
    customerId: 'customer-1',
    user: { id: 'customer-1' },
  }),
  createOrder: jest.fn().mockResolvedValue({
    id: 'ride-1',
    status: 'SEARCHING',
    pickup: { lat: 41.0167, lng: 70.1436, address: 'Ангрен, текущая точка' },
    dropoff: { lat: 41.0167, lng: 70.1436, address: 'Ангрен, Центр' },
    tariff: 'STANDARD',
    price: 12000,
  }),
}));

describe('HomeScreen', () => {
  it('renders without crashing', async () => {
    const createdOrder: Order = {
      id: 'ride-1',
      status: 'SEARCHING',
      pickup: { lat: 41.01, lng: 70.14, address: 'Pickup' },
      dropoff: { lat: 41.02, lng: 70.15, address: 'Dropoff' },
      tariff: 'STANDARD',
      price: 12000,
    };

    const { getByText } = render(
      <HomeScreen
        onCancelOrder={jest.fn().mockResolvedValue(undefined)}
        onOpenHistory={jest.fn()}
        onLogout={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(getByText('Стандарт')).toBeTruthy();
    });
  });
});
