import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FakeMapPlaceholder } from '../components/map';
import {
  AppButton,
  BottomSheetPanel,
  GlassCard,
  IconButton,
  TariffCard,
} from '../components/ui';
import {
  createOrder,
  ensurePassengerDevSession,
  getTariffs,
  type PublicTariff,
} from '../services/api';
import {
  calculateEstimatedFare,
  type EstimatedFareResult,
} from '../services/fare/fareService';
import {
  getDestinationOptions,
  getPickupPoint,
  type DestinationOption,
} from '../services/locations/locationProvider';
import { usePassengerRideState } from '../state/passengerRideState';
import { Order, Point, TariffClass } from '../types/order';
import { ORDER_STATUSES } from '../types/orderStatus';

interface HomeScreenProps {
  order?: Order;
  onOrderCreated?: (order: Order) => void;
  onCancelOrder: () => Promise<void>;
  onOpenHistory: () => void;
  onLogout: () => void;
}

const BOTTOM_NAV_HEIGHT = 88;
const SHEET_OVERLAP = 8;

const tariffIcons: Record<TariffClass, keyof typeof Ionicons.glyphMap> = {
  STANDARD: 'car-outline',
  COMFORT: 'car-sport-outline',
  COMFORT_PLUS: 'car-sport-outline',
  DELIVERY: 'cube-outline',
};

type TariffViewModel = PublicTariff & {
  icon: keyof typeof Ionicons.glyphMap;
};

const mockDriver = {
  car: 'Chevrolet Cobalt',
  driverName: 'Alisher',
  eta: '3 мин',
  plate: '01 A 777 AA',
  rating: 4.9,
};

function mapPublicTariffToViewModel(tariff: PublicTariff): TariffViewModel {
  const icon = tariffIcons[tariff.code] ?? 'car-outline';

  return {
    ...tariff,
    icon,
  };
}

export function HomeScreen({
  onCancelOrder,
  onOrderCreated,
  onOpenHistory,
  order,
}: HomeScreenProps) {
  const pickup = getPickupPoint();
  const pickupAddress = pickup.addressLabel;
  const isPickupAddressLoading = pickup.isLoading;
  const [destination, setDestination] = useState<Point>();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [fareByTariffCode, setFareByTariffCode] = useState<
    Partial<Record<TariffClass, EstimatedFareResult>>
  >({});
  const [tariffs, setTariffs] = useState<TariffViewModel[]>([]);
  const [isTariffsLoading, setIsTariffsLoading] = useState(true);
  const [tariffsError, setTariffsError] = useState<string>();
  const [userPickedTariff, setUserPickedTariff] = useState(false);
  const [destinationModalVisible, setDestinationModalVisible] = useState(false);
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
  const currentPoint = pickup.point;

  const activeOrder =
    order && order.status !== ORDER_STATUSES.CANCELLED ? order : undefined;

  const isOrderSearching =
    !!activeOrder &&
    (activeOrder.status === ORDER_STATUSES.NEW ||
      activeOrder.status === ORDER_STATUSES.SEARCHING ||
      activeOrder.status === ORDER_STATUSES.OFFERED);

  const isOrderDriverFound =
    !!activeOrder &&
    (activeOrder.status === ORDER_STATUSES.ACCEPTED ||
      activeOrder.status === ORDER_STATUSES.ARRIVING);

  const isOrderRiding =
    !!activeOrder && activeOrder.status === ORDER_STATUSES.IN_PROGRESS;

  const isOrderCompleted =
    !!activeOrder && activeOrder.status === ORDER_STATUSES.COMPLETED;

  const displayDriver = activeOrder?.driver ?? rideState.driver;
  const displayOrderId = activeOrder?.id ?? rideState.orderId;

  const orderFabBlocked =
    isTariffsLoading ||
    isCreatingOrder ||
    isOrderSearching ||
    isOrderDriverFound ||
    isOrderRiding;

  const passengerTariffs = useMemo(
    () => tariffs.filter((t) => t.code !== 'DELIVERY'),
    [tariffs],
  );

  const tariffsReady =
    !isTariffsLoading && !tariffsError && passengerTariffs.length > 0;

  const selectedTariffDetails =
    passengerTariffs.find((tariff) =>
      activeOrder
        ? tariff.code === activeOrder.tariff
        : tariff.code === rideState.selectedTariff,
    ) ?? passengerTariffs[0];
  const selectedTariffTitle = selectedTariffDetails?.title ?? rideState.selectedTariff;
  const destinationAddress = destination?.address ?? '';
  const hasDestination = Boolean(destinationAddress);
  const driverEta =
    displayDriver?.eta ??
    (displayDriver?.etaMinutes != null
      ? `${displayDriver.etaMinutes} мин`
      : mockDriver.eta);

  const pickupEtaText =
    isOrderDriverFound || isOrderRiding
      ? driverEta
      : tariffsReady && selectedTariffDetails
        ? `≈ ${selectedTariffDetails.etaMinutes} мин`
        : '—';

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
    void loadTariffs();
  }, []);

  useEffect(() => {
    if (!order?.id || order.status === ORDER_STATUSES.CANCELLED || !order.dropoff) {
      return;
    }
    const drop = order.dropoff;
    setDestination({
      lat: drop.lat,
      lng: drop.lng,
      address: drop.address,
    });
    selectTariff(order.tariff);
    setUserPickedTariff(true);
  }, [order?.id, order?.tariff, selectTariff]);

  useEffect(() => {
    if (!order && rideState.status === 'IDLE' && !rideState.orderId) {
      setUserPickedTariff(false);
    }
  }, [order, rideState.orderId, rideState.status]);

  useEffect(() => {
    let cancelled = false;

    if (!destination || !tariffsReady) {
      setFareByTariffCode({});
      return () => {
        cancelled = true;
      };
    }

    const pickupCoords = { lat: currentPoint.lat, lng: currentPoint.lng };
    const destCoords = { lat: destination.lat, lng: destination.lng };

    void (async () => {
      try {
        const entries = await Promise.all(
          passengerTariffs.map(async (tariff) => {
            const result = await calculateEstimatedFare({
              pickup: pickupCoords,
              destination: destCoords,
              tariff,
            });
            return [tariff.code, result] as const;
          }),
        );
        if (cancelled) {
          return;
        }
        setFareByTariffCode(Object.fromEntries(entries));
      } catch (error) {
        console.warn(error);
        if (!cancelled) {
          setFareByTariffCode({});
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    tariffsReady,
    currentPoint.lat,
    currentPoint.lng,
    destination?.lat,
    destination?.lng,
    passengerTariffs,
  ]);

  useEffect(() => {
    const showPulse = isOrderSearching && !isCreatingOrder;
    if (!showPulse) {
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
  }, [isCreatingOrder, isOrderSearching, pulseAnim]);

  useEffect(() => {
    if (order?.status === ORDER_STATUSES.ACCEPTED || order?.status === ORDER_STATUSES.ARRIVING) {
      markDriverAssigned(order);
      return;
    }

    if (order?.status === ORDER_STATUSES.IN_PROGRESS) {
      markDriverAssigned(order);
      markRideStarted();
      return;
    }

    if (order?.status === ORDER_STATUSES.COMPLETED) {
      markRideCompleted();
      return;
    }

    if (!order) {
      resetRide();
    }
  }, [
    markDriverAssigned,
    markRideCompleted,
    markRideStarted,
    order,
    resetRide,
  ]);

  async function handleOrder() {
    if (!destination || !selectedTariffDetails || isCreatingOrder || activeOrder) {
      return;
    }

    setIsCreatingOrder(true);
    try {
      const session = await ensurePassengerDevSession();
      const nextOrder = await createOrder({
        accessToken: session.accessToken,
        customerId: session.customerId,
        pickup: {
          lat: currentPoint.lat,
          lng: currentPoint.lng,
          address: pickupAddress,
        },
        dropoff: {
          lat: destination.lat,
          lng: destination.lng,
          address: destination.address,
        },
        tariff: selectedTariffDetails.code,
        tariffId: selectedTariffDetails.id,
      });

      onOrderCreated?.(nextOrder);
      markOrderCreated(nextOrder.id, selectedTariffDetails.code);
    } catch (error) {
      console.warn(error);
      Alert.alert(
        'Ошибка',
        error instanceof Error ? error.message : 'Не удалось создать заказ',
      );
    } finally {
      setIsCreatingOrder(false);
    }
  }

  function handleOrderPress() {
    if (__DEV__) {
      console.log('[customer ui] order pressed');
    }

    if (activeOrder) {
      return;
    }

    if (isTariffsLoading) {
      Alert.alert('Подождите', 'Загружаем тарифы');
      return;
    }

    if (tariffsError || passengerTariffs.length === 0) {
      Alert.alert('Тарифы', tariffsError ?? 'Нет доступных тарифов');
      return;
    }

    if (isPickupAddressLoading) {
      Alert.alert('Подождите', 'Определяем адрес');
      return;
    }

    if (!hasDestination) {
      Alert.alert('Выберите пункт назначения');
      return;
    }

    if (!userPickedTariff) {
      Alert.alert('Выберите тариф');
      return;
    }

    if (!selectedTariffDetails) {
      Alert.alert('Выберите тариф');
      return;
    }

    void handleOrder();
  }

  async function loadTariffs() {
    setIsTariffsLoading(true);
    setTariffsError(undefined);

    try {
      const activeTariffs = await getTariffs();
      setTariffs(activeTariffs.map(mapPublicTariffToViewModel));
    } catch (error) {
      console.warn(error);
      setTariffsError('Не удалось загрузить тарифы');
    } finally {
      setIsTariffsLoading(false);
    }
  }

  function openDestinationModal() {
    if (__DEV__) {
      console.log('[customer ui] destination pressed');
    }
    setDestinationModalVisible(true);
  }

  function closeDestinationModal() {
    setDestinationModalVisible(false);
  }

  function handleSelectDestinationOption(option: DestinationOption) {
    setDestination(option.point);
    closeDestinationModal();
  }

  /** Цена на карточке: без адреса «от — сум», с адресом «от {formattedFare}». */
  function getTariffPriceLabel(tariff: TariffViewModel) {
    if (!hasDestination) {
      return 'от — сум';
    }
    const formatted = fareByTariffCode[tariff.code]?.formattedFare;
    return formatted ? `от ${formatted}` : 'от …';
  }

  function handleCancelRideState() {
    Alert.alert('Отменить заказ?', undefined, [
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
    void Linking.openURL(`tel:${displayDriver?.phone ?? ''}`);
  }

  function handleMessageDriver() {
    Alert.alert('Сообщения скоро будут доступны');
  }

  return (
    <View pointerEvents="box-none" style={styles.screen}>
      <FakeMapPlaceholder showCenterNotice={false} />

      <View pointerEvents="none" style={styles.centerPinWrap}>
        <View style={styles.etaBubble}>
          <Text style={styles.etaTime}>{pickupEtaText}</Text>
          <Text style={styles.etaLabel}>Подача</Text>
        </View>
        {isOrderSearching && !isCreatingOrder ? (
          <Animated.View style={[styles.pinPulse, pulseStyle]} />
        ) : null}
        <View style={styles.pin}>
          <Ionicons color="#111111" name="location-sharp" size={34} />
        </View>
      </View>

      {isOrderDriverFound || isOrderRiding ? (
        <View pointerEvents="none" style={styles.mockRoute}>
          <View style={styles.mockRouteLine} />
          <View style={styles.mockDriverMarker}>
            <Ionicons color="#111111" name="car-sport" size={18} />
          </View>
        </View>
      ) : null}

      <View style={styles.topLayer} pointerEvents="box-none">
        <View style={styles.addressCard}>
          <View style={styles.addressHeaderRow}>
            <Text style={styles.fieldLabel}>Откуда</Text>
          </View>
          <View style={styles.addressRowMain}>
            <Text
              numberOfLines={2}
              style={styles.addressPrimary}
            >
              {isPickupAddressLoading ? 'Определяем адрес...' : 'Текущее местоположение'}
            </Text>
            <Ionicons color="#98A2B3" name="chevron-forward" size={22} />
          </View>
          <View style={styles.addressDivider} />
          <View style={styles.addressHeaderRow}>
            <Text style={styles.fieldLabel}>Куда</Text>
          </View>
          <Pressable
            accessibilityLabel="Выбрать пункт назначения"
            accessibilityRole="button"
            disabled={Boolean(activeOrder)}
            onPress={openDestinationModal}
            style={({ pressed }) => [
              styles.destinationRowPressable,
              pressed && styles.addressCardPressed,
            ]}
          >
            <View style={styles.addressRowMain}>
              <Text
                numberOfLines={2}
                style={[styles.addressPrimary, !destination && styles.addressPlaceholder]}
              >
                {destination?.address
                  ? destination.address.replace(/^Ангрен,\s*/u, '').trim() ||
                    destination.address
                  : 'Куда поедем?'}
              </Text>
              <View style={styles.addRound}>
                <Ionicons color="#FFFFFF" name="add" size={26} />
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={closeDestinationModal}
        transparent
        visible={destinationModalVisible}
      >
        <View style={styles.destinationModalRoot}>
          <Pressable
            accessibilityRole="button"
            onPress={closeDestinationModal}
            style={styles.destinationModalBackdrop}
          />
          <View style={styles.destinationModalSheet}>
            <View style={styles.destinationModalHandle} />
            <Text style={styles.destinationModalTitle}>Куда поедем?</Text>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {getDestinationOptions().map((option) => (
                <Pressable
                  accessibilityRole="button"
                  key={option.label}
                  onPress={() => handleSelectDestinationOption(option)}
                  style={({ pressed }) => [
                    styles.destinationModalRow,
                    pressed && styles.destinationModalRowPressed,
                  ]}
                >
                  <Ionicons color="#667085" name="location-outline" size={22} />
                  <Text numberOfLines={2} style={styles.destinationModalRowLabel}>
                    {option.label}
                  </Text>
                  <Ionicons color="#98A2B3" name="chevron-forward" size={20} />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={closeDestinationModal}
              style={({ pressed }) => [
                styles.destinationModalCancel,
                pressed && styles.destinationModalCancelPressed,
              ]}
            >
              <Text style={styles.destinationModalCancelText}>Отмена</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.mapActions} pointerEvents="box-none">
        <IconButton
          accessibilityLabel="Безопасность"
          icon={<Ionicons color="#111111" name="shield-checkmark-outline" size={23} />}
          variant="yellow"
          onPress={() => Alert.alert('Безопасность')}
        />
        <IconButton
          accessibilityLabel="Геолокация"
          icon={<MaterialCommunityIcons color="#111111" name="crosshairs-gps" size={24} />}
          onPress={() => Alert.alert('Геолокация')}
        />
      </View>

      <BottomSheetPanel style={[styles.sheet, { bottom: BOTTOM_NAV_HEIGHT - SHEET_OVERLAP }]}>
        {isOrderRiding || isOrderCompleted ? (
          <GlassCard style={styles.searchCard}>
            <View style={styles.searchHeader}>
              <View style={styles.searchIcon}>
                <Ionicons
                  color="#111111"
                  name={isOrderCompleted ? 'checkmark-done-outline' : 'navigate-outline'}
                  size={24}
                />
              </View>
              <View style={styles.searchText}>
                <Text style={styles.searchTitle}>
                  {isOrderCompleted ? 'Поездка завершена' : 'Поездка началась'}
                </Text>
                <Text style={styles.searchSubtitle}>
                  {displayOrderId ? `Заказ #${displayOrderId.slice(0, 8)}` : selectedTariffTitle}
                </Text>
              </View>
            </View>
          </GlassCard>
        ) : isOrderDriverFound ? (
          <GlassCard style={styles.driverCard}>
            <Text style={styles.driverFoundLabel}>Водитель найден</Text>
            <View style={styles.driverTopRow}>
              <View style={styles.driverAvatar}>
                <Ionicons color="#111111" name="person" size={26} />
              </View>
              <View style={styles.driverInfo}>
                <View style={styles.driverNameRow}>
                  <Text style={styles.driverName}>
                    {displayDriver?.name ?? mockDriver.driverName}
                  </Text>
                  <View style={styles.ratingBadge}>
                    <Ionicons color="#111111" name="star" size={13} />
                    <Text style={styles.ratingText}>
                      {displayDriver?.rating ?? mockDriver.rating}
                    </Text>
                  </View>
                </View>
                <Text style={styles.driverMeta}>{displayDriver?.car ?? mockDriver.car}</Text>
                <Text style={styles.driverPlate}>{displayDriver?.plate ?? mockDriver.plate}</Text>
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
                title="Сообщение"
                variant="outline"
              />
            </View>
          </GlassCard>
        ) : isCreatingOrder ? (
          <GlassCard style={styles.searchCard}>
            <View style={styles.searchHeader}>
              <View style={styles.searchIcon}>
                <ActivityIndicator color="#111111" />
              </View>
              <View style={styles.searchText}>
                <Text style={styles.searchTitle}>Создаём заказ...</Text>
                <Text style={styles.searchSubtitle}>Отправляем запрос на сервер</Text>
              </View>
            </View>
          </GlassCard>
        ) : isOrderSearching ? (
          <GlassCard style={styles.searchCard}>
            <View style={styles.searchHeader}>
              <View style={styles.searchIcon}>
                <Ionicons color="#111111" name="radio-outline" size={24} />
              </View>
              <View style={styles.searchText}>
                <Text style={styles.searchTitle}>Ищем водителя...</Text>
                <Text style={styles.searchSubtitle}>
                  {selectedTariffDetails
                    ? `${selectedTariffTitle} · ${getTariffPriceLabel(selectedTariffDetails)}`
                    : selectedTariffTitle}
                </Text>
                {displayOrderId ? (
                  <Text style={styles.orderIdText}>
                    Заказ #{displayOrderId.slice(0, 8)}
                    {__DEV__ ? ` · ${displayOrderId}` : ''}
                  </Text>
                ) : null}
              </View>
            </View>
          </GlassCard>
        ) : isTariffsLoading ? (
          <View style={styles.tariffState}>
            <ActivityIndicator color="#111111" />
            <Text style={styles.tariffLoadingText}>Загрузка тарифов...</Text>
          </View>
        ) : tariffsError ? (
          <View style={styles.tariffState}>
            <Text style={styles.tariffStateText}>{tariffsError}</Text>
            <AppButton
              onPress={() => void loadTariffs()}
              size="md"
              style={styles.retryButton}
              title="Повторить"
              variant="outline"
            />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.tariffList}
            horizontal
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
          >
            {passengerTariffs.map((tariff) => (
              <TariffCard
                etaMinutes={tariff.etaMinutes}
                icon={<Ionicons color="#111111" name={tariff.icon} size={26} />}
                key={tariff.id}
                price={getTariffPriceLabel(tariff)}
                seats={tariff.seats > 0 ? tariff.seats : 4}
                onPress={() => {
                  if (__DEV__) {
                    console.log('[customer ui] tariff selected', tariff.code);
                  }
                  selectTariff(tariff.code);
                  setUserPickedTariff(true);
                }}
                selected={
                  activeOrder
                    ? activeOrder.tariff === tariff.code
                    : rideState.selectedTariff === tariff.code
                }
                style={styles.tariffCard}
                title={tariff.title}
              />
            ))}
          </ScrollView>
        )}

        {isOrderSearching || isOrderDriverFound || isOrderRiding ? (
          <AppButton
            onPress={handleCancelRideState}
            size="md"
            style={styles.cancelButton}
            title="Отменить"
            variant="outline"
          />
        ) : null}
      </BottomSheetPanel>

      <View style={styles.bottomNav} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={onOpenHistory}
          style={({ pressed }) => [styles.bottomNavSide, pressed && styles.bottomNavPressed]}
        >
          <Ionicons color="#111111" name="person-outline" size={22} />
          <Text style={styles.bottomNavLabel}>Профиль</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={orderFabBlocked}
          onPress={handleOrderPress}
          style={({ pressed }) => [
            styles.orderFab,
            pressed && !orderFabBlocked && styles.orderFabPressed,
            isTariffsLoading && styles.orderFabDisabledLoading,
            isCreatingOrder && styles.orderFabSubmitting,
            (isOrderSearching || isOrderDriverFound || isOrderRiding) &&
              styles.orderFabDisabledLoading,
          ]}
        >
          {isCreatingOrder ? (
            <View style={styles.orderFabInnerRow}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.orderFabTitle}>Создаём заказ...</Text>
            </View>
          ) : isTariffsLoading ? (
            <ActivityIndicator color="#111111" />
          ) : isOrderSearching ? (
            <View style={styles.orderFabInnerRow}>
              <ActivityIndicator color="#111111" />
              <Text style={[styles.orderFabTitle, styles.orderFabTitleMuted]}>
                Ищем водителя...
              </Text>
            </View>
          ) : isOrderDriverFound || isOrderRiding ? (
            <Text style={[styles.orderFabTitle, styles.orderFabTitleMuted]}>Заказ активен</Text>
          ) : (
            <Text style={styles.orderFabTitle}>Заказать</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => Alert.alert('Параметры')}
          style={({ pressed }) => [styles.bottomNavSide, pressed && styles.bottomNavPressed]}
        >
          <Ionicons color="#111111" name="options-outline" size={22} />
          <Text style={styles.bottomNavLabel}>Параметры</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  topLayer: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    zIndex: 22,
    elevation: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 10,
  },
  addressCardPressed: {
    opacity: 0.96,
  },
  addressHeaderRow: {
    marginBottom: 4,
  },
  fieldLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  addressRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addressPrimary: {
    flex: 1,
    minWidth: 0,
    color: '#111111',
    fontSize: 17,
    fontWeight: '800',
  },
  addressPlaceholder: {
    color: '#98A2B3',
    fontWeight: '700',
  },
  addressDivider: {
    height: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    marginVertical: 12,
  },
  addRound: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  destinationRowPressable: {
    marginHorizontal: -4,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 12,
  },
  destinationModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  destinationModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  destinationModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
  },
  destinationModalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
    backgroundColor: 'rgba(17, 17, 17, 0.12)',
  },
  destinationModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111111',
    marginBottom: 12,
  },
  destinationModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.06)',
  },
  destinationModalRowPressed: {
    backgroundColor: 'rgba(255, 212, 0, 0.18)',
  },
  destinationModalRowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
  },
  destinationModalCancel: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  destinationModalCancelPressed: {
    opacity: 0.7,
  },
  destinationModalCancelText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#667085',
  },
  centerPinWrap: {
    position: 'absolute',
    top: '42%',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -52 }],
    zIndex: 6,
  },
  etaBubble: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
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
    zIndex: 2,
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
    bottom: BOTTOM_NAV_HEIGHT + 200,
    gap: 12,
    zIndex: 15,
    elevation: 15,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 18,
    elevation: 18,
  },
  tariffList: {
    paddingRight: 12,
    gap: 10,
    paddingBottom: 4,
  },
  tariffState: {
    minHeight: 104,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  tariffStateText: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '800',
  },
  tariffLoadingText: {
    marginTop: 8,
    color: '#667085',
    fontSize: 14,
    fontWeight: '800',
  },
  retryButton: {
    minWidth: 150,
    shadowOpacity: 0.04,
  },
  tariffCard: {
    width: 248,
  },
  searchCard: {
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
  driverFoundLabel: {
    marginBottom: 10,
    color: '#667085',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  driverCard: {
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
    backgroundColor: '#F6F7F9',
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
  cancelButton: {
    marginTop: 12,
    shadowOpacity: 0.04,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: BOTTOM_NAV_HEIGHT,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.06)',
    zIndex: 20,
    elevation: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  bottomNavSide: {
    width: 76,
    alignItems: 'center',
    gap: 4,
  },
  bottomNavLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111111',
  },
  bottomNavPressed: {
    opacity: 0.72,
  },
  orderFab: {
    minWidth: 168,
    maxWidth: 260,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  orderFabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  orderFabDisabledLoading: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0.06,
    elevation: 2,
  },
  orderFabSubmitting: {
    opacity: 0.88,
  },
  orderFabTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  orderFabTitleMuted: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '900',
  },
  orderFabInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
});
