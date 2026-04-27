import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { acceptOrder, updateDriverStatus } from './src/services/api';
import { driverRealtimeClient } from './src/services/realtime';
import { useDriverLocationTracking } from './src/hooks/useDriverLocationTracking';
import { BalanceScreen } from './src/screens/BalanceScreen';
import { NavigationScreen } from './src/screens/NavigationScreen';
import { OnlineScreen } from './src/screens/OnlineScreen';
import { OrderOfferScreen } from './src/screens/OrderOfferScreen';
import { TripScreen } from './src/screens/TripScreen';
import { ActiveTrip, DriverStatus, OrderOffer } from './src/types/order';

type Screen = 'online' | 'offer' | 'navigation' | 'trip' | 'balance';

const DRIVER_ID = 'driver-demo';

const demoOffer: OrderOffer = {
  id: 'order-demo',
  pickupAddress: 'Amir Temur Avenue',
  dropoffAddress: 'Tashkent City Mall',
  pickup: { lat: 41.3111, lng: 69.2797 },
  dropoff: { lat: 41.316, lng: 69.248 },
  price: 28000,
  distanceMeters: 4300,
  expiresInSeconds: 8,
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('online');
  const [status, setStatus] = useState<DriverStatus>('OFFLINE');
  const [offer, setOffer] = useState<OrderOffer>();
  const [trip, setTrip] = useState<ActiveTrip>();
  const [earnedToday, setEarnedToday] = useState(0);

  useDriverLocationTracking({ enabled: status !== 'OFFLINE' });

  useEffect(() => {
    driverRealtimeClient.connect(DRIVER_ID);
    const unsubscribe = driverRealtimeClient.onNewOrder((nextOffer) => {
      setOffer({ ...nextOffer, expiresInSeconds: nextOffer.expiresInSeconds ?? 8 });
      setScreen('offer');
    });

    return () => {
      unsubscribe();
      driverRealtimeClient.disconnect();
    };
  }, []);

  async function toggleOnline() {
    const nextStatus = status === 'OFFLINE' ? 'ONLINE' : 'OFFLINE';
    setStatus(nextStatus);
    void updateDriverStatus(DRIVER_ID, nextStatus);

    if (nextStatus === 'ONLINE') {
      setOffer(demoOffer);
      setScreen('offer');
    }
  }

  async function handleAcceptOffer() {
    const acceptedOffer = offer ?? demoOffer;
    void acceptOrder(acceptedOffer.id, DRIVER_ID);
    setStatus('BUSY');
    setTrip({ ...acceptedOffer, status: 'ACCEPTED' });
    setScreen('navigation');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {screen === 'online' && (
        <OnlineScreen onToggleOnline={toggleOnline} status={status} />
      )}
      {screen === 'offer' && offer && (
        <OrderOfferScreen
          offer={offer}
          onAccept={handleAcceptOffer}
          onDecline={() => {
            setOffer(undefined);
            setScreen('online');
          }}
        />
      )}
      {screen === 'navigation' && trip && (
        <NavigationScreen
          onArrived={() => {
            setTrip({ ...trip, status: 'DRIVER_ARRIVED' });
            setScreen('trip');
          }}
          trip={trip}
        />
      )}
      {screen === 'trip' && trip && (
        <TripScreen
          onComplete={() => {
            setEarnedToday((value) => value + trip.price);
            setTrip({ ...trip, status: 'COMPLETED' });
            setStatus('ONLINE');
            setScreen('balance');
          }}
          onStart={() => setTrip({ ...trip, status: 'IN_PROGRESS' })}
          trip={trip}
        />
      )}
      {screen === 'balance' && (
        <BalanceScreen
          earnedToday={earnedToday}
          onBackOnline={() => setScreen('online')}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
