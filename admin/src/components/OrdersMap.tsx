import { CarFilled, EnvironmentFilled } from '@ant-design/icons';
import { Card, Space, Tag, Typography } from 'antd';
import { activeOrders, drivers, statusLabels } from '@/data/mock';

export function OrdersMap() {
  return (
    <Card
      title="Карта заказов"
      extra={
        <Space size={8} wrap>
          <Tag color="blue">Водители: {drivers.filter((driver) => driver.status !== 'OFFLINE').length}</Tag>
          <Tag color="gold">Заказы: {activeOrders.length}</Tag>
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
        {drivers.map((driver) => (
          <div
            className={`map-marker driver-marker ${driver.status.toLowerCase()}`}
            key={driver.id}
            style={{ left: `${driver.lng}%`, top: `${driver.lat}%` }}
            title={`${driver.name}: ${driver.status}`}
          >
            <CarFilled />
          </div>
        ))}
        {activeOrders.map((order) => (
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
