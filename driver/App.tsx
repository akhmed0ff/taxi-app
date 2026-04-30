import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  acceptOrder,
  cancelOrder,
  completeTrip,
  DriverSession,
  ensureDriverDevSession,
  loginDriver,
  logoutDriver,
  markArrived,
  refreshDriverSession,
  startTrip,
  updateDriverStatus,
  updateDriverLocation,
} from './src/services/api';
import { driverRealtimeClient } from './src/services/realtime';
import { useDriverLocationTracking } from './src/hooks/useDriverLocationTracking';
import { useDriverRideState } from './src/state/driverRideState';
import { BalanceScreen } from './src/screens/BalanceScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { NavigationScreen } from './src/screens/NavigationScreen';
import { OnlineScreen } from './src/screens/OnlineScreen';
import { OrderOfferScreen } from './src/screens/OrderOfferScreen';
import { TripScreen } from './src/screens/TripScreen';
import { DriverStatus } from './src/types/order';

type Screen = 'auth' | 'online' | 'offer' | 'navigation' | 'trip' | 'balance' | 'history';

export default function App() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [session, setSession] = useState<DriverSession>();
  const [status, setStatus] = useState<DriverStatus>('OFFLINE');
  const [driverPosition, setDriverPosition] = useState<{ lat: number; lng: number }>();
  const [earnedToday, setEarnedToday] = useState(0);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isAcceptingOffer, setIsAcceptingOffer] = useState(false);
  const {
    acceptOffer,
    backOnline,
    completeRide,
    declineOffer,
    goOffline,
    goOnline,
    markArrived: markDriverArrivedState,
    receiveOffer,
    reset,
    startRide,
    state: rideState,
  } = useDriverRideState();
  const { offer, trip } = rideState;

  useEffect(() => {
    void ensureDriverDevSession()
      .then((nextSession) => {
        setSession(nextSession);
        setScreen('online');
      })
      .catch((error) => {
        console.warn(error);
      });
  }, []);

  useDriverLocationTracking({
    accessToken: session?.accessToken,
    driverId: session?.driverId,
    enabled: Boolean(session?.driverId) && status !== 'OFFLINE',
    onLocation: setDriverPosition,
  });

  useEffect(() => {
    if (!session?.accessToken || !session.driverId) {
      return;
    }

    driverRealtimeClient.connect(
      session.accessToken,
      session.driverId,
      setIsSocketConnected,
    );
    const unsubscribeNewOrder = driverRealtimeClient.onNewOrder((nextOffer) => {
      if (status !== 'ONLINE') {
        return;
      }

      receiveOffer({
        ...nextOffer,
        expiresInSeconds: nextOffer.expiresInSeconds ?? 10,
      });
      setScreen('offer');
    });
    const unsubscribeCancelled = driverRealtimeClient.onRideCancelled((rideId) => {
      if (trip?.id === rideId) {
        setStatus('ONLINE');
        backOnline();
        setScreen('online');
      }
    });

    return () => {
      unsubscribeNewOrder();
      unsubscribeCancelled();
      driverRealtimeClient.disconnect();
      setIsSocketConnected(false);
    };
  }, [
    backOnline,
    receiveOffer,
    session?.accessToken,
    session?.driverId,
    status,
    trip?.id,
  ]);

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
          reset();
          setScreen('auth');
        });
    }, 1000 * 60 * 10);

    return () => clearInterval(timer);
  }, [reset, session?.refreshToken]);

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
      if (nextStatus === 'OFFLINE') {
        setStatus('OFFLINE');
        goOffline();
        await updateDriverStatus(session.accessToken, session.driverId, nextStatus);
        driverRealtimeClient.emitDriverStatus(session.driverId, nextStatus);
        return;
      }

      if (nextStatus === 'ONLINE') {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.status !== 'granted') {
          console.warn('Location permission is required to go online');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setDriverPosition({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      }

      await updateDriverStatus(session.accessToken, session.driverId, nextStatus);
      driverRealtimeClient.emitDriverStatus(session.driverId, nextStatus);
      setStatus(nextStatus);
      goOnline();

      if (nextStatus === 'ONLINE') {
        const location = await Location.getCurrentPositionAsync({});
        await updateDriverLocation(
          session.accessToken,
          session.driverId,
          location.coords.latitude,
          location.coords.longitude,
        );
        setDriverPosition({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      }
    } catch (error) {
      console.warn(error);
      setStatus(status);
    }
  }

  async function handleAcceptOffer() {
    if (!offer || !session || isAcceptingOffer) {
      return;
    }

    const acceptedOffer = offer;

    setIsAcceptingOffer(true);
    try {
      await acceptOrder(session.accessToken, acceptedOffer.id, session.driverId);
      setStatus('BUSY');
      acceptOffer(acceptedOffer);
      setScreen('navigation');
    } catch (error) {
      console.warn(error);
      Alert.alert('Заказ уже принят другим водителем');
      declineOffer();
      setScreen('online');
    } finally {
      setIsAcceptingOffer(false);
    }
  }

  function handleDeclineOffer() {
    if (offer && session?.driverId) {
      driverRealtimeClient.rejectRideOffer(offer.id, session.driverId);
    }

    declineOffer();
    setStatus('ONLINE');
    setScreen('online');
  }

  async function handleCancelTrip() {
    if (!session || !trip) {
      return;
    }

    try {
      await cancelOrder(session.accessToken, trip.id);
      backOnline();
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
    reset();
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
          connectionLabel={isSocketConnected ? undefined : 'Нет соединения'}
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
          onDecline={handleDeclineOffer}
          isAccepting={isAcceptingOffer}
        />
      )}
      {screen === 'navigation' && trip && (
        <NavigationScreen
          onCancel={handleCancelTrip}
          onArrived={async () => {
            if (!session) return;
            await markArrived(session.accessToken, trip.id);
            markDriverArrivedState();
            setScreen('trip');
          }}
          trip={trip}
          driverPosition={driverPosition}
        />
      )}
      {screen === 'trip' && trip && (
        <TripScreen
          onComplete={async () => {
            if (!session) return;
            await completeTrip(session.accessToken, trip.id);
            setEarnedToday((value) => value + trip.price);
            completeRide();
            setStatus('ONLINE');
            setScreen('balance');
          }}
          onStart={async () => {
            if (!session) return;
            await startTrip(session.accessToken, trip.id);
            startRide();
          }}
          trip={trip}
          driverPosition={driverPosition}
        />
      )}
      {screen === 'balance' && (
        <BalanceScreen
          earnedToday={earnedToday}
          onBackOnline={() => {
            backOnline();
            setScreen('online');
          }}
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
