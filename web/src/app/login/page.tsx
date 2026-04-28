'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginPassenger } from '@/services/api';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+998');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginPassenger({ phone, password });
      router.push('/order');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="page-title">Вход</h1>
      <p className="page-subtitle">Войдите как пассажир, чтобы заказать такси.</p>

      <form className="panel grid" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="phone">Телефон</label>
          <input
            id="phone"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Пароль</label>
          <input
            id="password"
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </div>
        {error ? <div className="message error">{error}</div> : null}
        <div className="actions">
          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Входим...' : 'Войти'}
          </button>
          <Link className="button" href="/register">
            Регистрация
          </Link>
        </div>
      </form>
    </>
  );
}
