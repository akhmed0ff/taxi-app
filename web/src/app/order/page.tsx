'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder, logoutPassenger } from '@/services/api';
import { getSession } from '@/services/session';
import { TariffClass } from '@/services/types';
import { tariffLabels } from '@/services/format';
import { OrderMap } from '@/components/OrderMap';

const defaultForm = {
  pickupAddress: 'Ангрен, центр',
  pickupLat: '41.0167',
  pickupLng: '70.1436',
  dropoffAddress: 'Ангрен, вокзал',
  dropoffLat: '41.0240',
  dropoffLng: '70.1690',
  tariffClass: 'ECONOMY' as TariffClass,
};

export default function OrderPage() {
  const router = useRouter();
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
    }
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const session = getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      const ride = await createOrder({
        customerId: session.user.id,
        pickupAddress: form.pickupAddress,
        pickupLat: Number(form.pickupLat),
        pickupLng: Number(form.pickupLng),
        dropoffAddress: form.dropoffAddress,
        dropoffLat: Number(form.dropoffLat),
        dropoffLng: Number(form.dropoffLng),
        tariffClass: form.tariffClass,
      });

      router.push(`/trip/${ride.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать заказ');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logoutPassenger();
    router.push('/login');
  }

  return (
    <>
      <h1 className="page-title">Заказать такси</h1>
      <p className="page-subtitle">
        MVP-форма для ручного ввода адресов и координат по Ангрену.
      </p>

      <form className="panel grid" onSubmit={handleSubmit}>
        <OrderMap
          pickup={{
            address: form.pickupAddress,
            lat: Number(form.pickupLat) || 41.0167,
            lng: Number(form.pickupLng) || 70.1436,
          }}
          dropoff={{
            address: form.dropoffAddress,
            lat: Number(form.dropoffLat) || 41.024,
            lng: Number(form.dropoffLng) || 70.169,
          }}
        />

        <div className="grid two-columns">
          <div className="field">
            <label htmlFor="pickupAddress">Адрес подачи</label>
            <input
              id="pickupAddress"
              value={form.pickupAddress}
              onChange={(event) =>
                setForm({ ...form, pickupAddress: event.target.value })
              }
              required
            />
          </div>
          <div className="field">
            <label htmlFor="dropoffAddress">Адрес назначения</label>
            <input
              id="dropoffAddress"
              value={form.dropoffAddress}
              onChange={(event) =>
                setForm({ ...form, dropoffAddress: event.target.value })
              }
              required
            />
          </div>
        </div>

        <div className="grid two-columns">
          <div className="field">
            <label htmlFor="pickupLat">Pickup lat</label>
            <input
              id="pickupLat"
              inputMode="decimal"
              value={form.pickupLat}
              onChange={(event) =>
                setForm({ ...form, pickupLat: event.target.value })
              }
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pickupLng">Pickup lng</label>
            <input
              id="pickupLng"
              inputMode="decimal"
              value={form.pickupLng}
              onChange={(event) =>
                setForm({ ...form, pickupLng: event.target.value })
              }
              required
            />
          </div>
        </div>

        <div className="grid two-columns">
          <div className="field">
            <label htmlFor="dropoffLat">Dropoff lat</label>
            <input
              id="dropoffLat"
              inputMode="decimal"
              value={form.dropoffLat}
              onChange={(event) =>
                setForm({ ...form, dropoffLat: event.target.value })
              }
              required
            />
          </div>
          <div className="field">
            <label htmlFor="dropoffLng">Dropoff lng</label>
            <input
              id="dropoffLng"
              inputMode="decimal"
              value={form.dropoffLng}
              onChange={(event) =>
                setForm({ ...form, dropoffLng: event.target.value })
              }
              required
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="tariffClass">Тариф</label>
          <select
            id="tariffClass"
            value={form.tariffClass}
            onChange={(event) =>
              setForm({ ...form, tariffClass: event.target.value as TariffClass })
            }
          >
            {Object.entries(tariffLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {error ? <div className="message error">{error}</div> : null}

        <div className="actions">
          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Создаём заказ...' : 'Заказать'}
          </button>
          <button type="button" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </form>
    </>
  );
}
