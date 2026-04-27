'use client';

import { SaveOutlined } from '@ant-design/icons';
import { Alert, Button, Card, InputNumber, Space, Switch, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { formatSom, tariffs as initialTariffs } from '@/data/mock';
import { fetchTariffs, saveTariff } from '@/services/api';

type Tariff = (typeof initialTariffs)[number];
type NumericTariffField = 'baseFare' | 'perKm' | 'perMinute' | 'surge';

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState(initialTariffs);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string>();
  const [error, setError] = useState<string>();
  const [api, contextHolder] = message.useMessage();

  useEffect(() => {
    let cancelled = false;

    async function loadTariffs() {
      setLoading(true);
      setError(undefined);

      try {
        const nextTariffs = await fetchTariffs();

        if (!cancelled) {
          setTariffs(nextTariffs.length > 0 ? nextTariffs : initialTariffs);
        }
      } catch (nextError) {
        if (!cancelled) {
          console.warn(nextError);
          setTariffs(initialTariffs);
          setError('Backend недоступен. Показаны fallback mock-данные.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTariffs();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleSaveTariff = async (tariff: Tariff) => {
    setSavingKey(tariff.key);

    try {
      const savedTariff = await saveTariff(tariff);
      setTariffs((current) =>
        current.map((currentTariff) =>
          currentTariff.key === tariff.key ? savedTariff : currentTariff,
        ),
      );
      setError(undefined);
      api.success(`Тариф "${savedTariff.name}" сохранен`);
    } catch (nextError) {
      console.warn(nextError);
      setError('Не удалось сохранить тариф в backend. Fallback-данные остались локально.');
      api.error('Не удалось сохранить тариф');
    } finally {
      setSavingKey(undefined);
    }
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
            loading={savingKey === record.key}
            onClick={() => void handleSaveTariff(record)}
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

        {error && <Alert message={error} type="warning" showIcon />}

        <Card>
          <Table
            columns={columns}
            dataSource={tariffs}
            loading={loading}
            pagination={false}
            rowKey="key"
            scroll={{ x: 1000 }}
          />
        </Card>
      </Space>
    </AdminShell>
  );
}
