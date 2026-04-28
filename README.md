# ANGREN TAXI

ANGREN TAXI - монорепозиторий платформы такси для города Ангрен. В проект входят backend на NestJS, мобильные приложения пассажира и водителя на Expo, админ-панель диспетчера и инфраструктура для деплоя.

## Стек

- Backend: NestJS, Prisma, PostgreSQL, Redis, Socket.IO, BullMQ
- Приложение пассажира: Expo, React Native, socket.io-client
- Приложение водителя: Expo, React Native, expo-location, socket.io-client
- Админ-панель: Next.js, Ant Design
- Инфраструктура: Docker Compose, GitHub Actions CI/CD

## Структура

```text
backend/   NestJS API, жизненный цикл заказа, matching, realtime, оплаты
customer/  мобильное приложение пассажира
driver/    мобильное приложение водителя
admin/     админ-панель и диспетчерская
web/       заготовка веб-клиента
docs/      архитектура, деплой и roadmap
```

## Текущее состояние

- Auth endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- Development-only auth shortcut: `POST /auth/dev-login` работает только при `NODE_ENV != production`
- JWT AuthGuard и RoleGuard для HTTP endpoints
- Cancel ride flow: passenger/driver before `IN_PROGRESS`, admin before final states, `cancelReason`, driver returns `ONLINE`, realtime `RIDE_CANCELLED`.
- Жизненный цикл заказа: создать, принять, приехать, начать, завершить, оплатить
- Отдельный `MatchingModule`
- Поиск водителей через Redis GEO
- Правила статусов водителя: `ONLINE`, `BUSY`, `OFFLINE`, `BLOCKED`
- Socket.IO комнаты защищены JWT
- Customer app создает заказы и отслеживает события поездки
- Driver app выходит онлайн/оффлайн, отправляет геолокацию, получает офферы и завершает поездки
- Мобильный UI поддерживает русский и узбекский языки; по умолчанию русский
- Админ-панель для мониторинга, водителей, тарифов и аналитики
- Health и metrics endpoints: `/health`, `/metrics`
- Базовая Docker и CI/CD инфраструктура

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

Адреса по умолчанию:

- Backend: `http://localhost:3000`
- Admin: `http://localhost:3001`
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

- `NEXT_PUBLIC_API_URL` points the admin panel to the backend, default `http://localhost:3000`.
- `NEXT_PUBLIC_ADMIN_PHONE` and `NEXT_PUBLIC_ADMIN_PASSWORD` are used for admin login.
- In development only, if admin login fails, the panel may use `/auth/dev-login` and mock fallback data.
- In production, mock fallback is disabled; drivers, active orders, tariffs and basic analytics must come from the backend API.

Mobile:

```bash
cd customer
npm run typecheck

cd ../driver
npm run typecheck
```

Для локального MVP mobile auth используются пароли из env:

- `EXPO_PUBLIC_CUSTOMER_PASSWORD`
- `EXPO_PUBLIC_DRIVER_PASSWORD`

Если env не задан, приложения используют `password123`.

Docker:

```bash
docker compose up -d --build
```

## Документация

- Архитектура: [docs/architecture.md](docs/architecture.md)
- Roadmap: [docs/roadmap.md](docs/roadmap.md)
- Auth: [docs/auth.md](docs/auth.md)
- Matching: [docs/matching.md](docs/matching.md)
- Pricing: [docs/pricing.md](docs/pricing.md)
- Деплой: [docs/deployment.md](docs/deployment.md)

## CI/CD

GitHub Actions запускает сборку backend, typecheck/build админ-панели и сборку Docker images. VPS deploy пропускается, пока не настроены GitHub Secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_APP_DIR`
