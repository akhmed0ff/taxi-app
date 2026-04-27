import { Module } from '@nestjs/common';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { SocketModule } from '../../infrastructure/socket/socket.module';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';

@Module({
  imports: [RedisModule, SocketModule],
  controllers: [DriverController],
  providers: [DriverService],
  exports: [DriverService],
})
export class DriverModule {}
