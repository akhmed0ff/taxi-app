'use client';

import { Card, Col, Progress, Row, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AdminShell } from '@/components/AdminShell';
import { MetricCard } from '@/components/MetricCard';
import { analytics, formatSom, revenueByDay, tariffs } from '@/data/mock';

type RevenuePoint = (typeof revenueByDay)[number];

const maxRevenue = Math.max(...revenueByDay.map((item) => item.revenue));

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
  return (
    <AdminShell>
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Аналитика
          </Typography.Title>
          <Typography.Text type="secondary">
            Поездки, доход, конверсия и выплаты водителям.
          </Typography.Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="Поездки" value={analytics.tripsToday} />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="Доход" value={analytics.revenueToday} suffix="сум" />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="Средний чек" value={analytics.averageCheck} suffix="сум" />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard title="Отмены" value={analytics.cancelledTrips} />
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}>
            <Card title="Доход за неделю">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {revenueByDay.map((item) => (
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
            <Card title="Операционные показатели">
              <Space direction="vertical" size={18} style={{ width: '100%' }}>
                <div>
                  <Typography.Text>Завершенные поездки</Typography.Text>
                  <Progress percent={analytics.completionRate} />
                </div>
                <div>
                  <Typography.Text>Принятие заказов</Typography.Text>
                  <Progress percent={analytics.acceptanceRate} />
                </div>
                <div>
                  <Typography.Text>Выплаты водителям</Typography.Text>
                  <Progress
                    percent={Math.round((analytics.driverPayouts / analytics.revenueToday) * 100)}
                  />
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card title="Сводка по дням">
              <Table
                columns={columns}
                dataSource={revenueByDay}
                pagination={false}
                rowKey="day"
                size="middle"
              />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="Тарифы по спросу">
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
                dataSource={tariffs}
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
