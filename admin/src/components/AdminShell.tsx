'use client';

import {
  BarChartOutlined,
  CarOutlined,
  DashboardOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { Badge, Layout, Menu, Space, Typography } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const { Header, Content, Sider } = Layout;

const menuItems = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: <Link href="/">Мониторинг</Link>,
  },
  {
    key: '/drivers',
    icon: <CarOutlined />,
    label: <Link href="/drivers">Водители</Link>,
  },
  {
    key: '/tariffs',
    icon: <DollarOutlined />,
    label: <Link href="/tariffs">Тарифы</Link>,
  },
  {
    key: '/analytics',
    icon: <BarChartOutlined />,
    label: <Link href="/analytics">Аналитика</Link>,
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <Layout>
      <Sider width={248} theme="light" breakpoint="lg" collapsedWidth={72}>
        <div className="brand-block">
          <Typography.Title level={4} style={{ margin: 0 }}>
            ANGREN TAXI
          </Typography.Title>
          <Typography.Text type="secondary">Диспетчерская</Typography.Text>
        </div>
        <Menu
          items={menuItems}
          mode="inline"
          selectedKeys={[pathname]}
          style={{ borderInlineEnd: 0 }}
        />
      </Sider>
      <Layout>
        <Header className="topbar">
          <Space size={18} wrap>
            <Typography.Text strong>Операционная панель</Typography.Text>
            <Badge status="processing" text="Смена активна" />
          </Space>
        </Header>
        <Content className="page-content">{children}</Content>
      </Layout>
    </Layout>
  );
}
