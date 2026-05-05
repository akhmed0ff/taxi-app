import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { OrderStatusValue } from '../order/order-status';

export type RideRating = 1 | 2 | 3 | 4 | 5;
export type RatingRaterRole = 'PASSENGER' | 'DRIVER';

@Injectable()
export class RatingService {
  constructor(private readonly prisma: PrismaService) {}

  async rateRide(
    rideId: string,
    raterId: string,
    rating: RideRating,
    raterRole: RatingRaterRole,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const ride = await tx.ride.findUnique({
          where: { id: rideId },
          include: {
            driver: {
              select: {
                id: true,
                userId: true,
              },
            },
          },
        });

        if (!ride) {
          throw new NotFoundException('Ride not found');
        }

        if (ride.status !== OrderStatusValue.COMPLETED) {
          throw new BadRequestException('Ride must be completed before rating');
        }

        if (raterRole === 'PASSENGER') {
          if (ride.customerId !== raterId) {
            throw new ForbiddenException('Cannot rate another passenger ride');
          }

          if (ride.passengerRating !== null) {
            return ride;
          }

          if (!ride.driverId) {
            throw new BadRequestException('Ride has no assigned driver');
          }

          const updatedRide = await tx.ride.update({
            where: { id: rideId },
            data: { passengerRating: rating },
            include: {
              driver: {
                select: {
                  id: true,
                  userId: true,
                },
              },
            },
          });

          const recentRatings = await tx.ride.findMany({
            where: {
              driverId: ride.driverId,
              status: OrderStatusValue.COMPLETED,
              passengerRating: { not: null },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: { passengerRating: true },
          });

          const averageRating =
            recentRatings.reduce(
              (sum, item) => sum + (item.passengerRating ?? 0),
              0,
            ) / recentRatings.length;

          await tx.driver.update({
            where: { id: ride.driverId },
            data: { rating: roundRating(averageRating) },
          });

          return updatedRide;
        }

        if (!ride.driver || ride.driver.userId !== raterId) {
          throw new ForbiddenException('Cannot rate another driver ride');
        }

        if (ride.driverRating !== null) {
          return ride;
        }

        return tx.ride.update({
          where: { id: rideId },
          data: { driverRating: rating },
          include: {
            driver: {
              select: {
                id: true,
                userId: true,
              },
            },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

function roundRating(value: number) {
  return Math.round(value * 10) / 10;
}
