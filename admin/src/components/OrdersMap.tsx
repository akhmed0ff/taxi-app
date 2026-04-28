import { CarFilled, EnvironmentFilled } from '@ant-design/icons';
import { Card, Empty, Space, Tag, Typography } from 'antd';
import { AdminDriver, AdminOrder, statusLabels } from '@/services/api';

interface OrdersMapProps {
  orders: AdminOrder[];
  driverList: AdminDriver[];
  loading?: boolean;
}

const driverStatusColor: Record<AdminDriver['status'], string> = {
  ONLINE: 'green',
  BUSY: 'blue',
  OFFLINE: 'default',
};

export function OrdersMap({
  orders,
  driverList,
  loading = false,
}: OrdersMapProps) {
  return (
    <Card
      loading={loading}
      title="Карта заказов"
      extra={
        <Space size={8} wrap>
          <Tag color="green">
            ONLINE: {driverList.filter((driver) => driver.status === 'ONLINE').length}
          </Tag>
          <Tag color="blue">
            BUSY: {driverList.filter((driver) => driver.status === 'BUSY').length}
          </Tag>
          <Tag color="gold">Заказы: {orders.length}</Tag>
        </Space>
      }
    >
      <div className="map-panel" aria-label="Карта активных заказов">
        <div className="map-road" />
        <div className="map-road secondary" />
        <div className="map-road vertical" />
        <Typography.Text strong className="map-label">
          Ангрен, live
        </Typography.Text>

        {driverList.length === 0 && orders.length === 0 && (
          <div className="map-empty">
            <Empty description="Нет live-данных" />
          </div>
        )}

        {driverList.map((driver) => (
          <div
            className={`map-marker driver-marker ${driver.status.toLowerCase()}`}
            key={driver.id}
            style={{ left: `${driver.lng}%`, top: `${driver.lat}%` }}
            title={`${driver.name}: ${driver.status}`}
          >
            <CarFilled />
          </div>
        ))}
        {orders.map((order) => (
          <div
            className="map-marker order-marker"
            key={order.id}
            style={{ left: `${order.lng}%`, top: `${order.lat}%` }}
            title={`${order.id}: ${statusLabels[order.status] ?? order.status}`}
          >
            <EnvironmentFilled />
          </div>
        ))}
      </div>
      <Space size={8} wrap style={{ marginTop: 12 }}>
        {driverList.map((driver) => (
          <Tag color={driverStatusColor[driver.status]} key={driver.id}>
            {driver.name}: {driver.status}
          </Tag>
        ))}
      </Space>
    </Card>
  );
}
