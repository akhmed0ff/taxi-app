'use client';

import { Alert, Card, Col, Progress, Row, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { MetricCard } from '@/components/MetricCard';
import {
  AdminAnalyticsSummary,
  fetchAdminAnalytics,
  formatSom,
} from '@/services/api';

type RevenuePoint = AdminAnalyticsSummary['revenueByDay'][number];

const emptySummary: AdminAnalyticsSummary = {
  tripsToday: 0,
  revenueToday: 0,
  activeDrivers: 0,
  completionRate: 0,
  acceptanceRate: 0,
  averageCheck: 0,
  cancelledTrips: 0,
  driverPayouts: 0,
  revenueByDay: [],
  tariffs: [],
};

const columns: ColumnsType<RevenuePoint> = [
  { title: 'День', dataIndex: 'day' },
  { title: 'Поездки', dataIndex: 'trips', align: 'right' },
  {
    title: 'Доход',
    dataIndex: 'revenue',
    align: 'right',
    render: (revenue: number) => formatSom(revenue),
  },
];

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AdminAnalyticsSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const maxRevenue = useMemo(
    () => Math.max(1, ...summary.revenueByDay.map((item) => item.revenue)),
    [summary.revenueByDay],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setLoading(true);
      setError(undefined);

      try {
        const nextSummary = await fetchAdminAnalytics();

        if (!cancelled) {
          setSummary(nextSummary);
        }
      } catch (nextError) {
        if (!cancelled) {
          console.warn(nextError);
          setSummary(emptySummary);
          setError('Backend API недоступен. Mock fallback отключён.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminShell>
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Аналитика
          </Typography.Title>
          <Typography.Text type="secondary">
            Базовые операционные метрики из backend API.
          </Typography.Text>
        </div>

        {error && <Alert message={error} type="error" showIcon />}

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="Активные поездки" value={summary.tripsToday} />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="Активный доход" value={summary.revenueToday} suffix="сум" />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="Средний чек" value={summary.averageCheck} suffix="сум" />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="Водители онлайн" value={summary.activeDrivers} />
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}>
            <Card loading={loading} title="Доход по доступным данным">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {summary.revenueByDay.map((item) => (
                  <div className="chart-row" key={item.day}>
                    <Typography.Text className="chart-label">{item.day}</Typography.Text>
                    <div className="chart-track">
                      <div
                        className="chart-bar"
                        style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                    <Typography.Text strong>{formatSom(item.revenue)}</Typography.Text>
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
          <Col xs={24} xl={10}>
            <Card loading={loading} title="Операционные показатели">
              <Space direction="vertical" size={18} style={{ width: '100%' }}>
                <div>
                  <Typography.Text>Поездки в процессе</Typography.Text>
                  <Progress percent={summary.completionRate} />
                </div>
                <div>
                  <Typography.Text>Назначенные заказы</Typography.Text>
                  <Progress percent={summary.acceptanceRate} />
                </div>
                <div>
                  <Typography.Text>Оценка выплат водителям</Typography.Text>
                  <Progress
                    percent={
                      summary.revenueToday > 0
                        ? Math.round((summary.driverPayouts / summary.revenueToday) * 100)
                        : 0
                    }
                  />
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card title="Сводка">
              <Table
                columns={columns}
                dataSource={summary.revenueByDay}
                loading={loading}
                pagination={false}
                rowKey="day"
                size="middle"
              />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="Тарифы">
              <Table
                columns={[
                  { title: 'Тариф', dataIndex: 'name' },
                  { title: 'Коэффициент', dataIndex: 'surge', align: 'right' },
                  {
                    title: 'Подача',
                    dataIndex: 'baseFare',
                    align: 'right',
                    render: (value: number) => formatSom(value),
                  },
                ]}
                dataSource={summary.tariffs}
                loading={loading}
                pagination={false}
                rowKey="key"
                size="middle"
              />
            </Card>
          </Col>
        </Row>
      </Space>
    </AdminShell>
  );
}
