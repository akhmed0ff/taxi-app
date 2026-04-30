import { Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserRole, UserRoleValue } from '../../common/roles';
import { PrismaService } from '../db/prisma.service';
import { RedisService } from '../redis/redis.service';

interface AccessTokenPayload {
  sub: string;
  userId?: string;
  role: UserRole;
}

interface AuthenticatedSocketData {
  userId: string;
  role: UserRole;
  driverId?: string;
}

type AuthenticatedSocket = Socket & { data: AuthenticatedSocketData };

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    const accessToken = this.extractAccessToken(client);

    if (!accessToken) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(accessToken);
      const userId = payload.userId ?? payload.sub;
      client.data.userId = userId;
      client.data.role = payload.role;

      void client.join(`user:${userId}`);

      if (payload.role === UserRoleValue.PASSENGER) {
        void client.join(`passenger:${userId}`);
      }

      if (payload.role === UserRoleValue.ADMIN) {
        void client.join('admin');
      }

      if (payload.role === UserRoleValue.DRIVER) {
        const driver = await this.prisma.driver.findUnique({
          where: { userId },
          select: { id: true },
        });

        if (!driver) {
          client.disconnect(true);
          return;
        }

        client.data.driverId = driver.id;
        void client.join(`driver:${driver.id}`);
      }
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('order.join')
  async joinOrder(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody('orderId') orderId: string,
  ) {
    const canJoin = await this.canJoinOrder(client, orderId);

    if (!canJoin) {
      return { ok: false };
    }

    void client.join(`order:${orderId}`);
    return { ok: true };
  }

  @SubscribeMessage('passenger.join')
  joinPassenger(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody('passengerId') passengerId: string,
  ) {
    if (
      client.data.role !== UserRoleValue.PASSENGER ||
      client.data.userId !== passengerId
    ) {
      return { ok: false };
    }

    void client.join(`passenger:${passengerId}`);
    return { ok: true };
  }

  @SubscribeMessage('driver.join')
  joinDriver(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody('driverId') driverId: string,
  ) {
    if (
      client.data.role !== UserRoleValue.DRIVER ||
      client.data.driverId !== driverId
    ) {
      return { ok: false };
    }

    void client.join(`driver:${driverId}`);
    return { ok: true };
  }

  @SubscribeMessage('driver.status')
  updateDriverSocketStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody('driverId') driverId: string,
    @MessageBody('status') status: string,
  ) {
    if (
      client.data.role !== UserRoleValue.DRIVER ||
      client.data.driverId !== driverId
    ) {
      return { ok: false };
    }

    this.emitToAdmins('DRIVER_SOCKET_STATUS', {
      driverId,
      status,
      socketId: client.id,
    });

    return { ok: true };
  }

  @SubscribeMessage('ride.reject')
  async rejectRideOffer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody('rideId') rideId: string,
    @MessageBody('driverId') driverId: string,
  ) {
    if (
      client.data.role !== UserRoleValue.DRIVER ||
      client.data.driverId !== driverId
    ) {
      return { ok: false };
    }

    await this.redis?.rejectRideOffer(rideId, driverId);
    return { ok: true };
  }

  emitToPassenger(passengerId: string, event: string, payload: unknown) {
    this.server.to(`passenger:${passengerId}`).emit(event, payload);
  }

  emitToDriver(driverId: string, event: string, payload: unknown) {
    this.server.to(`driver:${driverId}`).emit(event, payload);
  }

  emitToOrder(orderId: string, event: string, payload: unknown) {
    this.server.to(`order:${orderId}`).emit(event, payload);
  }

  emitToAdmins(event: string, payload: unknown) {
    this.server.to('admin').emit(event, payload);
  }

  private extractAccessToken(client: Socket) {
    const authToken = client.handshake.auth?.accessToken;

    if (typeof authToken === 'string') {
      return authToken;
    }

    return undefined;
  }

  private async canJoinOrder(client: AuthenticatedSocket, orderId: string) {
    if (!client.data.userId || !client.data.role) {
      return false;
    }

    if (client.data.role === UserRoleValue.ADMIN) {
      return true;
    }

    const ride = await this.prisma.ride.findUnique({
      where: { id: orderId },
      select: { customerId: true, driverId: true },
    });

    if (!ride) {
      return false;
    }

    if (client.data.role === UserRoleValue.PASSENGER) {
      return ride.customerId === client.data.userId;
    }

    if (client.data.role === UserRoleValue.DRIVER) {
      return ride.driverId === client.data.driverId;
    }

    return false;
  }
}
