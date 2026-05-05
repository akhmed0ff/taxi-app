/** Фиксированные точки назначения для dev (без геокодинга / Mapbox). */

export const DEV_PICKUP = { lat: 41.0167, lng: 70.1436 };

export const DEV_DESTINATIONS = [
  { label: 'Центр', coordinates: { lat: 41.0167, lng: 70.1436 } },
  { label: 'Вокзал', coordinates: { lat: 41.012, lng: 70.1505 } },
  { label: 'Аэропорт', coordinates: { lat: 41.0052, lng: 70.1188 } },
  { label: 'Рынок', coordinates: { lat: 41.0198, lng: 70.1342 } },
  {
    label: 'Произвольная dev точка',
    coordinates: { lat: 41.0305, lng: 70.161 },
  },
] as const;
