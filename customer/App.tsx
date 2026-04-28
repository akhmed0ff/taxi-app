import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthScreen } from './src/screens/AuthScreen';
import { CompletionScreen } from './src/screens/CompletionScreen';
import { HomeMapScreen } from './src/screens/HomeMapScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SearchDriverScreen } from './src/screens/SearchDriverScreen';
import { TariffScreen } from './src/screens/TariffScreen';
import { TripScreen } from './src/screens/TripScreen';
import {
  cancelOrder,
  createOrder,
  CustomerSession,
  loginPassenger,
  logoutPassenger,
  refreshPassengerSession,
} from './src/services/api';
import { realtimeClient } from './src/services/realtime';
import { Order, Point, TariffClass } from './src/types/order';

type Screen = 'auth' | 'home' | 'tariff' | 'search' | 'trip' | 'complete' | 'history';

export default function App() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [session, setSession] = useState<CustomerSession>();
  const [pickup, setPickup] = useState<Point>();
  const [dropoff, setDropoff] = useState<Point>();
  const [order, setOrder] = useState<Order>();

  const canSelectTariff = useMemo(() => pickup && dropoff, [dropoff, pickup]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    realtimeClient.connect(session.accessToken);
    return () => realtimeClient.disconnect();
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.refreshToken) {
      return;
    }

    const timer = setInterval(() => {
      void refreshPassengerSession(session.refreshToken)
        .then(setSession)
        .catch((error) => {
          console.warn(error);
          setSession(undefined);
          setScreen('auth');
        });
    }, 1000 * 60 * 10);

    return () => clearInterval(timer);
  }, [session?.refreshToken]);

  useEffect(() => {
    if (!order?.id) {
      return;
    }

    return realtimeClient.subscribeToOrder(order.id, order.tariff, (payload) => {
      setOrder((current) => {
        if (!current) {
          return current;
        }

        const nextOrder = { ...current, ...payload };

        if (nextOrder.status === 'DRIVER_ASSIGNED') {
          setScreen('trip');
        }

        if (nextOrder.status === 'COMPLETED') {
          setScreen('complete');
        }

        if (nextOrder.status === 'CANCELLED') {
          setScreen('home');
        }

        return nextOrder;
      });
    });
  }, [order?.id, order?.tariff]);

  async function handleTariffSelected(tariff: TariffClass, price: number) {
    if (!pickup || !dropoff || !session) {
      return;
    }

    try {
      const createdOrder = await createOrder({
        accessToken: session.accessToken,
        customerId: session.customerId,
        pickup,
        dropoff,
        tariff,
      });
      setOrder({ ...createdOrder, price: createdOrder.price || price });
      setScreen('search');
    } catch (error) {
      console.warn(error);
      setScreen('tariff');
    }
  }

  async function handleAuthenticated(phone: string) {
    const nextSession = await loginPassenger(phone);
    setSession(nextSession);
    setScreen('home');
  }

  async function handleCancelOrder() {
    if (!session || !order) {
      return;
    }

    try {
      await cancelOrder(session.accessToken, order.id);
      setOrder(undefined);
      setScreen('home');
    } catch (error) {
      console.warn(error);
    }
  }

  async function handleLogout() {
    if (session?.refreshToken) {
      try {
        await logoutPassenger(session.refreshToken);
      } catch (error) {
        console.warn(error);
      }
    }

    realtimeClient.disconnect();
    setSession(undefined);
    setOrder(undefined);
    setScreen('auth');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {screen === 'auth' && (
        <AuthScreen
          onAuthenticated={handleAuthenticated}
        />
      )}
      {screen === 'home' && (
        <HomeMapScreen
          onLogout={handleLogout}
          onOpenHistory={() => setScreen('history')}
          onRouteSelected={(nextPickup, nextDropoff) => {
            setPickup(nextPickup);
            setDropoff(nextDropoff);
            setScreen('tariff');
          }}
        />
      )}
      {screen === 'history' && session && (
        <HistoryScreen
          accessToken={session.accessToken}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'tariff' && canSelectTariff && (
        <TariffScreen onTariffSelected={handleTariffSelected} />
      )}
      {screen === 'search' && order && (
        <SearchDriverScreen onCancel={handleCancelOrder} order={order} />
      )}
      {screen === 'trip' && order && (
        <TripScreen
          onCancel={handleCancelOrder}
          order={order}
        />
      )}
      {screen === 'complete' && order && (
        <CompletionScreen
          onRestart={() => {
            setOrder(undefined);
            setScreen('home');
          }}
          order={order}
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
