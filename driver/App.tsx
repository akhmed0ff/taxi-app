import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  acceptOrder,
  cancelOrder,
  completeTrip,
  DriverSession,
  loginDriver,
  logoutDriver,
  markArrived,
  refreshDriverSession,
  startTrip,
  updateDriverStatus,
} from './src/services/api';
import { driverRealtimeClient } from './src/services/realtime';
import { useDriverLocationTracking } from './src/hooks/useDriverLocationTracking';
import { BalanceScreen } from './src/screens/BalanceScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { NavigationScreen } from './src/screens/NavigationScreen';
import { OnlineScreen } from './src/screens/OnlineScreen';
import { OrderOfferScreen } from './src/screens/OrderOfferScreen';
import { TripScreen } from './src/screens/TripScreen';
import { ActiveTrip, DriverStatus, OrderOffer } from './src/types/order';

type Screen = 'auth' | 'online' | 'offer' | 'navigation' | 'trip' | 'balance' | 'history';

export default function App() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [session, setSession] = useState<DriverSession>();
  const [status, setStatus] = useState<DriverStatus>('OFFLINE');
  const [offer, setOffer] = useState<OrderOffer>();
  const [trip, setTrip] = useState<ActiveTrip>();
  const [earnedToday, setEarnedToday] = useState(0);

  useDriverLocationTracking({
    accessToken: session?.accessToken,
    driverId: session?.driverId,
    enabled: Boolean(session?.driverId) && status !== 'OFFLINE',
  });

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    driverRealtimeClient.connect(session.accessToken);
    const unsubscribeNewOrder = driverRealtimeClient.onNewOrder((nextOffer) => {
      setOffer({
        ...nextOffer,
        expiresInSeconds: nextOffer.expiresInSeconds ?? 10,
      });
      setScreen('offer');
    });
    const unsubscribeCancelled = driverRealtimeClient.onRideCancelled((rideId) => {
      setTrip((current) => {
        if (!current || current.id !== rideId) {
          return current;
        }

        setStatus('ONLINE');
        setScreen('online');
        return undefined;
      });
    });

    return () => {
      unsubscribeNewOrder();
      unsubscribeCancelled();
      driverRealtimeClient.disconnect();
    };
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.refreshToken) {
      return;
    }

    const timer = setInterval(() => {
      void refreshDriverSession(session.refreshToken)
        .then(setSession)
        .catch((error) => {
          console.warn(error);
          setSession(undefined);
          setStatus('OFFLINE');
          setScreen('auth');
        });
    }, 1000 * 60 * 10);

    return () => clearInterval(timer);
  }, [session?.refreshToken]);

  async function handleAuthenticated(phone: string) {
    try {
      const nextSession = await loginDriver(phone);
      setSession(nextSession);
      setScreen('online');
    } catch (error) {
      console.warn(error);
    }
  }

  async function toggleOnline() {
    if (!session) {
      return;
    }

    const nextStatus = status === 'OFFLINE' ? 'ONLINE' : 'OFFLINE';

    try {
      await updateDriverStatus(session.accessToken, session.driverId, nextStatus);
      setStatus(nextStatus);
    } catch (error) {
      console.warn(error);
    }
  }

  async function handleAcceptOffer() {
    if (!offer || !session) {
      return;
    }

    const acceptedOffer = offer;

    try {
      await acceptOrder(session.accessToken, acceptedOffer.id, session.driverId);
      setStatus('BUSY');
      setTrip({ ...acceptedOffer, status: 'ACCEPTED' });
      setOffer(undefined);
      setScreen('navigation');
    } catch (error) {
      console.warn(error);
      setOffer(undefined);
      setScreen('online');
    }
  }

  async function handleCancelTrip() {
    if (!session || !trip) {
      return;
    }

    try {
      await cancelOrder(session.accessToken, trip.id);
      setTrip(undefined);
      setStatus('ONLINE');
      setScreen('online');
    } catch (error) {
      console.warn(error);
    }
  }

  async function handleLogout() {
    if (session?.refreshToken) {
      try {
        await logoutDriver(session.refreshToken);
      } catch (error) {
        console.warn(error);
      }
    }

    driverRealtimeClient.disconnect();
    setSession(undefined);
    setStatus('OFFLINE');
    setOffer(undefined);
    setTrip(undefined);
    setScreen('auth');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {screen === 'auth' && (
        <AuthScreen onAuthenticated={handleAuthenticated} />
      )}
      {screen === 'online' && (
        <OnlineScreen
          onLogout={handleLogout}
          onOpenHistory={() => setScreen('history')}
          onToggleOnline={toggleOnline}
          status={status}
        />
      )}
      {screen === 'history' && session && (
        <HistoryScreen
          accessToken={session.accessToken}
          onBack={() => setScreen('online')}
        />
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
          onCancel={handleCancelTrip}
          onArrived={async () => {
            if (!session) return;
            await markArrived(session.accessToken, trip.id);
            setTrip({ ...trip, status: 'DRIVER_ARRIVED' });
            setScreen('trip');
          }}
          trip={trip}
        />
      )}
      {screen === 'trip' && trip && (
        <TripScreen
          onComplete={async () => {
            if (!session) return;
            await completeTrip(session.accessToken, trip.id);
            setEarnedToday((value) => value + trip.price);
            setTrip({ ...trip, status: 'COMPLETED' });
            setStatus('ONLINE');
            setScreen('balance');
          }}
          onStart={async () => {
            if (!session) return;
            await startTrip(session.accessToken, trip.id);
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
