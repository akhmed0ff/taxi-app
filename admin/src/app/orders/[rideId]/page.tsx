'use client';

import { ArrowLeftOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Descriptions, Space, Spin, Tag, Timeline, Typography } from 'antd';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { AdminRideDetails, fetchRideDetails, formatSom, statusLabels } from '@/services/api';

interface OrderDetailsPageProps {
  params: {
    rideId: string;
  };
}

export default function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const [ride, setRide] = useState<AdminRideDetails>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    async function loadRide() {
      setLoading(true);
      setError(undefined);

      try {
        const nextRide = await fetchRideDetails(params.rideId);

        if (!cancelled) {
          setRide(nextRide);
        }
      } catch (nextError) {
        if (!cancelled) {
          console.warn(nextError);
          setError('Не удалось загрузить детали заказа.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRide();

    return () => {
      cancelled = true;
    };
  }, [params.rideId]);

  return (
    <AdminShell>
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <Space>
          <Link href="/">
            <Button icon={<ArrowLeftOutlined />}>Назад</Button>
          </Link>
          <div>
            <Typography.Title level={2} style={{ margin: 0 }}>
              Детали заказа
            </Typography.Title>
            <Typography.Text type="secondary">{params.rideId}</Typography.Text>
          </div>
        </Space>

        {error && <Alert message={error} type="error" showIcon />}
        {loading && (
          <Card>
            <Spin />
          </Card>
        )}

        {ride && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Card title="Заказ">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Ride ID">{ride.id}</Descriptions.Item>
                <Descriptions.Item label="Статус">
                  <Tag>{statusLabels[ride.status] ?? ride.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Пассажир">{ride.passenger}</Descriptions.Item>
                <Descriptions.Item label="Телефон пассажира">{ride.customerPhone}</Descriptions.Item>
                <Descriptions.Item label="Водитель">{ride.driver}</Descriptions.Item>
                <Descriptions.Item label="Телефон водителя">{ride.driverPhone}</Descriptions.Item>
                <Descriptions.Item label="Маршрут">{ride.route}</Descriptions.Item>
                <Descriptions.Item label="Тариф">{ride.tariffClass}</Descriptions.Item>
                <Descriptions.Item label="Стоимость">{formatSom(ride.fare)}</Descriptions.Item>
                <Descriptions.Item label="Дистанция">{ride.distanceKm} км</Descriptions.Item>
                <Descriptions.Item label="Ожидание">{ride.waitingMinutes} мин</Descriptions.Item>
                <Descriptions.Item label="Остановки">{ride.stopMinutes} мин</Descriptions.Item>
                {ride.cancelReason && (
                  <Descriptions.Item label="Причина отмены">{ride.cancelReason}</Descriptions.Item>
                )}
                <Descriptions.Item label="Оплата">
                  {ride.paymentStatus} / {ride.paymentMethod}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="История статусов">
              <Timeline
                items={ride.statusHistory.map((item) => ({
                  children: `${item.status} · ${new Date(item.createdAt).toLocaleString('ru-RU')}${
                    item.reason ? ` · ${item.reason}` : ''
                  }`,
                }))}
              />
            </Card>
          </Space>
        )}
      </Space>
    </AdminShell>
  );
}
