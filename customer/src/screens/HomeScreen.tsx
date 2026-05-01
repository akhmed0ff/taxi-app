import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PassengerMapboxMap } from '../components/map';
import {
  AppButton,
  BottomSheetPanel,
  GlassCard,
  IconButton,
  QuickPlaceButton,
  TariffCard,
} from '../components/ui';
import {
  isNetworkError,
  reverseGeocodePickup,
  type DestinationSearchResult,
  type RouteResponse,
} from '../services/api';
import { usePassengerRideState } from '../state/passengerRideState';
import { Order, Point, TariffClass } from '../types/order';
import { DestinationSearchScreen } from './DestinationSearchScreen';

interface HomeScreenProps {
  order?: Order;
  onCancelOrder: () => Promise<void>;
  onOrderRequested: (pickup: Point, dropoff: Point, tariff: TariffClass) => Promise<Order>;
  onOpenHistory: () => void;
  onLogout: () => void;
}

const ANGREN_FALLBACK: Point = {
  lat: 41.0167,
  lng: 70.1436,
  address: 'Angren',
};

const quickPlaces: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  id: 'home' | 'work' | 'saved';
  label: string;
  point: Point;
}> = [
  {
    icon: 'home-outline',
    id: 'home',
    label: 'Р вЂќР С•Р С',
    point: {
      lat: 41.0224,
      lng: 70.1542,
      address: 'Р С’Р Р…Р С–РЎР‚Р ВµР Р…, 5-Р в„– Р СР С‘Р С”РЎР‚Р С•РЎР‚Р В°Р в„–Р С•Р Р…, Р Т‘Р С•Р С',
    },
  },
  {
    icon: 'briefcase-outline',
    id: 'work',
    label: 'Р В Р В°Р В±Р С•РЎвЂљР В°',
    point: {
      lat: 41.0289,
      lng: 70.1684,
      address: 'Р С’Р Р…Р С–РЎР‚Р ВµР Р…, Р С—РЎР‚Р С•Р СР В·Р С•Р Р…Р В°, РЎР‚Р В°Р В±Р С•РЎвЂљР В°',
    },
  },
  {
    icon: 'star-outline',
    id: 'saved',
    label: 'Р ВР В·Р В±РЎР‚Р В°Р Р…Р Р…Р С•Р Вµ',
    point: {
      lat: 41.0135,
      lng: 70.1328,
      address: 'Р С’Р Р…Р С–РЎР‚Р ВµР Р…, Р В»РЎР‹Р В±Р С‘Р СР С•Р Вµ Р СР ВµРЎРѓРЎвЂљР С•',
    },
  },
];

const tariffs = [
  {
    eta: '3 min',
    icon: 'car-outline',
    id: 'standard',
    price: '3 800 sum',
    tariffClass: 'STANDARD',
    title: 'Standard',
  },
  {
    eta: '5 min',
    icon: 'car-sport-outline',
    id: 'comfort',
    price: '5 000 sum',
    tariffClass: 'COMFORT',
    title: 'Comfort',
  },
  {
    eta: '7 min',
    icon: 'car-sport-outline',
    id: 'comfort-plus',
    price: '6 500 sum',
    tariffClass: 'COMFORT_PLUS',
    title: 'Comfort+',
  },
  {
    eta: '10 min',
    icon: 'cube-outline',
    id: 'delivery',
    price: '8 800 sum',
    tariffClass: 'DELIVERY',
    title: 'Delivery',
  },
] as const satisfies ReadonlyArray<{
  eta: string;
  icon: keyof typeof Ionicons.glyphMap;
  id: string;
  price: string;
  tariffClass: TariffClass;
  title: string;
}>;

const tariffPricing: Record<
  TariffClass,
  { baseFare: number; minimumFare: number; perKm: number }
> = {
  STANDARD: {
    baseFare: 3800,
    minimumFare: 3800,
    perKm: 2000,
  },
  COMFORT: {
    baseFare: 10000,
    minimumFare: 16000,
    perKm: 2500,
  },
  COMFORT_PLUS: {
    baseFare: 6500,
    minimumFare: 6500,
    perKm: 3500,
  },
  DELIVERY: {
    baseFare: 8800,
    minimumFare: 8800,
    perKm: 3500,
  },
};

const mockDriver = {
  car: 'Chevrolet Cobalt',
  driverName: 'Alisher',
  eta: '3 min',
  plate: '01 A 777 AA',
  rating: 4.9,
};

function calculateTariffFare(tariffClass: TariffClass, distanceMeters: number) {
  const pricing = tariffPricing[tariffClass];
  const distanceKm = distanceMeters / 1000;
  const rawFare = pricing.baseFare + Math.round(distanceKm * pricing.perKm);

  return Math.max(rawFare, pricing.minimumFare);
}

function formatUzs(value: number) {
  return `${Math.round(value).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} РЎРѓРЎС“Р С`;
}

function formatDistance(distanceMeters: number) {
  return `${(distanceMeters / 1000).toFixed(1).replace('.', ',')} Р С”Р С`;
}

function formatDuration(durationSeconds: number) {
  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));

  if (totalMinutes < 60) {
    return `${totalMinutes} Р СР С‘Р Р…`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} РЎвЂЎ ${minutes} Р СР С‘Р Р…` : `${hours} РЎвЂЎ`;
}

export function HomeScreen({
  onCancelOrder,
  onOpenHistory,
  onOrderRequested,
  order,
}: HomeScreenProps) {
  const [pickupAddress, setPickupAddress] = useState('Р С›Р С—РЎР‚Р ВµР Т‘Р ВµР В»РЎРЏР ВµР С Р В°Р Т‘РЎР‚Р ВµРЎРѓ...');
  const [isPickupAddressLoading, setIsPickupAddressLoading] = useState(true);
  const [destination, setDestination] = useState<Point>();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isDestinationSearchOpen, setIsDestinationSearchOpen] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [routeErrorMessage, setRouteErrorMessage] = useState<string>();
  const [route, setRoute] = useState<RouteResponse | null>(null);
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
  const [currentPoint, setCurrentPoint] = useState<Point>(ANGREN_FALLBACK);

  const selectedTariffDetails =
    tariffs.find((tariff) => tariff.tariffClass === rideState.selectedTariff) ??
    tariffs[0];
  const isSearchingDriver = rideState.status === 'SEARCHING';
  const isDriverFound = rideState.status === 'DRIVER_FOUND';
  const isRideStarted = rideState.status === 'RIDING';
  const isRideCompleted = rideState.status === 'COMPLETED';
  const driver = rideState.driver ?? order?.driver;
  const orderId = rideState.orderId;
  const destinationAddress = destination?.address ?? '';
  const hasDestination = Boolean(destinationAddress);
  const hasPickup = Boolean(pickupAddress.trim()) && !isPickupAddressLoading;
  const routeReady = Boolean(route?.distance && route?.duration);
  const routeSummary = routeErrorMessage
    ? routeErrorMessage
    : routeReady && route
      ? `${formatDistance(route.distance)} | ${formatDuration(route.duration)}`
      : isRouteLoading
        ? 'Считаем маршрут...'
        : 'Nearby drivers around Angren';
  const canCreateOrder =
    hasPickup && hasDestination && !isCreatingOrder && !isSearchingDriver && !orderId;
  const driverEta =
    driver?.eta ?? (driver?.etaMinutes ? `${driver.etaMinutes} min` : mockDriver.eta);

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
    let isActive = true;

    setIsPickupAddressLoading(true);
    setPickupAddress('Р С›Р С—РЎР‚Р ВµР Т‘Р ВµР В»РЎРЏР ВµР С Р В°Р Т‘РЎР‚Р ВµРЎРѓ...');

    const timer = setTimeout(() => {
      void reverseGeocodePickup({
        lat: currentPoint.lat,
        lng: currentPoint.lng,
      })
        .then((result) => {
          if (!isActive) {
            return;
          }

          const nextAddress = result.fullAddress.trim() || 'Р С’Р Т‘РЎР‚Р ВµРЎРѓ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…';
          setPickupAddress(nextAddress);
          setCurrentPoint((point) => ({
            ...point,
            address: nextAddress,
          }));
        })
        .catch((error) => {
          if (!isActive) {
            return;
          }

          console.warn(error);
          const fallbackAddress = isNetworkError(error)
            ? 'Р СњР ВµРЎвЂљ Р С‘Р Р…РЎвЂљР ВµРЎР‚Р Р…Р ВµРЎвЂљР В°. Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С•Р С—РЎР‚Р ВµР Т‘Р ВµР В»Р С‘РЎвЂљРЎРЉ Р В°Р Т‘РЎР‚Р ВµРЎРѓ.'
            : currentPoint.address?.trim() || 'Р С’Р Т‘РЎР‚Р ВµРЎРѓ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…';
          setPickupAddress(fallbackAddress);
        })
        .finally(() => {
          if (isActive) {
            setIsPickupAddressLoading(false);
          }
        });
    }, 850);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [currentPoint.lat, currentPoint.lng]);

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
    if (!destination || isCreatingOrder || orderId) {
      return;
    }

    setIsCreatingOrder(true);
    try {
      const createdOrder = await onOrderRequested(
        { ...currentPoint, address: pickupAddress },
        destination,
        selectedTariffDetails.tariffClass,
      );
      markOrderCreated(createdOrder.id, selectedTariffDetails.tariffClass);
    } catch (error) {
      console.warn(error);
      Alert.alert('Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ РЎРѓР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В·Р В°Р С”Р В°Р В·');
      resetRide();
    } finally {
      setIsCreatingOrder(false);
    }
  }

  function handleOrderPress() {
    if (isPickupAddressLoading) {
      Alert.alert('Подождите, определяем адрес');
      return;
    }

    if (!hasDestination) {
      setIsDestinationSearchOpen(true);
      return;
    }


    void handleOrder();
  }

  async function updateCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setCurrentPoint(ANGREN_FALLBACK);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const nextPoint = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        address: ANGREN_FALLBACK.address,
      };

      setCurrentPoint(nextPoint);
    } catch (error) {
      console.warn(error);
      setCurrentPoint(ANGREN_FALLBACK);
    }
  }

  function handlePickupChange({ pickupLat, pickupLng }: { pickupLat: number; pickupLng: number }) {
    setCurrentPoint((point) => ({
      ...point,
      lat: pickupLat,
      lng: pickupLng,
      address: pickupAddress,
    }));
  }

  function handleDestinationSelected(result: DestinationSearchResult) {
    setDestination({
      lat: result.lat,
      lng: result.lng,
      address: result.fullAddress,
    });
    setIsDestinationSearchOpen(false);
  }

  function handleQuickPlaceSelect(point: Point) {
    setDestination(point);
    setIsDestinationSearchOpen(false);
  }

  function getTariffPrice(tariff: (typeof tariffs)[number]) {
    if (!hasDestination) {
      return `РѕС‚ ${formatUzs(tariffPricing[tariff.tariffClass].minimumFare)}`;
    }

    if (isRouteLoading) {
      return 'СѓС‚РѕС‡РЅСЏРµС‚СЃСЏ';
    }

    if (!route?.distance) {
      return 'СѓС‚РѕС‡РЅСЏРµС‚СЃСЏ';
    }

    return formatUzs(calculateTariffFare(tariff.tariffClass, route.distance));
  }

  function handleCancelRideState() {
    Alert.alert('Cancel ride?', undefined, [
      {
        text: 'No',
        style: 'cancel',
      },
      {
        text: 'Cancel',
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
      Alert.alert('Could not cancel the order');
    }
  }

  function handleCallDriver() {
    void Linking.openURL(`tel:${driver?.phone ?? ''}`);
  }

  function handleMessageDriver() {
    Alert.alert('Messages will be available soon');
  }

  return (
    <View style={styles.screen}>
      <PassengerMapboxMap
        destinationLat={destination?.lat}
        destinationLng={destination?.lng}
        initialPickupLat={currentPoint.lat}
        initialPickupLng={currentPoint.lng}
        onPickupChange={handlePickupChange}
        onRouteChange={setRoute}
        onRouteErrorChange={setRouteErrorMessage}
        onRouteLoadingChange={setIsRouteLoading}
        showDestinationMarker={hasDestination}
        showLocationButton={false}
        showPickupPin={false}
      />

      <View pointerEvents="none" style={styles.centerPinWrap}>
        <View style={styles.etaBubble}>
          <Text style={styles.etaTime}>{isDriverFound ? driverEta : selectedTariffDetails.eta}</Text>
          <Text style={styles.etaLabel}>Pickup</Text>
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
            accessibilityLabel="History"
            icon={<Ionicons color="#111111" name="person-outline" size={22} />}
            onPress={onOpenHistory}
          />
          <IconButton
            accessibilityLabel="Options"
            icon={<Ionicons color="#111111" name="options-outline" size={22} />}
          />
        </View>

        <GlassCard style={styles.addressCard}>
          <View style={styles.addressRow}>
            <View style={styles.routeDot} />
            <View style={styles.addressContent}>
              <Text style={styles.fieldLabel}>From</Text>
              <TextInput
                editable={false}
                placeholder="Current location"
                placeholderTextColor="#98A2B3"
                style={styles.addressInput}
                value={isPickupAddressLoading ? 'Р С›Р С—РЎР‚Р ВµР Т‘Р ВµР В»РЎРЏР ВµР С Р В°Р Т‘РЎР‚Р ВµРЎРѓ...' : pickupAddress}
              />
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.addressRow}>
            <View style={[styles.routeDot, styles.routeDotDestination]} />
            <View style={styles.addressContent}>
              <Text style={styles.fieldLabel}>To</Text>
              <Pressable
                onPress={() => setIsDestinationSearchOpen(true)}
                style={styles.destinationFieldButton}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.addressInput,
                    !destinationAddress && styles.addressPlaceholder,
                  ]}
                >
                  {destinationAddress || 'Р С™РЎС“Р Т‘Р В° Р С—Р С•Р ВµР Т‘Р ВµР С?'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.quickPlaces}>
            {quickPlaces.map((place) => (
              <QuickPlaceButton
                icon={<Ionicons color="#111111" name={place.icon} size={16} />}
                key={place.id}
                label={place.label}
                onPress={() => handleQuickPlaceSelect(place.point)}
                style={
                  destination?.address === place.point.address
                    ? styles.quickPlaceSelected
                    : undefined
                }
              />
            ))}
          </View>
        </GlassCard>
      </View>

      <View style={styles.mapActions}>
        <IconButton
          accessibilityLabel="Safety"
          icon={<Ionicons color="#111111" name="shield-checkmark-outline" size={23} />}
          variant="yellow"
        />
        <IconButton
          accessibilityLabel="My location"
          icon={<MaterialCommunityIcons color="#111111" name="crosshairs-gps" size={24} />}
          onPress={updateCurrentLocation}
        />
      </View>

      <BottomSheetPanel style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>Choose a tariff</Text>
            <Text style={styles.sheetSubtitle}>{hasDestination ? routeSummary : 'Nearby drivers around Angren'}</Text>
          </View>
          <Text style={styles.sheetBadge}>ANGREN</Text>
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
                  {isRideCompleted ? 'Trip completed' : 'Trip started'}
                </Text>
                <Text style={styles.searchSubtitle}>
                  {orderId ? `Order #${orderId.slice(0, 8)}` : selectedTariffDetails.title}
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
                <Text style={styles.driverEtaLabel}>Pickup</Text>
              </View>
            </View>

            <View style={styles.driverActions}>
              <AppButton
                icon={<Ionicons color="#111111" name="call-outline" size={18} />}
                onPress={handleCallDriver}
                size="md"
                style={styles.driverActionButton}
                title="Call"
                variant="yellow"
              />
              <AppButton
                icon={<Ionicons color="#111111" name="chatbubble-outline" size={18} />}
                onPress={handleMessageDriver}
                size="md"
                style={styles.driverActionButton}
                title="Message"
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
                <Text style={styles.searchTitle}>Searching for a nearby driver</Text>
                <Text style={styles.searchSubtitle}>
                  {selectedTariffDetails.title} | {selectedTariffDetails.eta} | {getTariffPrice(selectedTariffDetails)}
                </Text>
                {orderId ? <Text style={styles.orderIdText}>Order #{orderId.slice(0, 8)}</Text> : null}
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
                price={getTariffPrice(tariff)}
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
            disabled={isCreatingOrder || isSearchingDriver || Boolean(orderId)}
            loading={isCreatingOrder}
            onPress={handleOrderPress}
            style={[styles.orderButton, !canCreateOrder && styles.orderButtonDisabled]}
            title={
              isSearchingDriver || isCreatingOrder
                ? 'Searching...'
                  : !hasPickup
                  ? 'Подождите, определяем адрес'
                  : !hasDestination
                    ? 'Куда поедем?'
                    : isRouteLoading
                      ? 'Считаем маршрут...'
                      : routeErrorMessage
                        ? 'Цена уточняется'
                        : !routeReady
                          ? 'Считаем маршрут...'
                      : 'Order'
            }
          />
        ) : null}
        {isSearchingDriver || isDriverFound ? (
          <AppButton
            onPress={handleCancelRideState}
            size="md"
            style={styles.cancelButton}
            title="Cancel"
            variant="outline"
          />
        ) : null}
      </BottomSheetPanel>

      {isDestinationSearchOpen ? (
        <View style={styles.searchOverlay}>
          <DestinationSearchScreen
            initialQuery={destinationAddress}
            onBack={() => setIsDestinationSearchOpen(false)}
            onSelect={handleDestinationSelected}
          />
        </View>
      ) : null}
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
  addressPlaceholder: {
    color: '#98A2B3',
  },
  destinationFieldButton: {
    minHeight: 34,
    justifyContent: 'center',
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
  quickPlaceSelected: {
    borderColor: 'rgba(255,212,0,0.95)',
    backgroundColor: 'rgba(255,255,255,0.72)',
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
  orderButtonDisabled: {
    opacity: 0.72,
  },
  cancelButton: {
    marginTop: 10,
    shadowOpacity: 0.04,
  },
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
});

