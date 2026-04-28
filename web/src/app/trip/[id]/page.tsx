'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchRide } from '@/services/api';
import { formatDate, formatSom, routeLabel, statusLabels } from '@/services/format';
import { connectRideRealtime, RideRealtimeEvent } from '@/services/realtime';
import { getSession } from '@/services/session';
import { DriverLocationPayload, Ride } from '@/services/types';

export default function TripPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const rideId = params.id;
  const [ride, setRide] = useState<Ride | null>(null);
  const [driverLocation, setDriverLocation] =
    useState<DriverLocationPayload | null>(null);
  const [info, setInfo] = useState('Подключаемся...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const session = getSession();

    if (!session) {
      router.replace('/login');
      return;
    }

    let mounted = true;

    fetchRide(rideId)
      .then((data) => {
        if (mounted) {
          setRide(data);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить поездку');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    const disconnect = connectRideRealtime(rideId, session.accessToken, {
      onRide: (event: RideRealtimeEvent, nextRide: Ride) => {
        setRide(nextRide);
        setInfo(eventLabels[event]);
      },
      onDriverLocation: (payload) => {
        setDriverLocation(payload);
        setInfo('Получена геолокация водителя');
      },
      onInfo: setInfo,
    });

    return () => {
      mounted = false;
      disconnect();
    };
  }, [rideId, router]);

  const driverName = useMemo(() => {
    const user = ride?.driver?.user;
    return user?.name || user?.phone || 'Назначается';
  }, [ride]);

  return (
    <>
      <h1 className="page-title">Поездка</h1>
      <p className="page-subtitle">Статус обновляется через Socket.IO.</p>

      {loading ? <div className="message info">Загружаем поездку...</div> : null}
      {error ? <div className="message error">{error}</div> : null}
      {info ? <div className="message info">{info}</div> : null}

      {ride ? (
        <section className="panel">
          <div className="status-row">
            <span>Статус</span>
            <span className="badge">{statusLabels[ride.status]}</span>
          </div>
          <div className="status-row">
            <span>Маршрут</span>
            <strong>{routeLabel(ride.pickupAddress, ride.dropoffAddress)}</strong>
          </div>
          <div className="status-row">
            <span>Водитель</span>
            <strong>{driverName}</strong>
          </div>
          <div className="status-row">
            <span>Стоимость</span>
            <strong>{formatSom(ride.finalFare ?? ride.estimatedFare)}</strong>
          </div>
          <div className="status-row">
            <span>Создано</span>
            <strong>{formatDate(ride.createdAt)}</strong>
          </div>
          {driverLocation ? (
            <div className="status-row">
              <span>Координаты водителя</span>
              <strong>
                {driverLocation.lat.toFixed(5)}, {driverLocation.lng.toFixed(5)}
              </strong>
            </div>
          ) : null}
          {ride.cancelReason ? (
            <div className="status-row">
              <span>Причина отмены</span>
              <strong>{ride.cancelReason}</strong>
            </div>
          ) : null}
          <div className="actions">
            <Link className="button" href="/order">
              Новый заказ
            </Link>
            <Link className="button" href="/history">
              История
            </Link>
          </div>
        </section>
      ) : null}
    </>
  );
}

const eventLabels: Record<RideRealtimeEvent, string> = {
  DRIVER_ACCEPTED: 'Водитель принял заказ',
  DRIVER_LOCATION: 'Получена геолокация водителя',
  TRIP_STARTED: 'Поездка началась',
  TRIP_COMPLETED: 'Поездка завершена',
  RIDE_CANCELLED: 'Заказ отменён',
  PAYMENT_COMPLETED: 'Оплата завершена',
};
