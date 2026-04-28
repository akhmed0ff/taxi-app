'use client';

import { FileSearchOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Drawer, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { AdminDriver, fetchAdminDrivers, formatSom } from '@/services/api';
import { AdminRealtimeClient } from '@/services/realtime';

const statusColors: Record<AdminDriver['status'], string> = {
  ONLINE: 'green',
  BUSY: 'blue',
  OFFLINE: 'default',
};

const documentColors: Record<AdminDriver['documents'], string> = {
  VERIFIED: 'green',
  PENDING: 'orange',
  REJECTED: 'red',
};

const documentLabels: Record<AdminDriver['documents'], string> = {
  VERIFIED: 'Проверены',
  PENDING: 'На проверке',
  REJECTED: 'Отклонены',
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [selectedDriver, setSelectedDriver] = useState<AdminDriver | null>(null);
  const [api, contextHolder] = message.useMessage();

  const loadDrivers = useCallback(async () => {
    setError(undefined);

    try {
      setDrivers(await fetchAdminDrivers());
    } catch (nextError) {
      console.warn(nextError);
      setDrivers([]);
      setError('Backend API недоступен. Mock fallback отключён.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const realtime = new AdminRealtimeClient();

    async function connectRealtime() {
      try {
        cleanup = await realtime.connect({
          ORDER_UPDATED: () => undefined,
          DRIVER_UPDATED: () => void loadDrivers(),
        });
      } catch (nextError) {
        console.warn(nextError);
      }
    }

    void connectRealtime();

    return () => cleanup?.();
  }, [loadDrivers]);

  const columns = useMemo<ColumnsType<AdminDriver>>(
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
        render: (status: AdminDriver['status']) => <Tag color={statusColors[status]}>{status}</Tag>,
      },
      { title: 'Рейтинг', dataIndex: 'rating' },
      {
        title: 'Документы',
        dataIndex: 'documents',
        render: (documents: AdminDriver['documents']) => (
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
              disabled
              icon={record.blocked ? <UnlockOutlined /> : <LockOutlined />}
              onClick={() => api.info('Блокировка будет подключена отдельным backend endpoint.')}
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
            Реальный список водителей, документы и операционный статус.
          </Typography.Text>
        </div>

        {error && <Alert message={error} type="error" showIcon />}

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
                <Typography.Text>Статус: {selectedDriver.status}</Typography.Text>
                <Typography.Text>Поездки сегодня: {selectedDriver.tripsToday}</Typography.Text>
                <Typography.Text>Баланс: {formatSom(selectedDriver.balance)}</Typography.Text>
                <Typography.Text>Рейтинг: {selectedDriver.rating}</Typography.Text>
              </Space>
            </Card>
            <Space>
              <Button type="primary" onClick={() => api.info('Подтверждение документов требует отдельного endpoint.')}>
                Подтвердить
              </Button>
              <Button danger onClick={() => api.info('Отклонение документов требует отдельного endpoint.')}>
                Отклонить
              </Button>
            </Space>
          </Space>
        )}
      </Drawer>
    </AdminShell>
  );
}
