import { Module } from '@nestjs/common';
import { GeoService } from './geo.service';
import { RedisService } from './redis.service';

@Module({
  providers: [GeoService, RedisService],
  exports: [GeoService, RedisService],
})
export class RedisModule {}
