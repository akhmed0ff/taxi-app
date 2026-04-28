'use client';

import {
  AuthSession,
  CreateOrderInput,
  LoginInput,
  RegisterInput,
  Ride,
} from './types';
import { clearSession, getSession, requireSession, saveSession } from './session';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

export async function registerPassenger(input: RegisterInput) {
  const session = await publicFetch<AuthSession>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...input, role: 'PASSENGER' }),
  });
  saveSession(session);
  return session;
}

export async function loginPassenger(input: LoginInput) {
  const session = await publicFetch<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  saveSession(session);
  return session;
}

export async function logoutPassenger() {
  const session = getSession();

  if (session?.refreshToken) {
    await publicFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    }).catch(() => undefined);
  }

  clearSession();
}

export async function refreshAccessToken() {
  const session = requireSession();
  const refreshed = await publicFetch<AuthSession>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });

  saveSession(refreshed);
  return refreshed;
}

export function createOrder(input: CreateOrderInput) {
  return authFetch<Ride>('/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchRide(rideId: string) {
  return authFetch<Ride>(`/orders/${rideId}`);
}

export function fetchPassengerHistory(filter = 'active') {
  return authFetch<Ride[]>(
    `/orders/history/passenger?filter=${encodeURIComponent(filter)}`,
  );
}

async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = requireSession();
  let response = await request(path, init, session.accessToken);

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    response = await request(path, init, refreshed.accessToken);
  }

  if (!response.ok) {
    throw new Error(await readError(response, `Ошибка API: ${path}`));
  }

  return response.json() as Promise<T>;
}

async function publicFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await request(path, init);

  if (!response.ok) {
    throw new Error(await readError(response, `Ошибка API: ${path}`));
  }

  return response.json() as Promise<T>;
}

function request(path: string, init: RequestInit = {}, accessToken?: string) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });
}

async function readError(response: Response, fallback: string) {
  const body = await response.text();
  return body ? `${fallback}: ${body}` : fallback;
}
