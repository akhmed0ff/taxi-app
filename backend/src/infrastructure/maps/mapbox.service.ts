import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MapboxPoint {
  lat: number;
  lng: number;
}

export interface MapboxRoute {
  distanceMeters: number;
  durationSeconds: number;
  geometry?: unknown;
}

@Injectable()
export class MapboxService {
  private readonly accessToken?: string;
  private readonly baseUrl = 'https://api.mapbox.com';

  constructor(config: ConfigService) {
    this.accessToken = config.get<string>('MAPBOX_ACCESS_TOKEN');
  }

  isConfigured() {
    return Boolean(
      this.accessToken &&
        !['replace_me', 'mapbox-token-for-backend-directions'].includes(
          this.accessToken,
        ),
    );
  }

  async geocode(address: string) {
    this.assertConfigured();
    const url = new URL(`/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`, this.baseUrl);
    url.searchParams.set('access_token', this.accessToken as string);
    url.searchParams.set('limit', '5');
    url.searchParams.set('country', 'uz');
    const data = await this.fetchMapbox<{ features: Array<{ center: [number, number]; place_name: string }> }>(url);

    return data.features.map((feature) => ({
      address: feature.place_name,
      lng: feature.center[0],
      lat: feature.center[1],
    }));
  }

  async reverseGeocode(lat: number, lng: number) {
    this.assertConfigured();
    const url = new URL(`/geocoding/v5/mapbox.places/${lng},${lat}.json`, this.baseUrl);
    url.searchParams.set('access_token', this.accessToken as string);
    url.searchParams.set('limit', '1');
    const data = await this.fetchMapbox<{ features: Array<{ place_name: string }> }>(url);

    return data.features[0]?.place_name;
  }

  async getRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ): Promise<MapboxRoute> {
    this.assertConfigured();
    const coordinates = `${originLng},${originLat};${destLng},${destLat}`;
    const url = new URL(`/directions/v5/mapbox/driving/${coordinates}`, this.baseUrl);
    url.searchParams.set('access_token', this.accessToken as string);
    url.searchParams.set('geometries', 'geojson');
    url.searchParams.set('overview', 'simplified');
    const data = await this.fetchMapbox<{
      routes: Array<{ distance: number; duration: number; geometry?: unknown }>;
    }>(url);
    const route = data.routes[0];

    if (!route) {
      throw new Error('Mapbox route not found');
    }

    return {
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      geometry: route.geometry,
    };
  }

  private assertConfigured() {
    if (!this.accessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN is not configured');
    }
  }

  private async fetchMapbox<T>(url: URL): Promise<T> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
