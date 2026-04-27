'use client';

import {
  Alert,
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
import { useEffect, useState } from 'react';
import { ActiveOrdersTable } from '@/components/ActiveOrdersTable';
import { AdminShell } from '@/components/AdminShell';
import { MetricCard } from '@/components/MetricCard';
import { OrdersMap } from '@/components/OrdersMap';
import {
  activeOrders as fallbackActiveOrders,
  analytics,
  drivers as fallbackDrivers,
  formatSom,
  statusLabels,
} from '@/data/mock';
import {
  AdminRideDetails,
  fetchActiveOrders,
  fetchAdminDrivers,
  fetchRideDetails,
} from '@/services/api';

export default function MonitoringPage() {
  const [activeOrders, setActiveOrders] = useState(fallbackActiveOrders);
  const [drivers, setDrivers] = useState(fallbackDrivers);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [rideDetails, setRideDetails] = useState<AdminRideDetails>();
  const [error, setError] = useState<string>();
  const searchingOrders = activeOrders.filter(
    (order) => order.status === 'SEARCHING_DRIVER',
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(undefined);

      try {
        const [nextOrders, nextDrivers] = await Promise.all([
          fetchActiveOrders(),
          fetchAdminDrivers(),
        ]);

        if (!cancelled) {
          setActiveOrders(nextOrders);
          setDrivers(nextDrivers);
        }
      } catch (nextError) {
        if (!cancelled) {
          console.warn(nextError);
          setActiveOrders(fallbackActiveOrders);
          setDrivers(fallbackDrivers);
          setError('Backend недоступен. Показаны fallback mock-данные.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <AdminShell>
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Мониторинг заказов
          </Typography.Title>
          <Typography.Text type="secondary">
            Активные поездки, карта водителей и очередь назначений.
          </Typography.Text>
        </div>

        {error && <Alert message={error} type="warning" showIcon />}

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="Поездки сегодня" value={analytics.tripsToday} />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="Доход" value={analytics.revenueToday} suffix="сум" />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="Водители онлайн" value={drivers.filter((driver) => driver.status !== 'OFFLINE').length} />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="Завершение" value={analytics.completionRate} suffix="%" />
          </Col>
        </Row>

        {searchingOrders.length > 0 && (
          <Alert
            message={`${searchingOrders.length} заказ ожидает назначения водителя`}
            description="Проверьте ближайших свободных водителей или дождитесь расширения радиуса matching."
            type="warning"
            showIcon
          />
        )}

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>
            <OrdersMap driverList={drivers} loading={loading} orders={activeOrders} />
          </Col>
          <Col xs={24} xl={8}>
            <Card loading={loading} title="Очередь диспетчера">
              <List
                dataSource={activeOrders}
                renderItem={(order) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Typography.Text strong>{order.id}</Typography.Text>
                          <Tag>{statusLabels[order.status]}</Tag>
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
