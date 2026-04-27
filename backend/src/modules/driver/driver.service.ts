import { Injectable } from '@nestjs/common';
import { GeoService } from '../../infrastructure/redis/geo.service';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { RealtimeEvent } from '../../common/realtime-events';
import { SocketGateway } from '../../infrastructure/socket/socket.gateway';
import { OrderStatusValue } from '../order/order-status';
import { DriverStatus, DriverStatusValue } from './driver-status';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly socket: SocketGateway,
  ) {}

  findOnline() {
    return this.prisma.driver.findMany({
      where: { status: DriverStatusValue.ONLINE },
      include: { user: true, vehicle: true },
    });
  }

  updateStatus(driverId: string, status: DriverStatus) {
    return this.prisma.driver.update({
      where: { id: driverId },
      data: { status },
    });
  }

  async updateLocation(driverId: string, lat: number, lng: number) {
    await this.geo.updateDriverLocation(driverId, lat, lng);

    const activeRide = await this.prisma.ride.findFirst({
      where: {
        driverId,
        status: {
          in: [
            OrderStatusValue.DRIVER_ASSIGNED,
            OrderStatusValue.DRIVER_ARRIVED,
            OrderStatusValue.IN_PROGRESS,
          ],
        },
      },
      select: { id: true },
    });

    if (activeRide) {
      this.socket.emitToOrder(activeRide.id, RealtimeEvent.DRIVER_LOCATION, {
        rideId: activeRide.id,
        driverId,
        lat,
        lng,
        recordedAt: new Date().toISOString(),
      });
    }

    return {
      rideId: activeRide?.id,
      driverId,
      lat,
      lng,
    };
  }
}
