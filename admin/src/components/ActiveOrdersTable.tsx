import { ClockCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { Button, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { activeOrders, formatSom, statusLabels } from '@/data/mock';

type ActiveOrder = (typeof activeOrders)[number];

interface ActiveOrdersTableProps {
  dataSource?: ActiveOrder[];
  loading?: boolean;
  onOpenDetails?: (orderId: string) => void;
}

const statusColors: Record<ActiveOrder['status'], string> = {
  SEARCHING_DRIVER: 'gold',
  DRIVER_ASSIGNED: 'blue',
  DRIVER_ARRIVED: 'purple',
  IN_PROGRESS: 'green',
};

export function ActiveOrdersTable({
  dataSource = activeOrders,
  loading = false,
  onOpenDetails,
}: ActiveOrdersTableProps) {
  const columns: ColumnsType<ActiveOrder> = [
    {
      title: 'Заказ',
      dataIndex: 'id',
      render: (id: string, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{id}</Typography.Text>
          <Typography.Text type="secondary">
            <ClockCircleOutlined /> {record.createdAt}
          </Typography.Text>
        </Space>
      ),
    },
    { title: 'Пассажир', dataIndex: 'passenger' },
    { title: 'Водитель', dataIndex: 'driver' },
    {
      title: 'Маршрут',
      dataIndex: 'route',
      render: (_: string, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>
            <EnvironmentOutlined /> {record.pickup}
          </Typography.Text>
          <Typography.Text type="secondary">{record.destination}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      render: (status: ActiveOrder['status']) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    { title: 'ETA', dataIndex: 'eta' },
    {
      title: 'Цена',
      dataIndex: 'fare',
      align: 'right',
      render: (fare: number) => formatSom(fare),
    },
    {
      title: '',
      key: 'details',
      render: (_, record) => (
        <Button size="small" onClick={() => onOpenDetails?.(record.id)}>
          Детали
        </Button>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      pagination={false}
      rowKey="id"
      scroll={{ x: 900 }}
    />
  );
}
