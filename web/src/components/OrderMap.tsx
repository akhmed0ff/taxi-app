'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface MapPoint {
  lat: number;
  lng: number;
  address?: string;
}

interface OrderMapProps {
  pickup: MapPoint;
  dropoff: MapPoint;
}

const defaultCenter: [number, number] = [70.1436, 41.0167];

export function OrderMap({ dropoff, pickup }: OrderMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const dropoffMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!containerRef.current || !token || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = token;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: defaultCenter,
      zoom: 12,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      pickupMarkerRef.current?.remove();
      dropoffMarkerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !token) {
      return;
    }

    const pickupLngLat: [number, number] = [pickup.lng, pickup.lat];
    const dropoffLngLat: [number, number] = [dropoff.lng, dropoff.lat];

    pickupMarkerRef.current?.remove();
    pickupMarkerRef.current = new mapboxgl.Marker({ color: '#0f766e' })
      .setLngLat(pickupLngLat)
      .setPopup(new mapboxgl.Popup().setText(pickup.address || 'Точка подачи'))
      .addTo(map);

    dropoffMarkerRef.current?.remove();
    dropoffMarkerRef.current = new mapboxgl.Marker({ color: '#dc2626' })
      .setLngLat(dropoffLngLat)
      .setPopup(
        new mapboxgl.Popup().setText(dropoff.address || 'Точка назначения'),
      )
      .addTo(map);

    const bounds = new mapboxgl.LngLatBounds(pickupLngLat, pickupLngLat).extend(
      dropoffLngLat,
    );
    map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 400 });
  }, [dropoff, pickup, token]);

  if (!token) {
    return (
      <div className="mapbox-fallback">
        <strong>Карта Mapbox</strong>
        <span>Добавьте `NEXT_PUBLIC_MAPBOX_TOKEN`, чтобы увидеть карту.</span>
        <span>
          Pickup: {pickup.lat.toFixed(5)}, {pickup.lng.toFixed(5)}
        </span>
        <span>
          Dropoff: {dropoff.lat.toFixed(5)}, {dropoff.lng.toFixed(5)}
        </span>
      </div>
    );
  }

  return <div ref={containerRef} className="mapbox-panel" />;
}
