import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthScreen } from './src/screens/AuthScreen';
import { CompletionScreen } from './src/screens/CompletionScreen';
import { HomeMapScreen } from './src/screens/HomeMapScreen';
import { SearchDriverScreen } from './src/screens/SearchDriverScreen';
import { TariffScreen } from './src/screens/TariffScreen';
import { TripScreen } from './src/screens/TripScreen';
import { createOrder } from './src/services/api';
import { realtimeClient } from './src/services/realtime';
import { Order, Point, TariffClass } from './src/types/order';

type Screen = 'auth' | 'home' | 'tariff' | 'search' | 'trip' | 'complete';

export default function App() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [passengerId, setPassengerId] = useState('');
  const [pickup, setPickup] = useState<Point>();
  const [dropoff, setDropoff] = useState<Point>();
  const [order, setOrder] = useState<Order>();

  const canSelectTariff = useMemo(() => pickup && dropoff, [dropoff, pickup]);

  useEffect(() => {
    if (!passengerId) {
      return;
    }

    realtimeClient.connect(passengerId);
    return () => realtimeClient.disconnect();
  }, [passengerId]);

  useEffect(() => {
    if (!order?.id) {
      return;
    }

    return realtimeClient.subscribeToOrder(order.id, (payload) => {
      setOrder((current) => (current ? { ...current, ...payload } : current));
    });
  }, [order?.id]);

  async function handleTariffSelected(tariff: TariffClass, price: number) {
    if (!pickup || !dropoff) {
      return;
    }

    const fallbackOrder: Order = {
      id: `order-${Date.now()}`,
      status: 'SEARCHING_DRIVER',
      pickup,
      dropoff,
      tariff,
      price,
    };

    setOrder(fallbackOrder);
    setScreen('search');

    try {
      const createdOrder = await createOrder({
        passengerId,
        pickup,
        dropoff,
        tariff,
      });
      setOrder({ ...fallbackOrder, ...createdOrder, price });
    } catch {
      setOrder(fallbackOrder);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {screen === 'auth' && (
        <AuthScreen
          onAuthenticated={(id) => {
            setPassengerId(id);
            setScreen('home');
          }}
        />
      )}
      {screen === 'home' && (
        <HomeMapScreen
          onRouteSelected={(nextPickup, nextDropoff) => {
            setPickup(nextPickup);
            setDropoff(nextDropoff);
            setScreen('tariff');
          }}
        />
      )}
      {screen === 'tariff' && canSelectTariff && (
        <TariffScreen onTariffSelected={handleTariffSelected} />
      )}
      {screen === 'search' && order && (
        <SearchDriverScreen
          onDriverFound={(nextOrder) => {
            setOrder(nextOrder);
            setScreen('trip');
          }}
          order={order}
        />
      )}
      {screen === 'trip' && order && (
        <TripScreen
          onCompleted={() => {
            setOrder({ ...order, status: 'COMPLETED' });
            setScreen('complete');
          }}
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
