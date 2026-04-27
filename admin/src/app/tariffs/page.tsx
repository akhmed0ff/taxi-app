'use client';

import { SaveOutlined } from '@ant-design/icons';
import { Button, Card, InputNumber, Space, Switch, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { formatSom, tariffs as initialTariffs } from '@/data/mock';

type Tariff = (typeof initialTariffs)[number];
type NumericTariffField = 'baseFare' | 'perKm' | 'perMinute' | 'surge';

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState(initialTariffs);
  const [api, contextHolder] = message.useMessage();

  const updateTariff = (
    key: string,
    field: NumericTariffField | 'active',
    value: number | boolean | null,
  ) => {
    if (value === null) {
      return;
    }

    setTariffs((current) =>
      current.map((tariff) => (tariff.key === key ? { ...tariff, [field]: value } : tariff)),
    );
  };

  const columns = useMemo<ColumnsType<Tariff>>(
    () => [
      {
        title: 'Класс',
        dataIndex: 'name',
        render: (name: string, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{name}</Typography.Text>
            <Typography.Text type="secondary">
              Пример: {formatSom(record.baseFare + record.perKm * 4 + record.perMinute * 12)}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: 'Подача',
        dataIndex: 'baseFare',
        render: (value: number, record) => (
          <InputNumber
            min={0}
            step={500}
            value={value}
            onChange={(nextValue) => updateTariff(record.key, 'baseFare', nextValue)}
          />
        ),
      },
      {
        title: 'Цена / км',
        dataIndex: 'perKm',
        render: (value: number, record) => (
          <InputNumber
            min={0}
            step={100}
            value={value}
            onChange={(nextValue) => updateTariff(record.key, 'perKm', nextValue)}
          />
        ),
      },
      {
        title: 'Цена / мин',
        dataIndex: 'perMinute',
        render: (value: number, record) => (
          <InputNumber
            min={0}
            step={50}
            value={value}
            onChange={(nextValue) => updateTariff(record.key, 'perMinute', nextValue)}
          />
        ),
      },
      {
        title: 'Спрос',
        dataIndex: 'surge',
        render: (value: number, record) => (
          <InputNumber
            min={1}
            max={3}
            step={0.05}
            value={value}
            onChange={(nextValue) => updateTariff(record.key, 'surge', nextValue)}
          />
        ),
      },
      {
        title: 'Активен',
        dataIndex: 'active',
        render: (value: boolean, record) => (
          <Switch
            checked={value}
            onChange={(checked) => updateTariff(record.key, 'active', checked)}
          />
        ),
      },
      {
        title: 'Действия',
        render: (_, record) => (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => api.success(`Тариф "${record.name}" сохранен`)}
          >
            Сохранить
          </Button>
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
            Тарифы
          </Typography.Title>
          <Typography.Text type="secondary">
            Настройка подачи, километража, минут и коэффициента спроса.
          </Typography.Text>
        </div>

        <Card>
          <Table
            columns={columns}
            dataSource={tariffs}
            pagination={false}
            rowKey="key"
            scroll={{ x: 1000 }}
          />
        </Card>
      </Space>
    </AdminShell>
  );
}
