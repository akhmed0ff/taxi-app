'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerPassenger } from '@/services/api';

export default function RegisterPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+998');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await registerPassenger({ phone, name, password });
      router.push('/order');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="page-title">Регистрация</h1>
      <p className="page-subtitle">Создайте пассажирский аккаунт ANGREN TAXI.</p>

      <form className="panel grid" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Имя</label>
          <input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
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
            autoComplete="new-password"
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
            {loading ? 'Создаём...' : 'Создать аккаунт'}
          </button>
          <Link className="button" href="/login">
            Уже есть аккаунт
          </Link>
        </div>
      </form>
    </>
  );
}
