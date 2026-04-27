import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

export interface NearbyDriver {
  driverId: string;
  distanceMeters: number;
}

@Injectable()
export class GeoService {
  private readonly driversGeoKey = 'drivers';

  constructor(private readonly redis: RedisService) {}

  updateDriverLocation(driverId: string, lat: number, lng: number) {
    return this.redis.client.geoadd(this.driversGeoKey, lng, lat, driverId);
  }

  removeDriverLocation(driverId: string) {
    return this.redis.client.zrem(this.driversGeoKey, driverId);
  }

  async findNearbyDrivers(
    lat: number,
    lng: number,
    radiusKm = 5,
    limit = 10,
  ): Promise<NearbyDriver[]> {
    const results = await this.redis.client.geosearch(
      this.driversGeoKey,
      'FROMLONLAT',
      lng,
      lat,
      'BYRADIUS',
      radiusKm,
      'km',
      'WITHDIST',
      'ASC',
      'COUNT',
      limit,
    );

    return results.map((entry) => {
      const [driverId, distanceKm] = entry as [string, string];
      return {
        driverId,
        distanceMeters: Math.round(Number(distanceKm) * 1000),
      };
    });
  }
}
