import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

export interface NearbyRedisDriver {
  driverId: string;
  distanceMeters: number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;
  private readonly driversGeoKey: string;
  private readonly driverStatusKeyPrefix: string;
  private readonly rideOfferKeyPrefix: string;
  private readonly rideLockKeyPrefix: string;

  constructor(config: ConfigService) {
    this.client = new Redis(createRedisOptions(config));
    this.driversGeoKey = config.get<string>('REDIS_DRIVERS_GEO_KEY', 'drivers:geo');
    this.driverStatusKeyPrefix = config.get<string>(
      'REDIS_DRIVER_STATUS_KEY_PREFIX',
      'driver:status',
    );
    this.rideOfferKeyPrefix = config.get<string>(
      'REDIS_RIDE_OFFER_KEY_PREFIX',
      'ride:offer',
    );
    this.rideLockKeyPrefix = config.get<string>(
      'REDIS_RIDE_LOCK_KEY_PREFIX',
      'ride:lock',
    );
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async ping() {
    return this.client.ping();
  }

  async setDriverOnline(driverId: string, lat: number, lng: number) {
    this.logger.log(
      `Redis driver online driver=${driverId} lat=${lat.toFixed(6)} lng=${lng.toFixed(6)}`,
    );
    const pipeline = this.client.pipeline();
    pipeline.set(this.driverStatusKey(driverId), 'ONLINE', 'EX', 60);
    pipeline.geoadd(this.driversGeoKey, lng, lat, driverId);
    await pipeline.exec();
  }

  async setDriverOffline(driverId: string) {
    this.logger.log(`Redis driver offline driver=${driverId}`);
    const pipeline = this.client.pipeline();
    pipeline.del(this.driverStatusKey(driverId));
    pipeline.zrem(this.driversGeoKey, driverId);
    await pipeline.exec();
  }

  async updateDriverLocation(driverId: string, lat: number, lng: number) {
    this.logger.log(
      `Redis GEO add driver=${driverId} lat=${lat.toFixed(6)} lng=${lng.toFixed(6)}`,
    );
    const currentStatus = await this.client.get(this.driverStatusKey(driverId));
    const pipeline = this.client.pipeline();
    pipeline.set(
      this.driverStatusKey(driverId),
      currentStatus ?? 'ONLINE',
      'EX',
      60,
    );
    pipeline.geoadd(this.driversGeoKey, lng, lat, driverId);
    const result = await pipeline.exec();
    this.logger.log(`Redis GEO add result driver=${driverId}`);
    return result;
  }

  async findNearbyDrivers(
    lat: number,
    lng: number,
    radiusKm = 5,
    limit = 10,
  ): Promise<NearbyRedisDriver[]> {
    this.logger.log(
      `Redis GEO search lat=${lat.toFixed(6)} lng=${lng.toFixed(6)} radiusKm=${radiusKm} limit=${limit}`,
    );
    const results = await this.client.geosearch(
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

  async createRideOffer(rideId: string, driverId: string, ttlSeconds = 10) {
    const key = this.rideOfferKey(rideId, driverId);
    this.logger.log(
      `Redis ride offer create ride=${rideId} driver=${driverId} ttl=${ttlSeconds}s`,
    );
    await this.client.set(key, 'PENDING', 'EX', ttlSeconds);
    return { key, ttlSeconds };
  }

  async rejectRideOffer(rideId: string, driverId: string) {
    const key = this.rideOfferKey(rideId, driverId);
    this.logger.log(`Redis ride offer reject ride=${rideId} driver=${driverId}`);
    await this.client.del(key);
    return { key };
  }

  async acceptRideWithLock(rideId: string, driverId: string) {
    const key = this.rideLockKey(rideId);
    const result = await this.client.set(key, driverId, 'EX', 30, 'NX');
    const accepted = result === 'OK';
    this.logger.log(
      `Redis ride lock ride=${rideId} driver=${driverId} accepted=${accepted}`,
    );
    return accepted;
  }

  private driverStatusKey(driverId: string) {
    return `${this.driverStatusKeyPrefix}:${driverId}`;
  }

  private rideOfferKey(rideId: string, driverId: string) {
    return `${this.rideOfferKeyPrefix}:${rideId}:${driverId}`;
  }

  private rideLockKey(rideId: string) {
    return `${this.rideLockKeyPrefix}:${rideId}`;
  }
}

export function createRedisOptions(config: ConfigService): RedisOptions {
  const redisUrl = config.get<string>('REDIS_URL');

  if (redisUrl) {
    const parsedUrl = new URL(redisUrl);
    return {
      host: parsedUrl.hostname,
      port: Number(parsedUrl.port || 6379),
      username: parsedUrl.username || undefined,
      password: parsedUrl.password
        ? decodeURIComponent(parsedUrl.password)
        : undefined,
      db: parsedUrl.pathname ? Number(parsedUrl.pathname.slice(1) || 0) : 0,
      tls: parsedUrl.protocol === 'rediss:' ? {} : undefined,
      maxRetriesPerRequest: null,
    };
  }

  return {
    host: config.get<string>('REDIS_HOST', 'localhost'),
    port: config.get<number>('REDIS_PORT', 6379),
    maxRetriesPerRequest: null,
  };
}
