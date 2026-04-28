'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchPassengerHistory } from '@/services/api';
import { formatDate, formatSom, routeLabel, statusLabels } from '@/services/format';
import { getSession } from '@/services/session';
import { Ride } from '@/services/types';

const filters = [
  { value: 'active', label: 'Активные' },
  { value: 'completed', label: 'Завершённые' },
  { value: 'cancelled', label: 'Отменённые' },
];

export default function HistoryPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('active');
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    setError('');

    fetchPassengerHistory(filter)
      .then(setRides)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Не удалось загрузить историю'),
      )
      .finally(() => setLoading(false));
  }, [filter, router]);

  return (
    <>
      <h1 className="page-title">История поездок</h1>
      <p className="page-subtitle">Ваши активные, завершённые и отменённые заказы.</p>

      <section className="panel">
        <div className="actions">
          {filters.map((item) => (
            <button
              className={filter === item.value ? 'primary' : ''}
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? <div className="message info">Загружаем историю...</div> : null}
        {error ? <div className="message error">{error}</div> : null}

        {!loading && !error && rides.length === 0 ? (
          <div className="message info">Поездок в этом фильтре пока нет.</div>
        ) : null}

        {rides.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Маршрут</th>
                  <th>Статус</th>
                  <th>Цена</th>
                  <th>Дата</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rides.map((ride) => (
                  <tr key={ride.id}>
                    <td>
                      <div className="route">
                        {routeLabel(ride.pickupAddress, ride.dropoffAddress)}
                      </div>
                      <div className="muted">{ride.tariffClass ?? 'ECONOMY'}</div>
                    </td>
                    <td>{statusLabels[ride.status]}</td>
                    <td>{formatSom(ride.finalFare ?? ride.estimatedFare)}</td>
                    <td>{formatDate(ride.createdAt)}</td>
                    <td>
                      <Link className="button" href={`/trip/${ride.id}`}>
                        Открыть
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </>
  );
}
