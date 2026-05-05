import { Injectable } from '@nestjs/common';
import { NearbyRedisDriver, RedisService } from './redis.service';

export interface NearbyDriver {
  driverId: string;
  distanceMeters: number;
}

@Injectable()
export class GeoService {
  constructor(private readonly redis: RedisService) {}

  async updateDriverLocation(driverId: string, lat: number, lng: number) {
    return this.redis.updateDriverLocation(driverId, lat, lng);
  }

  async removeDriverLocation(driverId: string) {
    return this.redis.setDriverOffline(driverId);
  }

  async getDriverLocation(driverId: string) {
    return this.redis.getDriverLocation(driverId);
  }

  async findNearbyDrivers(
    lat: number,
    lng: number,
    radiusKm = 5,
    limit = 10,
  ): Promise<NearbyDriver[]> {
    return this.redis.findNearbyDrivers(
      lat,
      lng,
      radiusKm,
      limit,
    ) as Promise<NearbyRedisDriver[]>;
  }
}
