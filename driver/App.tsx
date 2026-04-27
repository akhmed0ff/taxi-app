import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  acceptOrder,
  completeTrip,
  DriverSession,
  loginDriver,
  markArrived,
  startTrip,
  updateDriverStatus,
} from './src/services/api';
import { driverRealtimeClient } from './src/services/realtime';
import { useDriverLocationTracking } from './src/hooks/useDriverLocationTracking';
import { BalanceScreen } from './src/screens/BalanceScreen';
import { NavigationScreen } from './src/screens/NavigationScreen';
import { OnlineScreen } from './src/screens/OnlineScreen';
import { OrderOfferScreen } from './src/screens/OrderOfferScreen';
import { TripScreen } from './src/screens/TripScreen';
import { ActiveTrip, DriverStatus, OrderOffer } from './src/types/order';

type Screen = 'online' | 'offer' | 'navigation' | 'trip' | 'balance';

export default function App() {
  const [screen, setScreen] = useState<Screen>('online');
  const [session, setSession] = useState<DriverSession>();
  const [status, setStatus] = useState<DriverStatus>('OFFLINE');
  const [offer, setOffer] = useState<OrderOffer>();
  const [trip, setTrip] = useState<ActiveTrip>();
  const [earnedToday, setEarnedToday] = useState(0);

  useDriverLocationTracking({
    driverId: session?.driverId,
    enabled: Boolean(session?.driverId) && status !== 'OFFLINE',
  });

  useEffect(() => {
    let unsubscribe: () => void = () => undefined;

    void loginDriver().then((nextSession) => {
      setSession(nextSession);
      driverRealtimeClient.connect(nextSession.accessToken);
      unsubscribe = driverRealtimeClient.onNewOrder((nextOffer) => {
        setOffer({
          ...nextOffer,
          expiresInSeconds: nextOffer.expiresInSeconds ?? 25,
        });
        setScreen('offer');
      });
    });

    return () => {
      unsubscribe();
      driverRealtimeClient.disconnect();
    };
  }, []);

  async function toggleOnline() {
    if (!session) {
      return;
    }

    const nextStatus = status === 'OFFLINE' ? 'ONLINE' : 'OFFLINE';
    setStatus(nextStatus);
    await updateDriverStatus(session.driverId, nextStatus);
  }

  async function handleAcceptOffer() {
    if (!offer || !session) {
      return;
    }

    const acceptedOffer = offer;
    await acceptOrder(acceptedOffer.id, session.driverId);
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
          onArrived={async () => {
            await markArrived(trip.id);
            setTrip({ ...trip, status: 'DRIVER_ARRIVED' });
            setScreen('trip');
          }}
          trip={trip}
        />
      )}
      {screen === 'trip' && trip && (
        <TripScreen
          onComplete={async () => {
            await completeTrip(trip.id);
            setEarnedToday((value) => value + trip.price);
            setTrip({ ...trip, status: 'COMPLETED' });
            setStatus('ONLINE');
            setScreen('balance');
          }}
          onStart={async () => {
            await startTrip(trip.id);
            setTrip({ ...trip, status: 'IN_PROGRESS' });
          }}
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
