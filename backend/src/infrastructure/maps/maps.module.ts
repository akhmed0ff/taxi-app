import { Module } from '@nestjs/common';
import { MapsController } from './maps.controller';
import { MapboxService } from './mapbox.service';

@Module({
  controllers: [MapsController],
  providers: [MapboxService],
  exports: [MapboxService],
})
export class MapsModule {}
