import { Card, Statistic } from 'antd';

interface MetricCardProps {
  title: string;
  value: number;
  suffix?: string;
  prefix?: string;
}

export function MetricCard({ title, value, suffix, prefix }: MetricCardProps) {
  return (
    <Card className="metric-card">
      <Statistic title={title} value={value} prefix={prefix} suffix={suffix} />
    </Card>
  );
}
