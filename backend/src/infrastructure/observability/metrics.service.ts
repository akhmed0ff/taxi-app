import { Injectable } from '@nestjs/common';

interface HttpMetric {
  count: number;
  totalDurationMs: number;
}

@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private readonly httpMetrics = new Map<string, HttpMetric>();

  recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number) {
    const key = `${method} ${route} ${statusCode}`;
    const current = this.httpMetrics.get(key) ?? { count: 0, totalDurationMs: 0 };

    current.count += 1;
    current.totalDurationMs += durationMs;
    this.httpMetrics.set(key, current);
  }

  renderPrometheus() {
    const lines = [
      '# HELP taxi_backend_uptime_seconds Process uptime in seconds.',
      '# TYPE taxi_backend_uptime_seconds gauge',
      `taxi_backend_uptime_seconds ${Math.round((Date.now() - this.startedAt) / 1000)}`,
      '# HELP taxi_http_requests_total Total HTTP requests.',
      '# TYPE taxi_http_requests_total counter',
    ];

    for (const [key, metric] of this.httpMetrics) {
      const [method, route, statusCode] = key.split(' ');
      const labels = `method="${method}",route="${route}",status="${statusCode}"`;
      lines.push(`taxi_http_requests_total{${labels}} ${metric.count}`);
      lines.push(
        `taxi_http_request_duration_ms_sum{${labels}} ${Math.round(metric.totalDurationMs)}`,
      );
    }

    return `${lines.join('\n')}\n`;
  }
}
