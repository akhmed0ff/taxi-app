import { CarFilled, EnvironmentFilled } from '@ant-design/icons';
import { Card, Space, Tag, Typography } from 'antd';
import { activeOrders, drivers, statusLabels } from '@/data/mock';

interface OrdersMapProps {
  orders?: typeof activeOrders;
  driverList?: typeof drivers;
  loading?: boolean;
}

export function OrdersMap({
  orders = activeOrders,
  driverList = drivers,
  loading = false,
}: OrdersMapProps) {
  return (
    <Card
      loading={loading}
      title="Карта заказов"
      extra={
        <Space size={8} wrap>
          <Tag color="blue">
            Водители: {driverList.filter((driver) => driver.status !== 'OFFLINE').length}
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
            title={`${order.id}: ${statusLabels[order.status]}`}
          >
            <EnvironmentFilled />
          </div>
        ))}
      </div>
    </Card>
  );
}
