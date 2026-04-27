import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../roles';

interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

interface AuthenticatedRequest {
  headers: { authorization?: string };
  user?: { userId: string; role: UserRole };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      request.user = {
        userId: payload.sub,
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private extractBearerToken(header?: string) {
    if (!header?.startsWith('Bearer ')) {
      return undefined;
    }

    return header.slice('Bearer '.length);
  }
}
