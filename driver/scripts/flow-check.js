/* eslint-disable no-console */
const { io } = require('socket.io-client');

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const SOCKET = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3000';

async function readJson(res) {
  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

async function postJson(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await readJson(res);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(json)}`);
  return json;
}

async function getJsonAuth(path, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await readJson(res);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(json)}`);
  return json;
}

async function postJsonAuth(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await readJson(res);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(json)}`);
  return json;
}

async function patchJsonAuth(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await readJson(res);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(json)}`);
  return json;
}

async function patchAuth(path, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await readJson(res);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(json)}`);
  return json;
}

function waitConnect(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('socket connect timeout')), 8000);
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function emitAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, (response) => {
      if (response && response.ok) {
        resolve(response);
        return;
      }
      reject(new Error(`ack failed for ${event}: ${JSON.stringify(response)}`));
    });
  });
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function emitAckRetry(socket, event, payload, { attempts = 20, delayMs = 200 } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await emitAck(socket, event, payload);
    } catch (e) {
      lastError = e;
      // eslint-disable-next-line no-await-in-loop
      await sleep(delayMs);
    }
  }
  throw lastError;
}

async function main() {
  const adminLogin = await postJson('/auth/dev-login?role=ADMIN', { phone: '+998900000000' });
  const driverLogin = await postJson('/auth/dev-login?role=DRIVER', { phone: '+998901112233' });
  const passengerLogin = await postJson('/auth/dev-login?role=PASSENGER', { phone: '+998901114455' });

  const adminToken = adminLogin.accessToken;
  const driverToken = driverLogin.accessToken;
  const driverId = driverLogin.driver?.id;
  const passengerToken = passengerLogin.accessToken;
  const passengerId = passengerLogin.user?.id;

  if (!adminToken) throw new Error('Admin dev-login missing accessToken');
  if (!driverToken || !driverId) throw new Error('Driver dev-login missing accessToken/driverId');
  if (!passengerToken || !passengerId) throw new Error('Passenger dev-login missing accessToken/passengerId');
  console.log('[ids]', { driverId, passengerId });

  // Note: We don't try to offline other drivers here because throttling may block it.

  const driverSocket = io(SOCKET, { transports: ['websocket'], auth: { accessToken: driverToken } });
  const passengerSocket = io(SOCKET, { transports: ['websocket'], auth: { accessToken: passengerToken } });

  await Promise.all([waitConnect(driverSocket), waitConnect(passengerSocket)]);

  driverSocket.onAny((event, ...args) => {
    if (event === 'ping' || event === 'pong') return;
    console.log('[driver event]', event);
  });
  passengerSocket.onAny((event, ...args) => {
    if (event === 'ping' || event === 'pong') return;
    console.log('[passenger event]', event);
  });

  await emitAckRetry(driverSocket, 'driver.join', { driverId });
  await emitAckRetry(passengerSocket, 'passenger.join', { passengerId });

  await patchJsonAuth(`/drivers/${driverId}/status`, { status: 'ONLINE' }, driverToken);
  await patchJsonAuth(`/drivers/${driverId}/location`, { lat: 41.0167, lng: 70.1436 }, driverToken);
  try {
    const onlineDrivers = await getJsonAuth('/drivers/online', adminToken);
    const onlineIds = Array.isArray(onlineDrivers) ? onlineDrivers.map((d) => d.id) : [];
    console.log('[online drivers]', onlineIds);
  } catch {
    // ignore
  }

  const offerPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no new_ride_offer received')), 30000);
    driverSocket.on('new_ride_offer', (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

  const ride = await postJsonAuth(
    '/orders',
    {
      customerId: passengerId,
      pickupLat: 41.0167,
      pickupLng: 70.1436,
      pickupAddress: 'Ангрен, текущая точка',
      dropoffLat: 41.0224,
      dropoffLng: 70.1542,
      dropoffAddress: 'Ангрен, Дом',
      tariffClass: 'STANDARD',
    },
    passengerToken,
  );

  passengerSocket.emit('order.join', { orderId: ride.id });
  try {
    await emitAckRetry(
      passengerSocket,
      'order.join',
      { orderId: ride.id },
      { attempts: 10, delayMs: 200 },
    );
  } catch {
    // Some server versions don't ack this; room join still happens.
  }

  const offerPayload = await offerPromise;

  const offerRideId =
    offerPayload?.ride?.id ||
    offerPayload?.order?.id ||
    offerPayload?.rideId ||
    offerPayload?.id;

  if (!offerRideId) throw new Error('offer payload missing ride id');

  const passengerEventPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('passenger did not receive driver_assigned/DRIVER_ACCEPTED')),
      30000,
    );
    const done = (event) => (payload) => {
      clearTimeout(timer);
      resolve({ event, payload });
    };
    passengerSocket.on('driver_assigned', done('driver_assigned'));
    passengerSocket.on('ride.driver_assigned', done('ride.driver_assigned'));
    passengerSocket.on('DRIVER_ACCEPTED', done('DRIVER_ACCEPTED'));
    passengerSocket.on('DRIVER_ASSIGNED', done('DRIVER_ASSIGNED'));
  });

  await patchAuth(`/orders/${offerRideId}/accept/${driverId}`, driverToken);

  const passengerEvent = await passengerEventPromise;

  console.log(
    JSON.stringify(
      {
        ok: true,
        rideId: ride.id,
        driverId,
        offerEvent: 'new_ride_offer',
        passengerEvent: passengerEvent.event,
      },
      null,
      2,
    ),
  );

  driverSocket.disconnect();
  passengerSocket.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

