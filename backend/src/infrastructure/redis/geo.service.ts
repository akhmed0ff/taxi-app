import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

export interface NearbyDriver {
  driverId: string;
  distanceMeters: number;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly driversGeoKey = 'drivers';

  constructor(private readonly redis: RedisService) {}

  async updateDriverLocation(driverId: string, lat: number, lng: number) {
    this.logger.log(
      `Redis GEO add driver=${driverId} lat=${lat.toFixed(6)} lng=${lng.toFixed(6)}`,
    );
    const result = await this.redis.client.geoadd(
      this.driversGeoKey,
      lng,
      lat,
      driverId,
    );
    this.logger.log(`Redis GEO add result driver=${driverId} updated=${result}`);
    return result;
  }

  async removeDriverLocation(driverId: string) {
    this.logger.log(`Redis GEO remove driver=${driverId}`);
    const result = await this.redis.client.zrem(this.driversGeoKey, driverId);
    this.logger.log(`Redis GEO remove result driver=${driverId} removed=${result}`);
    return result;
  }

  async findNearbyDrivers(
    lat: number,
    lng: number,
    radiusKm = 5,
    limit = 10,
  ): Promise<NearbyDriver[]> {
    this.logger.log(
      `Redis GEO search lat=${lat.toFixed(6)} lng=${lng.toFixed(6)} radiusKm=${radiusKm} limit=${limit}`,
    );

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

    const drivers = results.map((entry) => {
      const [driverId, distanceKm] = entry as [string, string];
      return {
        driverId,
        distanceMeters: Math.round(Number(distanceKm) * 1000),
      };
    });

    this.logger.log(
      `Redis GEO search result count=${drivers.length} drivers=${drivers
        .map((driver) => `${driver.driverId}:${driver.distanceMeters}m`)
        .join(',')}`,
    );

    return drivers;
  }
}
