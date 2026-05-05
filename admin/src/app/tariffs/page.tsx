'use client';

/**
 * TODO(admin UI): создание нового тарифа с нуля, валидация уникальности tariffClass,
 * массовое включение/выключение, превью как в пассажирском приложении.
 * Сейчас: правка существующих строк из БД (после migrate + prisma db seed при пустой таблице).
 */

import { SaveOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Input,
  InputNumber,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { AdminTariff, fetchTariffs, formatSom, saveTariff } from '@/services/api';

type NumericTariffField =
  | 'baseFare'
  | 'perKm'
  | 'perMinute'
  | 'minimumFare'
  | 'freeWaitingMinutes'
  | 'stopPerMinute'
  | 'surge'
  | 'sortOrder'
  | 'etaMinutes'
  | 'seats'
  | 'pricePer100m';

type TariffEditableField = NumericTariffField | 'active' | 'title';

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState<AdminTariff[]>([]);
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
          setTariffs(nextTariffs);
        }
      } catch (nextError) {
        if (!cancelled) {
          console.warn(nextError);
          setTariffs([]);
          setError('Backend API недоступен. Mock fallback отключён.');
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
    field: TariffEditableField,
    value: number | boolean | string | null,
  ) => {
    if (value === null && field !== 'pricePer100m') {
      return;
    }

    setTariffs((current) =>
      current.map((tariff) => (tariff.key === key ? { ...tariff, [field]: value } : tariff)),
    );
  };

  const handleSaveTariff = async (tariff: AdminTariff) => {
    setSavingKey(tariff.key);

    try {
      const savedTariff = await saveTariff(tariff);
      setTariffs((current) =>
        current.map((currentTariff) =>
          currentTariff.key === tariff.key ? savedTariff : currentTariff,
        ),
      );
      setError(undefined);
      api.success(`Тариф "${savedTariff.name}" сохранён`);
    } catch (nextError) {
      console.warn(nextError);
      setError('Не удалось сохранить тариф в backend.');
      api.error('Не удалось сохранить тариф');
    } finally {
      setSavingKey(undefined);
    }
  };

  const columns = useMemo<ColumnsType<AdminTariff>>(
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
        title: 'Название (приложение)',
        dataIndex: 'title',
        render: (value: string, record) => (
          <Input
            value={value}
            onChange={(e) => updateTariff(record.key, 'title', e.target.value)}
          />
        ),
      },
      {
        title: 'Порядок',
        dataIndex: 'sortOrder',
        width: 100,
        render: (value: number, record) => (
          <InputNumber
            min={0}
            step={1}
            value={value}
            onChange={(nextValue) => updateTariff(record.key, 'sortOrder', nextValue)}
          />
        ),
      },
      {
        title: 'ETA (мин)',
        dataIndex: 'etaMinutes',
        width: 110,
        render: (value: number, record) => (
          <InputNumber
            min={1}
            step={1}
            value={value}
            onChange={(nextValue) => updateTariff(record.key, 'etaMinutes', nextValue)}
          />
        ),
      },
      {
        title: 'Мест',
        dataIndex: 'seats',
        width: 90,
        render: (value: number, record) => (
          <InputNumber
            min={1}
            max={8}
            step={1}
            value={value}
            onChange={(nextValue) => updateTariff(record.key, 'seats', nextValue)}
          />
        ),
      },
      {
        title: 'Цена / 100 м',
        dataIndex: 'pricePer100m',
        width: 120,
        render: (value: number | null | undefined, record) => (
          <InputNumber
            min={0}
            step={50}
            value={value ?? undefined}
            onChange={(nextValue) => updateTariff(record.key, 'pricePer100m', nextValue ?? null)}
          />
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
        title: 'Мин. заказ',
        dataIndex: 'minimumFare',
        width: 120,
        render: (value: number, record) => (
          <InputNumber
            min={0}
            step={500}
            value={value}
            onChange={(nextValue) => updateTariff(record.key, 'minimumFare', nextValue)}
          />
        ),
      },
      {
        title: 'Беспл. ожид. (мин)',
        dataIndex: 'freeWaitingMinutes',
        width: 130,
        render: (value: number, record) => (
          <InputNumber
            min={0}
            step={1}
            value={value}
            onChange={(nextValue) =>
              updateTariff(record.key, 'freeWaitingMinutes', nextValue)
            }
          />
        ),
      },
      {
        title: 'Ожидание / мин',
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
        title: 'Остановки / мин',
        dataIndex: 'stopPerMinute',
        width: 130,
        render: (value: number, record) => (
          <InputNumber
            min={0}
            step={50}
            value={value}
            onChange={(nextValue) => updateTariff(record.key, 'stopPerMinute', nextValue)}
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
            Настройка подачи, километража и ожидания для ANGREN TAXI.
          </Typography.Text>
        </div>

        {error && <Alert message={error} type="error" showIcon />}

        {!loading && tariffs.length === 0 && !error ? (
          <Alert
            message="В базе нет тарифов"
            description="Из каталога backend выполните: npx prisma db seed (данные не перезаписывают существующие строки)."
            type="info"
            showIcon
          />
        ) : null}

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
