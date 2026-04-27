import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const { passengerId, userId, driverId, orderId, rideId } =
      client.handshake.auth;

    const resolvedPassengerId = passengerId ?? userId;
    const resolvedOrderId = orderId ?? rideId;

    if (resolvedPassengerId) {
      void client.join(`passenger:${resolvedPassengerId}`);
    }

    if (driverId) {
      void client.join(`driver:${driverId}`);
    }

    if (resolvedOrderId) {
      void client.join(`order:${resolvedOrderId}`);
    }
  }

  @SubscribeMessage('order.join')
  joinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody('orderId') orderId: string,
  ) {
    void client.join(`order:${orderId}`);
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
}
