import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../common/auth/auth-user';
import { UserRoleValue } from '../../common/roles';
import { GeoService } from '../../infrastructure/redis/geo.service';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { RealtimeEvent } from '../../common/realtime-events';
import { SocketGateway } from '../../infrastructure/socket/socket.gateway';
import { OrderStatusValue } from '../order/order-status';
import { PaginationDto } from './dto/pagination.dto';
import { DriverStatus, DriverStatusValue } from './driver-status';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly socket: SocketGateway,
  ) {}

  async findAll(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const [drivers, total] = await Promise.all([
      this.prisma.driver.findMany({
        skip,
        take: limit,
        include: {
          user: true,
          vehicle: true,
          documents: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.driver.count(),
    ]);

    return {
      data: drivers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  findOnline() {
    return this.prisma.driver.findMany({
      where: { status: DriverStatusValue.ONLINE },
      include: { user: true, vehicle: true },
    });
  }

  async findRides(driverId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const [rides, total] = await Promise.all([
      this.prisma.ride.findMany({
        where: { driverId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ride.count({ where: { driverId } }),
    ]);

    return {
      data: rides,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateStatus(driverId: string, status: DriverStatus, user?: AuthUser) {
    await this.assertDriverAccess(driverId, user);

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: { status },
    });

    if (
      status === DriverStatusValue.OFFLINE ||
      status === DriverStatusValue.BLOCKED
    ) {
      await this.geo.removeDriverLocation(driverId);
    }

    this.socket.emitToAdmins(RealtimeEvent.DRIVER_UPDATED, driver);

    return driver;
  }

  async updateLocation(
    driverId: string,
    lat: number,
    lng: number,
    user?: AuthUser,
  ) {
    await this.assertDriverAccess(driverId, user);

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { status: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (
      driver.status !== DriverStatusValue.ONLINE &&
      driver.status !== DriverStatusValue.BUSY
    ) {
      throw new BadRequestException(
        'Driver must be ONLINE or BUSY to update location',
      );
    }

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

    const locationUpdate = {
      rideId: activeRide?.id,
      driverId,
      lat,
      lng,
    };

    this.socket.emitToAdmins(RealtimeEvent.DRIVER_UPDATED, locationUpdate);

    return locationUpdate;
  }

  private async assertDriverAccess(driverId: string, user?: AuthUser) {
    if (!user || user.role === UserRoleValue.ADMIN) {
      return;
    }

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { userId: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (driver.userId !== user.userId) {
      throw new ForbiddenException('Cannot access another driver');
    }
  }
}
