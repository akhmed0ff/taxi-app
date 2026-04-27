'use client';

import { Alert, Card, Col, List, Row, Space, Tag, Typography } from 'antd';
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
import { fetchActiveOrders, fetchAdminDrivers } from '@/services/api';

export default function MonitoringPage() {
  const [activeOrders, setActiveOrders] = useState(fallbackActiveOrders);
  const [drivers, setDrivers] = useState(fallbackDrivers);
  const [loading, setLoading] = useState(true);
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
          <ActiveOrdersTable dataSource={activeOrders} loading={loading} />
        </Card>
      </Space>
    </AdminShell>
  );
}
