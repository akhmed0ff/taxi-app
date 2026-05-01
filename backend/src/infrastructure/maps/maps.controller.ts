import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { MapboxService } from './mapbox.service';

@Controller('maps')
export class MapsController {
  constructor(private readonly mapbox: MapboxService) {}

  @Get('search')
  async search(@Query('q') q?: string) {
    const normalizedQuery = q?.trim();

    if (!normalizedQuery) {
      throw new BadRequestException('q is required');
    }

    return this.mapbox.geocode(normalizedQuery);
  }

  @Get('reverse')
  async reverse(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const point = this.parsePoint('point', lat, lng);
    return this.mapbox.reverseGeocode(point.lat, point.lng);
  }

  @Get('route')
  async getRoute(
    @Query('pickupLng') pickupLng: string,
    @Query('pickupLat') pickupLat: string,
    @Query('destinationLng') destinationLng: string,
    @Query('destinationLat') destinationLat: string,
  ) {
    const pickup = this.parsePoint('pickup', pickupLat, pickupLng);
    const destination = this.parsePoint(
      'destination',
      destinationLat,
      destinationLng,
    );
    const route = await this.mapbox.getRoute(
      pickup.lat,
      pickup.lng,
      destination.lat,
      destination.lng,
    );

    return {
      geometry: route.geometry,
      distance: route.distanceMeters,
      duration: route.durationSeconds,
    };
  }

  private parsePoint(name: string, lat?: string, lng?: string) {
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      throw new BadRequestException(`${name} coordinates are required`);
    }

    return {
      lat: parsedLat,
      lng: parsedLng,
    };
  }
}
