'use client';

import { FileSearchOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Drawer, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { drivers as initialDrivers, formatSom } from '@/data/mock';
import { ENABLE_ADMIN_MOCK_FALLBACK, fetchAdminDrivers } from '@/services/api';

type Driver = (typeof initialDrivers)[number];

const statusColors: Record<Driver['status'], string> = {
  ONLINE: 'green',
  BUSY: 'blue',
  OFFLINE: 'default',
};

const documentColors: Record<Driver['documents'], string> = {
  VERIFIED: 'green',
  PENDING: 'orange',
  REJECTED: 'red',
};

const documentLabels: Record<Driver['documents'], string> = {
  VERIFIED: 'Проверены',
  PENDING: 'На проверке',
  REJECTED: 'Отклонены',
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<typeof initialDrivers>(
    ENABLE_ADMIN_MOCK_FALLBACK ? initialDrivers : [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [api, contextHolder] = message.useMessage();

  useEffect(() => {
    let cancelled = false;

    async function loadDrivers() {
      setLoading(true);
      setError(undefined);

      try {
        const nextDrivers = await fetchAdminDrivers();

        if (!cancelled) {
          setDrivers(nextDrivers);
        }
      } catch (nextError) {
        if (!cancelled) {
          console.warn(nextError);
          setDrivers(ENABLE_ADMIN_MOCK_FALLBACK ? initialDrivers : []);
          setError(
            ENABLE_ADMIN_MOCK_FALLBACK
              ? 'Backend недоступен. Показаны fallback mock-данные.'
              : 'Backend API unavailable. Mock fallback is disabled in production.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDrivers();

    return () => {
      cancelled = true;
    };
  }, []);

  const columns = useMemo<ColumnsType<Driver>>(
    () => [
      {
        title: 'Водитель',
        dataIndex: 'name',
        render: (name: string, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{name}</Typography.Text>
            <Typography.Text type="secondary">{record.phone}</Typography.Text>
          </Space>
        ),
      },
      { title: 'Авто', dataIndex: 'car' },
      {
        title: 'Статус',
        dataIndex: 'status',
        render: (status: Driver['status']) => <Tag color={statusColors[status]}>{status}</Tag>,
      },
      { title: 'Рейтинг', dataIndex: 'rating' },
      {
        title: 'Документы',
        dataIndex: 'documents',
        render: (documents: Driver['documents']) => (
          <Tag color={documentColors[documents]}>{documentLabels[documents]}</Tag>
        ),
      },
      {
        title: 'Баланс',
        dataIndex: 'balance',
        align: 'right',
        render: (balance: number) => formatSom(balance),
      },
      {
        title: 'Действия',
        render: (_, record) => (
          <Space wrap>
            <Button icon={<FileSearchOutlined />} onClick={() => setSelectedDriver(record)}>
              Документы
            </Button>
            <Button
              danger={!record.blocked}
              icon={record.blocked ? <UnlockOutlined /> : <LockOutlined />}
              onClick={() => {
                setDrivers((current) =>
                  current.map((driver) =>
                    driver.id === record.id ? { ...driver, blocked: !driver.blocked } : driver,
                  ),
                );
                api.success(record.blocked ? 'Водитель разблокирован' : 'Водитель заблокирован');
              }}
            >
              {record.blocked ? 'Разблокировать' : 'Блокировать'}
            </Button>
          </Space>
        ),
      },
    ],
    [api],
  );

  return (
    <AdminShell>
      {contextHolder}
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Управление водителями
          </Typography.Title>
          <Typography.Text type="secondary">
            Блокировка аккаунтов, проверка документов и операционный статус.
          </Typography.Text>
        </div>

        {error && <Alert message={error} type="warning" showIcon />}

        <Card>
          <Table
            columns={columns}
            dataSource={drivers}
            loading={loading}
            rowKey="id"
            scroll={{ x: 1100 }}
          />
        </Card>
      </Space>

      <Drawer
        title={selectedDriver?.name}
        open={Boolean(selectedDriver)}
        onClose={() => setSelectedDriver(null)}
        width={420}
      >
        {selectedDriver && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Typography.Text type="secondary">{selectedDriver.car}</Typography.Text>
            <Card size="small" title="Документы">
              <Space direction="vertical">
                <Tag color={documentColors[selectedDriver.documents]}>
                  {documentLabels[selectedDriver.documents]}
                </Tag>
                <Typography.Text>Паспорт, водительское удостоверение, техпаспорт</Typography.Text>
              </Space>
            </Card>
            <Card size="small" title="Сводка">
              <Space direction="vertical">
                <Typography.Text>Поездки сегодня: {selectedDriver.tripsToday}</Typography.Text>
                <Typography.Text>Баланс: {formatSom(selectedDriver.balance)}</Typography.Text>
                <Typography.Text>Рейтинг: {selectedDriver.rating}</Typography.Text>
              </Space>
            </Card>
            <Space>
              <Button type="primary" onClick={() => api.success('Документы подтверждены')}>
                Подтвердить
              </Button>
              <Button danger onClick={() => api.warning('Документы отправлены на доработку')}>
                Отклонить
              </Button>
            </Space>
          </Space>
        )}
      </Drawer>
    </AdminShell>
  );
}
