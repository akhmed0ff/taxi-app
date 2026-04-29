# ANGREN TAXI

ANGREN TAXI - монорепозиторий платформы такси для города Ангрен. В проект входят backend на NestJS, мобильные приложения пассажира и водителя на Expo, админ-панель диспетчера и инфраструктура для деплоя.

## Стек

- Backend: NestJS, Prisma, PostgreSQL, Redis, Socket.IO, BullMQ
- Приложение пассажира: Expo, React Native, socket.io-client
- Приложение водителя: Expo, React Native, expo-location, socket.io-client
- Админ-панель: Next.js, Ant Design
- Web passenger app: Next.js, TypeScript, socket.io-client
- Инфраструктура: Docker Compose, GitHub Actions CI/CD

## Структура

```text
backend/   NestJS API, жизненный цикл заказа, matching, realtime, оплаты
customer/  мобильное приложение пассажира
driver/    мобильное приложение водителя
admin/     админ-панель и диспетчерская
web/       веб-версия пассажирского приложения
docs/      архитектура, деплой и roadmap
```

## Текущее состояние

- Auth endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- Development-only auth shortcut: `POST /auth/dev-login` работает только при `NODE_ENV != production` и `ENABLE_DEV_LOGIN=true`
- JWT AuthGuard и RoleGuard для HTTP endpoints
- Cancel ride flow: passenger/driver before `IN_PROGRESS`, admin before final states, `cancelReason`, driver returns `ONLINE`, realtime `RIDE_CANCELLED`.
- Жизненный цикл заказа: создать, принять, приехать, начать, завершить, оплатить
- Отдельный `MatchingModule`
- Поиск водителей через Redis GEO
- Реальные тарифы ANGREN TAXI: Economy, Comfort, Premium, подача, цена за км, 3 бесплатные минуты ожидания, ожидание/остановки по 500 сум/мин, минимальная цена и fare breakdown
- Правила статусов водителя: `ONLINE`, `BUSY`, `OFFLINE`, `BLOCKED`
- Socket.IO комнаты защищены JWT
- Customer app создает заказы и отслеживает события поездки
- Web passenger app поддерживает регистрацию, вход, создание заказа, realtime-страницу поездки и историю поездок
- Driver app выходит онлайн/оффлайн, отправляет геолокацию, получает офферы и завершает поездки
- Мобильный UI поддерживает русский и узбекский языки; по умолчанию русский
- Админ-панель для мониторинга, водителей, тарифов и аналитики
- Health и metrics endpoints: `/health`, `/metrics`
- Docker Compose production setup: backend, admin, Postgres, Redis, healthchecks, Docker log rotation, Nginx reverse proxy example and Certbot deployment notes

## Быстрый старт

Установить зависимости по приложениям:

```bash
cd backend
npm install

cd ../admin
npm install

cd ../customer
npm install

cd ../driver
npm install

cd ../web
npm install
```

Запустить инфраструктуру, если доступен Docker:

```bash
docker compose up -d postgres redis
```

Запустить backend:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

Запустить админ-панель:

```bash
cd admin
npm run dev
```

Запустить мобильные приложения:

```bash
cd customer
npm run start

cd ../driver
npm run start
```

Запустить веб-версию пассажира:

```bash
cd web
npm run dev
```

Адреса по умолчанию:

- Backend: `http://localhost:3000`
- Admin: `http://localhost:3001`
- Web passenger app: `http://localhost:3000` when started alone, or another free Next.js port
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## Основной сценарий

1. Пассажир регистрируется или входит через `POST /auth/register` / `POST /auth/login` и получает JWT.
2. Пассажир создает заказ через `POST /orders`.
3. Backend считает примерную стоимость и ставит задачу `find-driver` в очередь.
4. `MatchingModule` ищет ближайших `ONLINE` водителей через Redis GEO.
5. Водитель получает `NEW_ORDER` через Socket.IO.
6. Водитель принимает заказ, приезжает, начинает и завершает поездку.
7. Геолокация водителя отправляется каждые несколько секунд, пока он активен.
8. Пассажир получает realtime-события поездки.
9. После завершения создается pending payment; оплату можно отметить как paid.
10. До финальных состояний заказ можно отменить через `PATCH /orders/:rideId/cancel`; backend сохраняет `cancelReason` и отправляет `RIDE_CANCELLED`.

## Realtime Security

Socket.IO клиенты должны отправлять:

```ts
auth: { accessToken }
```

Gateway проверяет JWT до подключения к комнатам. ID комнат берутся из токена и состояния в базе, а не из клиентских `driverId` или `passengerId`.

## Полезные команды

Backend:

```bash
cd backend
npm test
npm run test:core-flow
npm run build
npm run start:dev
```

Admin:

```bash
cd admin
npm run typecheck
npm run build
npm run dev
```

Admin backend API:

- `NEXT_PUBLIC_API_URL` points the admin panel to the backend. Production builds require a real public API URL and reject localhost.
- `NEXT_PUBLIC_ADMIN_PHONE` and `NEXT_PUBLIC_ADMIN_PASSWORD` are used for admin login.
- If admin login fails in development, the panel may use `/auth/dev-login` only when `ENABLE_DEV_LOGIN=true`.
- Mock data has been removed from the admin panel; drivers, active orders, tariffs and basic analytics must come from the backend API.
- Admin Socket.IO connects with `auth: { accessToken }` and receives `ORDER_UPDATED` / `DRIVER_UPDATED` events for live dashboard refresh.

Mobile:

```bash
cd customer
npm run typecheck

cd ../driver
npm run typecheck
```

Web:

```bash
cd web
npm run typecheck
npm run build
npm run dev
```

Для локального MVP mobile auth используются пароли из env:

- `EXPO_PUBLIC_CUSTOMER_PASSWORD`
- `EXPO_PUBLIC_DRIVER_PASSWORD`

Если env не задан, приложения используют `password123`.

Docker:

```bash
docker compose up -d --build
```

Local development:

- See [docs/local-dev.md](docs/local-dev.md) for Docker/local startup variants.
- For Docker Compose local dev, `.env` may use `NEXT_PUBLIC_API_URL=http://127.0.0.1:3000` and `NEXT_PUBLIC_ADMIN_PASSWORD=AdminDevPass123!`.
- Production admin builds still reject localhost API URLs and weak admin passwords.

Production env hardening:

- `.env.example` is only for local development and must not be copied to production.
- `.env.production.example` contains placeholders only; replace all secrets on the VPS.
- In production, backend startup requires `JWT_SECRET` with at least 32 characters and rejects weak Postgres/admin passwords.
- Swagger/OpenAPI is available at `/docs` only outside production.

## Документация

- Архитектура: [docs/architecture.md](docs/architecture.md)
- Roadmap: [docs/roadmap.md](docs/roadmap.md)
- Auth: [docs/auth.md](docs/auth.md)
- Security: [docs/security.md](docs/security.md)
- Local development: [docs/local-dev.md](docs/local-dev.md)
- Maps: [docs/maps.md](docs/maps.md)
- Redis GEO: [docs/redis.md](docs/redis.md)
- Matching: [docs/matching.md](docs/matching.md)
- Pricing: [docs/pricing.md](docs/pricing.md)
- Деплой: [docs/deployment.md](docs/deployment.md)

## CI/CD

GitHub Actions запускает сборку backend, typecheck/build админ-панели и сборку Docker images. VPS deploy пропускается, пока не настроены GitHub Secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_APP_DIR`
