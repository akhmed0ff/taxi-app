'use client';

import {
  Alert,
  Badge,
  Card,
  Col,
  Descriptions,
  Drawer,
  List,
  Row,
  Space,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActiveOrdersTable } from '@/components/ActiveOrdersTable';
import { AdminShell } from '@/components/AdminShell';
import { MetricCard } from '@/components/MetricCard';
import { OrdersMap } from '@/components/OrdersMap';
import {
  AdminDriver,
  AdminOrder,
  AdminRideDetails,
  fetchActiveOrders,
  fetchAdminDrivers,
  fetchRideDetails,
  formatSom,
  mapGeoToPanelPosition,
  statusLabels,
} from '@/services/api';
import { AdminRealtimeClient } from '@/services/realtime';

type LiveState = 'connecting' | 'connected' | 'offline';

export default function MonitoringPage() {
  const [activeOrders, setActiveOrders] = useState<AdminOrder[]>([]);
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [rideDetails, setRideDetails] = useState<AdminRideDetails>();
  const [error, setError] = useState<string>();
  const [liveState, setLiveState] = useState<LiveState>('connecting');

  const loadDashboard = useCallback(async () => {
    setError(undefined);

    try {
      const [nextOrders, nextDrivers] = await Promise.all([
        fetchActiveOrders(),
        fetchAdminDrivers(),
      ]);

      setActiveOrders(nextOrders);
      setDrivers((current) => mergeDriverPositions(nextDrivers, current));
      setLiveState('connected');
    } catch (nextError) {
      console.warn(nextError);
      setActiveOrders([]);
      setDrivers([]);
      setLiveState('offline');
      setError('Backend API недоступен. Админка показывает только реальные данные, mock fallback отключён.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    const realtime = new AdminRealtimeClient();

    async function connectRealtime() {
      try {
        setLiveState('connecting');
        cleanup = await realtime.connect({
          ORDER_UPDATED: () => void loadDashboard(),
          DRIVER_UPDATED: (payload) => {
            if (isDriverLocationPayload(payload)) {
              setDrivers((current) =>
                applyLiveDriverLocation(current, payload.driverId, payload.lat, payload.lng),
              );
              return;
            }

            void loadDashboard();
          },
        });

        if (!cancelled) {
          setLiveState('connected');
        }
      } catch (nextError) {
        console.warn(nextError);

        if (!cancelled) {
          setLiveState('offline');
        }
      }
    }

    void connectRealtime();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [loadDashboard]);

  async function openRideDetails(rideId: string) {
    setDetailsLoading(true);

    try {
      setRideDetails(await fetchRideDetails(rideId));
    } catch (nextError) {
      console.warn(nextError);
      setError('Не удалось загрузить детали заказа.');
    } finally {
      setDetailsLoading(false);
    }
  }

  const metrics = useMemo(() => {
    const searchingOrders = activeOrders.filter(
      (order) => order.status === 'SEARCHING_DRIVER',
    );
    const activeRevenue = activeOrders.reduce((sum, order) => sum + order.fare, 0);
    const onlineDrivers = drivers.filter((driver) => driver.status === 'ONLINE').length;
    const busyDrivers = drivers.filter((driver) => driver.status === 'BUSY').length;
    const assignedOrders = activeOrders.filter(
      (order) => order.status !== 'SEARCHING_DRIVER',
    ).length;
    const assignmentRate =
      activeOrders.length > 0
        ? Math.round((assignedOrders / activeOrders.length) * 100)
        : 0;

    return {
      activeRevenue,
      assignmentRate,
      busyDrivers,
      onlineDrivers,
      searchingOrders,
    };
  }, [activeOrders, drivers]);

  return (
    <AdminShell>
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <div>
          <Space align="center" wrap>
            <Typography.Title level={2} style={{ margin: 0 }}>
              Мониторинг заказов
            </Typography.Title>
            <Badge
              status={liveState === 'connected' ? 'success' : liveState === 'connecting' ? 'processing' : 'error'}
              text={liveState === 'connected' ? 'live' : liveState === 'connecting' ? 'подключение' : 'offline'}
            />
          </Space>
          <Typography.Text type="secondary">
            Активные поездки, карта водителей и очередь назначений.
          </Typography.Text>
        </div>

        {error && <Alert message={error} type="error" showIcon />}

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="Активные поездки" value={activeOrders.length} />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="Активный доход" value={metrics.activeRevenue} suffix="сум" />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="Водители ONLINE" value={metrics.onlineDrivers} />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="Водители BUSY" value={metrics.busyDrivers} />
          </Col>
        </Row>

        {metrics.searchingOrders.length > 0 && (
          <Alert
            message={`${metrics.searchingOrders.length} заказ ожидает назначения водителя`}
            description="Matching ещё ищет ближайшего ONLINE водителя."
            type="warning"
            showIcon
          />
        )}

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>
            <OrdersMap driverList={drivers} loading={loading} orders={activeOrders} />
          </Col>
          <Col xs={24} xl={8}>
            <Card loading={loading} title="Статус системы">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="API">
                  <Tag color={error ? 'red' : 'green'}>{error ? 'ERROR' : 'OK'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Socket.IO">
                  <Tag color={liveState === 'connected' ? 'green' : liveState === 'connecting' ? 'blue' : 'red'}>
                    {liveState.toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Назначение">{metrics.assignmentRate}%</Descriptions.Item>
              </Descriptions>

              <List
                dataSource={activeOrders}
                locale={{ emptyText: 'Нет активных заказов' }}
                renderItem={(order) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Typography.Text strong>{order.id}</Typography.Text>
                          <Tag>{statusLabels[order.status] ?? order.status}</Tag>
                        </Space>
                      }
                      description={`${order.pickup} -> ${order.destination}`}
                    />
                    <Typography.Text strong>{formatSom(order.fare)}</Typography.Text>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Активные поездки">
          <ActiveOrdersTable
            dataSource={activeOrders}
            loading={loading}
            onOpenDetails={openRideDetails}
          />
        </Card>

        <Drawer
          loading={detailsLoading}
          onClose={() => setRideDetails(undefined)}
          open={Boolean(rideDetails) || detailsLoading}
          title="Детали поездки"
          width={520}
        >
          {rideDetails && (
            <Space direction="vertical" size={18} style={{ width: '100%' }}>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Ride ID">{rideDetails.id}</Descriptions.Item>
                <Descriptions.Item label="Статус">
                  <Tag>{statusLabels[rideDetails.status] ?? rideDetails.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Пассажир">{rideDetails.passenger}</Descriptions.Item>
                <Descriptions.Item label="Телефон пассажира">{rideDetails.customerPhone}</Descriptions.Item>
                <Descriptions.Item label="Водитель">{rideDetails.driver}</Descriptions.Item>
                <Descriptions.Item label="Телефон водителя">{rideDetails.driverPhone}</Descriptions.Item>
                <Descriptions.Item label="Маршрут">{rideDetails.route}</Descriptions.Item>
                <Descriptions.Item label="Тариф">{rideDetails.tariffClass}</Descriptions.Item>
                <Descriptions.Item label="Дистанция">{rideDetails.distanceKm} км</Descriptions.Item>
                <Descriptions.Item label="Ожидание">{rideDetails.waitingMinutes} мин</Descriptions.Item>
                <Descriptions.Item label="Остановки">{rideDetails.stopMinutes} мин</Descriptions.Item>
                <Descriptions.Item label="Стоимость">{formatSom(rideDetails.fare)}</Descriptions.Item>
                <Descriptions.Item label="Оплата">
                  {rideDetails.paymentStatus} / {rideDetails.paymentMethod}
                </Descriptions.Item>
              </Descriptions>

              <Timeline
                items={rideDetails.statusHistory.map((item) => ({
                  children: `${item.status} · ${new Date(item.createdAt).toLocaleString('ru-RU')}`,
                }))}
              />
            </Space>
          )}
        </Drawer>
      </Space>
    </AdminShell>
  );
}

function mergeDriverPositions(nextDrivers: AdminDriver[], currentDrivers: AdminDriver[]) {
  const currentById = new Map(currentDrivers.map((driver) => [driver.id, driver]));

  return nextDrivers.map((driver) => {
    const current = currentById.get(driver.id);
    return current ? { ...driver, lat: current.lat, lng: current.lng } : driver;
  });
}

function applyLiveDriverLocation(
  drivers: AdminDriver[],
  driverId: string,
  lat: number,
  lng: number,
) {
  const position = mapGeoToPanelPosition(lat, lng);

  return drivers.map((driver) =>
    driver.id === driverId ? { ...driver, ...position } : driver,
  );
}

function isDriverLocationPayload(
  payload: unknown,
): payload is { driverId: string; lat: number; lng: number } {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as Record<string, unknown>;
  return (
    typeof candidate.driverId === 'string' &&
    typeof candidate.lat === 'number' &&
    typeof candidate.lng === 'number'
  );
}
