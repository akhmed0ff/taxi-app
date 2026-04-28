import { ClockCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { Button, Empty, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import { AdminOrder, formatSom, statusLabels } from '@/services/api';

interface ActiveOrdersTableProps {
  dataSource: AdminOrder[];
  loading?: boolean;
  onOpenDetails?: (orderId: string) => void;
}

const statusColors: Record<AdminOrder['status'], string> = {
  SEARCHING_DRIVER: 'gold',
  DRIVER_ASSIGNED: 'blue',
  DRIVER_ARRIVED: 'purple',
  IN_PROGRESS: 'green',
  COMPLETED: 'default',
  CANCELLED: 'red',
};

export function ActiveOrdersTable({
  dataSource,
  loading = false,
  onOpenDetails,
}: ActiveOrdersTableProps) {
  const columns: ColumnsType<AdminOrder> = [
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
      render: (status: AdminOrder['status']) => (
        <Tag color={statusColors[status]}>{statusLabels[status] ?? status}</Tag>
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
        <Space>
          <Button size="small" onClick={() => onOpenDetails?.(record.id)}>
            Детали
          </Button>
          <Link href={`/orders/${record.id}`}>Страница</Link>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      locale={{ emptyText: <Empty description="Нет активных поездок" /> }}
      pagination={false}
      rowKey="id"
      scroll={{ x: 900 }}
    />
  );
}
