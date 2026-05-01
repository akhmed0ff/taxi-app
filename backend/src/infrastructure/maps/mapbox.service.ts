import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
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

export interface MapboxSearchResult {
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  fullAddress: string;
}

export interface MapboxReverseGeocodeResult {
  title: string;
  subtitle: string;
  fullAddress: string;
}

@Injectable()
export class MapboxService {
  private readonly accessToken?: string;
  private readonly baseUrl = 'https://api.mapbox.com';
  private readonly angrenAliases = [
    'Аҳангарон',
    'Ахангаран',
    'Оҳангарон',
    'Ohangaron',
    'Ahangaran',
  ];

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

  async geocode(address: string): Promise<MapboxSearchResult[]> {
    this.assertConfigured();
    const url = new URL(
      `/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`,
      this.baseUrl,
    );
    url.searchParams.set('access_token', this.accessToken as string);
    url.searchParams.set('limit', '5');
    url.searchParams.set('country', 'uz');
    url.searchParams.set('language', 'ru');

    try {
      const data = await this.fetchMapbox<{
        features: Array<{
          center: [number, number];
          place_name: string;
          text?: string;
          context?: Array<{ text?: string }>;
        }>;
      }>(url);

      return data.features.map((feature) => ({
        title: this.normalizeAddressPart(feature.text?.trim() || feature.place_name),
        subtitle: this.normalizeAddressPart(this.buildSubtitle(feature)),
        lng: feature.center[0],
        lat: feature.center[1],
        fullAddress: this.normalizeAddressPart(feature.place_name),
      }));
    } catch (error) {
      throw this.toMapboxException(error, 'Could not search addresses');
    }
  }

  async reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<MapboxReverseGeocodeResult> {
    this.assertConfigured();
    const url = new URL(
      `/geocoding/v5/mapbox.places/${lng},${lat}.json`,
      this.baseUrl,
    );
    url.searchParams.set('access_token', this.accessToken as string);
    url.searchParams.set('limit', '1');
    url.searchParams.set('language', 'ru');

    try {
      const data = await this.fetchMapbox<{
        features: Array<{
          place_name: string;
          text?: string;
        }>;
      }>(url);
      const feature = data.features[0];

      if (!feature) {
        return {
          title: '',
          subtitle: '',
          fullAddress: '',
        };
      }

      return {
        title: this.normalizeAddressPart(feature.text?.trim() || feature.place_name),
        subtitle: this.normalizeAddressPart(this.buildSubtitle(feature)),
        fullAddress: this.normalizeAddressPart(feature.place_name),
      };
    } catch (error) {
      throw this.toMapboxException(error, 'Could not reverse geocode location');
    }
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

    try {
      const data = await this.fetchMapbox<{
        routes: Array<{ distance: number; duration: number; geometry?: unknown }>;
      }>(url);
      const route = data.routes[0];

      if (!route) {
        throw new BadGatewayException('Mapbox route not found');
      }

      return {
        distanceMeters: Math.round(route.distance),
        durationSeconds: Math.round(route.duration),
        geometry: route.geometry,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw this.toMapboxException(error, 'Could not build route');
    }
  }

  private assertConfigured() {
    if (!this.accessToken) {
      throw new ServiceUnavailableException('Mapbox is not configured');
    }
  }

  private buildSubtitle(feature: {
    place_name: string;
    text?: string;
    context?: Array<{ text?: string }>;
  }) {
    const title = feature.text?.trim();
    const parts = feature.place_name
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (!title) {
      return parts.slice(1).join(', ');
    }

    if (parts[0] === title) {
      return parts.slice(1).join(', ');
    }

    return parts.join(', ');
  }

  private normalizeAddressPart(value: string) {
    if (!value) {
      return value;
    }

    let normalized = value;

    for (const alias of this.angrenAliases) {
      normalized = normalized.replace(new RegExp(alias, 'gi'), 'Ангрен');
    }

    normalized = normalized.replace(/Tashkent Region/gi, 'Ташкентская область');
    normalized = normalized.replace(/Toshkent viloyati/gi, 'Ташкентская область');
    normalized = normalized.replace(/Тошкент вилояти/gi, 'Ташкентская область');

    return normalized;
  }

  private toMapboxException(error: unknown, fallbackMessage: string) {
    if (error instanceof ServiceUnavailableException) {
      return error;
    }

    if (error instanceof BadGatewayException) {
      return error;
    }

    if (error instanceof Error) {
      return new BadGatewayException(`${fallbackMessage}: ${error.message}`);
    }

    return new BadGatewayException(fallbackMessage);
  }

  private async fetchMapbox<T>(url: URL): Promise<T> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
