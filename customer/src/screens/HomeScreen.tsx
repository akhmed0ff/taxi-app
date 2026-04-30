import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Easing,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import {
  AppButton,
  BottomSheetPanel,
  GlassCard,
  IconButton,
  QuickPlaceButton,
  TariffCard,
} from '../components/ui';
import { t } from '../i18n';
import { usePassengerRideState } from '../state/passengerRideState';
import { Order, Point, TariffClass } from '../types/order';

interface HomeScreenProps {
  order?: Order;
  onCancelOrder: () => Promise<void>;
  onOrderRequested: (pickup: Point, dropoff: Point, tariff: TariffClass) => Promise<Order>;
  onOpenHistory: () => void;
  onLogout: () => void;
}

const ANGREN_CENTER = {
  latitude: 41.0167,
  longitude: 70.1436,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

const TASHKENT_FALLBACK = {
  lat: 41.2995,
  lng: 69.2401,
  address: 'Ташкент',
};

const tariffs = [
  {
    eta: '3 мин',
    icon: 'car-outline',
    id: 'standard',
    price: '3 800 сум',
    tariffClass: 'STANDARD',
    title: 'Стандарт',
  },
  {
    eta: '5 мин',
    icon: 'car-sport-outline',
    id: 'comfort',
    price: '5 000 сум',
    tariffClass: 'COMFORT',
    title: 'Комфорт',
  },
  {
    eta: '7 мин',
    icon: 'car-sport-outline',
    id: 'comfort-plus',
    price: '6 500 сум',
    tariffClass: 'COMFORT_PLUS',
    title: 'Комфорт+',
  },
  {
    eta: '10 мин',
    icon: 'cube-outline',
    id: 'delivery',
    price: '8 800 сум',
    tariffClass: 'DELIVERY',
    title: 'Доставка',
  },
] as const satisfies ReadonlyArray<{
  eta: string;
  icon: keyof typeof Ionicons.glyphMap;
  id: string;
  price: string;
  tariffClass: TariffClass;
  title: string;
}>;

const mockDriver = {
  driverName: 'Алишер',
  rating: 4.9,
  car: 'Chevrolet Cobalt',
  plate: '01 A 777 AA',
  eta: '3 мин',
};

export function HomeScreen({
  onCancelOrder,
  onOrderRequested,
  onOpenHistory,
  order,
}: HomeScreenProps) {
  const [pickupAddress, setPickupAddress] = useState<string>(t('currentLocation'));
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const {
    markDriverAssigned,
    markOrderCreated,
    markRideCompleted,
    markRideStarted,
    resetRide,
    selectTariff,
    state: rideState,
  } = usePassengerRideState();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [currentPoint, setCurrentPoint] = useState<Point>({
    ...TASHKENT_FALLBACK,
  });

  const mapRegion = useMemo(
    () => ({
      latitude: currentPoint.lat,
      longitude: currentPoint.lng,
      latitudeDelta: ANGREN_CENTER.latitudeDelta,
      longitudeDelta: ANGREN_CENTER.longitudeDelta,
    }),
    [currentPoint.lat, currentPoint.lng],
  );

  const dropoffPoint: Point = {
    lat: currentPoint.lat + 0.035,
    lng: currentPoint.lng + 0.035,
    address: dropoffAddress,
  };
  const hasDestination = dropoffAddress.trim().length > 0;

  const selectedTariffDetails =
    tariffs.find((tariff) => tariff.tariffClass === rideState.selectedTariff) ??
    tariffs[0];
  const isSearchingDriver = rideState.status === 'SEARCHING';
  const isDriverFound = rideState.status === 'DRIVER_FOUND';
  const isRideStarted = rideState.status === 'RIDING';
  const isRideCompleted = rideState.status === 'COMPLETED';
  const driver = rideState.driver ?? order?.driver;
  const orderId = rideState.orderId;
  const driverEta = driver?.eta ?? (driver?.etaMinutes ? `${driver.etaMinutes} мин` : mockDriver.eta);

  const pulseStyle = {
    opacity: pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.42, 0],
    }),
    transform: [
      {
        scale: pulseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 2.35],
        }),
      },
    ],
  };

  useEffect(() => {
    void updateCurrentLocation();
  }, []);

  useEffect(() => {
    if (!isSearchingDriver) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );

    animation.start();
    return () => animation.stop();
  }, [isSearchingDriver, pulseAnim]);

  useEffect(() => {
    if (order?.status === 'DRIVER_ASSIGNED' || order?.status === 'DRIVER_ARRIVED') {
      markDriverAssigned(order);
      return;
    }

    if (order?.status === 'IN_PROGRESS') {
      markRideStarted();
      return;
    }

    if (order?.status === 'COMPLETED') {
      markRideCompleted();
      return;
    }

    if (!order && rideState.status !== 'IDLE') {
      resetRide();
    }
  }, [
    markDriverAssigned,
    markRideCompleted,
    markRideStarted,
    order,
    resetRide,
    rideState.status,
  ]);

  async function handleOrder() {
    if (!dropoffAddress || isCreatingOrder || orderId) {
      return;
    }

    setIsCreatingOrder(true);
    try {
      const createdOrder = await onOrderRequested(
        { ...currentPoint, address: pickupAddress },
        dropoffPoint,
        selectedTariffDetails.tariffClass,
      );
      markOrderCreated(createdOrder.id, selectedTariffDetails.tariffClass);
    } catch (error) {
      console.warn(error);
      Alert.alert('Ошибка создания заказа');
      resetRide();
    } finally {
      setIsCreatingOrder(false);
    }
  }

  async function updateCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setCurrentPoint(TASHKENT_FALLBACK);
        setPickupAddress(TASHKENT_FALLBACK.address);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const nextPoint = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        address: t('currentLocation'),
      };

      setCurrentPoint(nextPoint);
      setPickupAddress(nextPoint.address);
    } catch (error) {
      console.warn(error);
      setCurrentPoint(TASHKENT_FALLBACK);
      setPickupAddress(TASHKENT_FALLBACK.address);
    }
  }

  function handleMapRegionChangeComplete(region: Region) {
    setCurrentPoint((point) => ({
      ...point,
      lat: region.latitude,
      lng: region.longitude,
      address: pickupAddress,
    }));
  }

  function handleCancelRideState() {
    Alert.alert('Отменить поездку?', undefined, [
      {
        text: 'Нет',
        style: 'cancel',
      },
      {
        text: 'Отменить',
        style: 'destructive',
        onPress: () => {
          void cancelRide();
        },
      },
    ]);
  }

  async function cancelRide() {
    try {
      await onCancelOrder();
      resetRide();
    } catch (error) {
      console.warn(error);
      Alert.alert('Не удалось отменить заказ');
    }
  }

  function handleCallDriver() {
    void Linking.openURL(`tel:${driver?.phone ?? ''}`);
  }

  function handleMessageDriver() {
    Alert.alert('Сообщения скоро будут доступны');
  }

  return (
    <View style={styles.screen}>
      <MapView
        initialRegion={ANGREN_CENTER}
        onRegionChangeComplete={handleMapRegionChangeComplete}
        region={mapRegion}
        showsCompass={false}
        showsMyLocationButton={false}
        showsUserLocation
        style={StyleSheet.absoluteFill}
      >
        {hasDestination ? (
          <>
            <Polyline
              coordinates={[
                {
                  latitude: currentPoint.lat,
                  longitude: currentPoint.lng,
                },
                {
                  latitude: dropoffPoint.lat,
                  longitude: dropoffPoint.lng,
                },
              ]}
              strokeColor="#111111"
              strokeWidth={5}
            />
            <Marker
              coordinate={{
                latitude: dropoffPoint.lat,
                longitude: dropoffPoint.lng,
              }}
              title="Куда"
              description={dropoffAddress}
            />
          </>
        ) : null}
      </MapView>

      <View pointerEvents="none" style={styles.centerPinWrap}>
        <View style={styles.etaBubble}>
          <Text style={styles.etaTime}>{isDriverFound ? driverEta : selectedTariffDetails.eta}</Text>
          <Text style={styles.etaLabel}>Подача</Text>
        </View>
        {isSearchingDriver ? (
          <Animated.View style={[styles.pinPulse, pulseStyle]} />
        ) : null}
        <View style={styles.pin}>
          <Ionicons color="#111111" name="location-sharp" size={34} />
        </View>
      </View>

      {isDriverFound || isRideStarted ? (
        <View pointerEvents="none" style={styles.mockRoute}>
          <View style={styles.mockRouteLine} />
          <View style={styles.mockDriverMarker}>
            <Ionicons color="#111111" name="car-sport" size={18} />
          </View>
        </View>
      ) : null}

      <View style={styles.topLayer}>
        <View style={styles.topButtons}>
          <IconButton
            accessibilityLabel="Профиль"
            icon={<Ionicons color="#111111" name="person-outline" size={22} />}
            onPress={onOpenHistory}
          />
          <IconButton
            accessibilityLabel="Параметры"
            icon={<Ionicons color="#111111" name="options-outline" size={22} />}
          />
        </View>

        <GlassCard style={styles.addressCard}>
          <View style={styles.addressRow}>
            <View style={styles.routeDot} />
            <View style={styles.addressContent}>
              <Text style={styles.fieldLabel}>Откуда</Text>
              <TextInput
                onChangeText={setPickupAddress}
                placeholder="Текущее местоположение"
                placeholderTextColor="#98A2B3"
                style={styles.addressInput}
                value={pickupAddress}
              />
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.addressRow}>
            <View style={[styles.routeDot, styles.routeDotDestination]} />
            <View style={styles.addressContent}>
              <Text style={styles.fieldLabel}>Куда</Text>
              <TextInput
                onChangeText={setDropoffAddress}
                placeholder="Куда поедем?"
                placeholderTextColor="#98A2B3"
                style={styles.addressInput}
                value={dropoffAddress}
              />
            </View>
          </View>

          <View style={styles.quickPlaces}>
            <QuickPlaceButton
              icon={<Ionicons color="#111111" name="home-outline" size={16} />}
              label="Дом"
            />
            <QuickPlaceButton
              icon={<Ionicons color="#111111" name="briefcase-outline" size={16} />}
              label="Работа"
            />
            <QuickPlaceButton
              icon={<Ionicons color="#111111" name="star-outline" size={16} />}
              label="Избранное"
            />
          </View>
        </GlassCard>
      </View>

      <View style={styles.mapActions}>
        <IconButton
          accessibilityLabel="Безопасность"
          icon={<Ionicons color="#111111" name="shield-checkmark-outline" size={23} />}
          variant="yellow"
        />
        <IconButton
          accessibilityLabel="Моя геолокация"
          icon={<MaterialCommunityIcons color="#111111" name="crosshairs-gps" size={24} />}
          onPress={updateCurrentLocation}
        />
      </View>

      <BottomSheetPanel style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>Выберите тариф</Text>
            <Text style={styles.sheetSubtitle}>Ближайшие машины рядом</Text>
          </View>
          <Text style={styles.sheetBadge}>#FFD400</Text>
        </View>

        {isRideStarted || isRideCompleted ? (
          <GlassCard style={styles.searchCard}>
            <View style={styles.searchHeader}>
              <View style={styles.searchIcon}>
                <Ionicons
                  color="#111111"
                  name={isRideCompleted ? 'checkmark-done-outline' : 'navigate-outline'}
                  size={24}
                />
              </View>
              <View style={styles.searchText}>
                <Text style={styles.searchTitle}>
                  {isRideCompleted ? 'Поездка завершена' : 'Поездка началась'}
                </Text>
                <Text style={styles.searchSubtitle}>
                  {orderId ? `Заказ #${orderId.slice(0, 8)}` : selectedTariffDetails.title}
                </Text>
              </View>
            </View>
          </GlassCard>
        ) : isDriverFound ? (
          <GlassCard style={styles.driverCard}>
            <View style={styles.driverTopRow}>
              <View style={styles.driverAvatar}>
                <Ionicons color="#111111" name="person" size={26} />
              </View>
              <View style={styles.driverInfo}>
                <View style={styles.driverNameRow}>
                <Text style={styles.driverName}>{driver?.name ?? mockDriver.driverName}</Text>
                  <View style={styles.ratingBadge}>
                    <Ionicons color="#111111" name="star" size={13} />
                    <Text style={styles.ratingText}>{driver?.rating ?? mockDriver.rating}</Text>
                  </View>
                </View>
                <Text style={styles.driverMeta}>{driver?.car ?? mockDriver.car}</Text>
                <Text style={styles.driverPlate}>{driver?.plate ?? mockDriver.plate}</Text>
              </View>
              <View style={styles.driverEta}>
                <Text style={styles.driverEtaValue}>{driverEta}</Text>
                <Text style={styles.driverEtaLabel}>Подача</Text>
              </View>
            </View>

            <View style={styles.driverActions}>
              <AppButton
                icon={<Ionicons color="#111111" name="call-outline" size={18} />}
                onPress={handleCallDriver}
                size="md"
                style={styles.driverActionButton}
                title="Позвонить"
                variant="yellow"
              />
              <AppButton
                icon={<Ionicons color="#111111" name="chatbubble-outline" size={18} />}
                onPress={handleMessageDriver}
                size="md"
                style={styles.driverActionButton}
                title="Написать"
                variant="outline"
              />
            </View>
          </GlassCard>
        ) : isSearchingDriver ? (
          <GlassCard style={styles.searchCard}>
            <View style={styles.searchHeader}>
              <View style={styles.searchIcon}>
                <Ionicons color="#111111" name="radio-outline" size={24} />
              </View>
              <View style={styles.searchText}>
                <Text style={styles.searchTitle}>Ищем ближайшего водителя</Text>
                <Text style={styles.searchSubtitle}>
                  {selectedTariffDetails.title} · {selectedTariffDetails.eta} · {selectedTariffDetails.price}
                </Text>
                {orderId ? (
                  <Text style={styles.orderIdText}>Заказ #{orderId.slice(0, 8)}</Text>
                ) : null}
              </View>
            </View>
          </GlassCard>
        ) : (
          <ScrollView
            contentContainerStyle={styles.tariffList}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {tariffs.map((tariff) => (
              <TariffCard
                description={tariff.eta}
                icon={<Ionicons color="#111111" name={tariff.icon} size={26} />}
                key={tariff.id}
                price={tariff.price}
                onPress={() => selectTariff(tariff.tariffClass)}
                selected={rideState.selectedTariff === tariff.tariffClass}
                style={styles.tariffCard}
                title={tariff.title}
              />
            ))}
          </ScrollView>
        )}

        {!isDriverFound && !isRideStarted && !isRideCompleted ? (
          <AppButton
            disabled={!dropoffAddress || isCreatingOrder || isSearchingDriver || Boolean(orderId)}
            loading={isCreatingOrder}
            onPress={handleOrder}
            style={styles.orderButton}
            title={isSearchingDriver || isCreatingOrder ? 'Ищем водителя...' : 'Заказать'}
          />
        ) : null}
        {isSearchingDriver || isDriverFound ? (
          <AppButton
            onPress={handleCancelRideState}
            size="md"
            style={styles.cancelButton}
            title="Отменить"
            variant="outline"
          />
        ) : null}
      </BottomSheetPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  topLayer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addressCard: {
    padding: 16,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addressContent: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  addressInput: {
    minHeight: 34,
    padding: 0,
    color: '#111111',
    fontSize: 18,
    fontWeight: '800',
  },
  routeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 4,
    borderColor: '#FFD400',
    backgroundColor: '#111111',
  },
  routeDotDestination: {
    borderColor: '#111111',
    backgroundColor: '#FFD400',
  },
  routeLine: {
    width: 1,
    height: 16,
    marginLeft: 6.5,
    backgroundColor: 'rgba(17,17,17,0.16)',
  },
  quickPlaces: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  centerPinWrap: {
    position: 'absolute',
    top: '42%',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -52 }],
    zIndex: 1,
  },
  etaBubble: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.86)',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  etaTime: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '900',
  },
  etaLabel: {
    marginTop: 1,
    color: '#667085',
    fontSize: 12,
    fontWeight: '800',
  },
  pin: {
    marginTop: 8,
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    backgroundColor: '#FFD400',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  pinPulse: {
    position: 'absolute',
    bottom: 0,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFD400',
  },
  mockRoute: {
    position: 'absolute',
    top: '41%',
    left: '30%',
    width: 170,
    height: 92,
    zIndex: 0,
  },
  mockRouteLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#111111',
    opacity: 0.72,
    transform: [{ rotate: '-22deg' }],
  },
  mockDriverMarker: {
    position: 'absolute',
    left: 6,
    bottom: 8,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    borderRadius: 19,
    backgroundColor: '#FFD400',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  mapActions: {
    position: 'absolute',
    right: 16,
    bottom: 316,
    gap: 12,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  sheetTitle: {
    color: '#111111',
    fontSize: 22,
    fontWeight: '900',
  },
  sheetSubtitle: {
    marginTop: 3,
    color: '#667085',
    fontSize: 14,
    fontWeight: '700',
  },
  sheetBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFD400',
    color: '#111111',
    fontSize: 12,
    fontWeight: '900',
  },
  tariffList: {
    paddingRight: 20,
    gap: 10,
    marginTop: 16,
  },
  tariffCard: {
    width: 218,
  },
  searchCard: {
    marginTop: 16,
    padding: 16,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  searchIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#FFD400',
  },
  searchText: {
    flex: 1,
    minWidth: 0,
  },
  searchTitle: {
    color: '#111111',
    fontSize: 17,
    fontWeight: '900',
  },
  searchSubtitle: {
    marginTop: 5,
    color: '#667085',
    fontSize: 13,
    fontWeight: '800',
  },
  orderIdText: {
    marginTop: 5,
    color: '#98A2B3',
    fontSize: 12,
    fontWeight: '800',
  },
  driverCard: {
    marginTop: 16,
    padding: 16,
  },
  driverTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#FFD400',
  },
  driverInfo: {
    flex: 1,
    minWidth: 0,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverName: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '900',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,212,0,0.42)',
  },
  ratingText: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '900',
  },
  driverMeta: {
    marginTop: 5,
    color: '#667085',
    fontSize: 14,
    fontWeight: '800',
  },
  driverPlate: {
    marginTop: 5,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: '#ffffff',
    color: '#111111',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  driverEta: {
    alignItems: 'flex-end',
  },
  driverEtaValue: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '900',
  },
  driverEtaLabel: {
    marginTop: 2,
    color: '#667085',
    fontSize: 12,
    fontWeight: '800',
  },
  driverActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  driverActionButton: {
    flex: 1,
    shadowOpacity: 0.08,
  },
  orderButton: {
    marginTop: 16,
  },
  cancelButton: {
    marginTop: 10,
    shadowOpacity: 0.04,
  },
});
