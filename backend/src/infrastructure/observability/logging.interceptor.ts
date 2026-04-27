import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { MetricsService } from './metrics.service';

interface HttpRequest {
  method: string;
  originalUrl?: string;
  url: string;
}

interface HttpResponse {
  statusCode: number;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<HttpRequest>();
    const response = context.switchToHttp().getResponse<HttpResponse>();
    const startedAt = Date.now();
    const route = sanitizeRoute(request.originalUrl ?? request.url);

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        this.metrics.recordHttpRequest(
          request.method,
          route,
          response.statusCode,
          durationMs,
        );
        this.logger.log(
          `${request.method} ${route} ${response.statusCode} ${durationMs}ms`,
        );
      }),
      catchError((error: Error & { status?: number }) => {
        const durationMs = Date.now() - startedAt;
        const statusCode = error.status ?? 500;
        this.metrics.recordHttpRequest(request.method, route, statusCode, durationMs);
        this.logger.error(`${request.method} ${route} ${statusCode} ${durationMs}ms`);
        return throwError(() => error);
      }),
    );
  }
}

function sanitizeRoute(url: string) {
  return url.split('?')[0] || '/';
}
