import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DriverDevSession {
  accessToken: string;
  refreshToken: string;
  driverId: string;
}

interface DevLoginResponse {
  accessToken?: string;
  access_token?: string;
  token?: string;
  refreshToken?: string;
  refresh_token?: string;
  tokens?: {
    accessToken?: string;
    access_token?: string;
    refreshToken?: string;
    refresh_token?: string;
  };
  data?: {
    accessToken?: string;
    access_token?: string;
    token?: string;
    refreshToken?: string;
    refresh_token?: string;
    tokens?: {
      accessToken?: string;
      access_token?: string;
      refreshToken?: string;
      refresh_token?: string;
    };
  };
  driver?: {
    id: string;
  };
}

const API_URL = normalizeApiUrl(
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
);
const SESSION_STORAGE_KEY = 'angren-taxi:driver-session';
const DEV_DRIVER_PHONE =
  process.env.EXPO_PUBLIC_DRIVER_PHONE ?? '+998901112233';

let accessToken: string | null = null;
let session: DriverDevSession | null = null;

export async function getDevAccessToken() {
  if (accessToken) {
    devLog('TOKEN EXISTS true');
    return accessToken;
  }

  const currentSession = await getStoredDriverSession();
  if (currentSession?.accessToken) {
    devLog('TOKEN EXISTS true');
    return currentSession.accessToken;
  }

  devLog('TOKEN EXISTS false');
  devLog('token missing, running dev-login');
  const nextSession = await devLoginDriver();
  return nextSession.accessToken;
}

export async function getDriverDevSession(phone?: string) {
  const currentSession = await getStoredDriverSession();
  if (currentSession?.accessToken) {
    devLog('TOKEN EXISTS true');
    return currentSession;
  }

  devLog('TOKEN EXISTS false');
  devLog('token missing, running dev-login');
  return devLoginDriver(phone);
}

export async function authorizedFetch(
  path: string,
  options: RequestInit = {},
  token?: string,
) {
  const currentToken = token ?? (await getDevAccessToken());
  devLog(`request path ${path}`);
  devLog(`Authorization header exists ${Boolean(currentToken)}`);
  const response = await fetch(
    `${API_URL}${path}`,
    withAuthorization(options, currentToken),
  );

  if (response.status !== 401) {
    return response;
  }

  devLog('protected request returned 401, refreshing dev token');
  await clearDriverSession();
  const nextSession = await devLoginDriver();
  return fetch(`${API_URL}${path}`, withAuthorization(options, nextSession.accessToken));
}

export async function saveDriverSession(nextSession: DriverDevSession) {
  session = nextSession;
  accessToken = nextSession.accessToken;
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
  return nextSession;
}

export async function clearDriverSession() {
  session = null;
  accessToken = null;
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}

async function devLoginDriver(phone = DEV_DRIVER_PHONE): Promise<DriverDevSession> {
  devLog(`API URL: ${API_URL}`);
  devLog(`dev-login phone ${phone}`);
  devLog('dev-login role DRIVER');
  const response = await fetch(`${API_URL}/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      name: 'Local Driver',
      role: 'DRIVER',
    }),
  });
  devLog(`dev-login status ${response.status}`);
  const data = (await response.json()) as DevLoginResponse;
  devLog(`response body dev-login ${JSON.stringify(maskDevLoginBody(data))}`);

  if (!response.ok) {
    throw new Error(`Dev login failed: ${response.status}`);
  }

  const nextAccessToken = extractAccessToken(data);
  if (!nextAccessToken) {
    throw new Error('Dev login did not return accessToken');
  }

  if (!data.driver?.id) {
    throw new Error('Dev login did not return driver profile');
  }

  devLog('dev-login success');
  return saveDriverSession({
    accessToken: nextAccessToken,
    refreshToken: extractRefreshToken(data),
    driverId: data.driver.id,
  });
}

async function getStoredDriverSession() {
  if (session) {
    return session;
  }

  const rawSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  if (!rawSession) {
    return null;
  }

  session = JSON.parse(rawSession) as DriverDevSession;
  if (!session.accessToken || !session.driverId) {
    await clearDriverSession();
    return null;
  }

  accessToken = session.accessToken;
  return session;
}

function withAuthorization(options: RequestInit, token: string): RequestInit {
  devLog('protected request with token');
  return {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

function extractAccessToken(data: DevLoginResponse) {
  return (
    data.accessToken ||
    data.access_token ||
    data.token ||
    data.tokens?.accessToken ||
    data.tokens?.access_token ||
    data.data?.accessToken ||
    data.data?.access_token ||
    data.data?.token ||
    data.data?.tokens?.accessToken ||
    data.data?.tokens?.access_token ||
    ''
  );
}

function extractRefreshToken(data: DevLoginResponse) {
  return (
    data.refreshToken ||
    data.refresh_token ||
    data.tokens?.refreshToken ||
    data.tokens?.refresh_token ||
    data.data?.refreshToken ||
    data.data?.refresh_token ||
    data.data?.tokens?.refreshToken ||
    data.data?.tokens?.refresh_token ||
    ''
  );
}

function maskDevLoginBody(data: DevLoginResponse) {
  return {
    ...data,
    accessToken: maskToken(data.accessToken),
    access_token: maskToken(data.access_token),
    token: maskToken(data.token),
    refreshToken: maskToken(data.refreshToken),
    refresh_token: maskToken(data.refresh_token),
    tokens: data.tokens
      ? {
          ...data.tokens,
          accessToken: maskToken(data.tokens.accessToken),
          access_token: maskToken(data.tokens.access_token),
          refreshToken: maskToken(data.tokens.refreshToken),
          refresh_token: maskToken(data.tokens.refresh_token),
        }
      : undefined,
    data: data.data
      ? {
          ...data.data,
          accessToken: maskToken(data.data.accessToken),
          access_token: maskToken(data.data.access_token),
          token: maskToken(data.data.token),
          refreshToken: maskToken(data.data.refreshToken),
          refresh_token: maskToken(data.data.refresh_token),
          tokens: data.data.tokens
            ? {
                ...data.data.tokens,
                accessToken: maskToken(data.data.tokens.accessToken),
                access_token: maskToken(data.data.tokens.access_token),
                refreshToken: maskToken(data.data.tokens.refreshToken),
                refresh_token: maskToken(data.data.tokens.refresh_token),
              }
            : undefined,
        }
      : undefined,
  };
}

function maskToken(token?: string) {
  return token ? `${token.slice(0, 16)}...` : token;
}

function normalizeApiUrl(url: string) {
  return url.replace(/\/+$/, '');
}

function devLog(message: string) {
  if (__DEV__) {
    console.log(`[driver-api] ${message}`);
  }
}
