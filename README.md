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
- Тарифы в БД (`Tariff`): классы `STANDARD`, `COMFORT`, `COMFORT_PLUS`, `DELIVERY`; подача, цена за км, опционально цена за 100 м, ожидание/остановки, минимальный заказ, fare breakdown. Публичный список для приложений: `**GET /tariffs**` (активные, с полями для UI и оценки). При **пустой таблице** тарифов: `cd backend && npx prisma db seed` — вставляет дефолтные строки **без перезаписи** существующих.
- Правила статусов водителя: `ONLINE`, `BUSY`, `OFFLINE`, `BLOCKED`
- Socket.IO комнаты защищены JWT
- Customer app: главный экран с заглушкой карты (`FakeMapPlaceholder`, не перехватывает нажатия), карточка «Откуда / Куда», модальное окно выбора пункта назначения (dev-список точек), горизонтальный список тарифов (**данные только с `GET /tariffs`**, оценка стоимости через `mapAdapter.getDistance` + поля тарифа из API). На экране **нет** быстрых чипов «Дом / Работа / Избранное»; тариф **Доставка** для пассажира скрыт. Заказ создаётся с главного экрана; после успеха — состояние «Ищем водителя…», по realtime при назначении водителя — «Водитель найден». Временно без Mapbox/маршрутов (см. feature flags).
- Driver app выходит онлайн/оффлайн, отправляет геолокацию, получает офферы и завершает поездки (временно рендерит стабильную заглушку карты; Mapbox установлен, но выключен через flags)
- Мобильный UI поддерживает русский и узбекский языки; по умолчанию русский
- Админ-панель: мониторинг, водители, **редактирование тарифов** (`/admin/tariffs` → сохранение в БД; пассажирское приложение подхватывает изменения через `GET /tariffs`), аналитика
- Health и metrics endpoints: `/health`, `/metrics`
- Docker Compose production setup: backend, admin, Postgres, Redis, healthchecks, Docker log rotation, Nginx reverse proxy example and Certbot deployment notes

## Быстрый старт

## Первоначальная настройка

```bash
cp .env.example .env
# Заполни все обязательные переменные перед запуском
# Никогда не используй значения из .env.example в продакшн
```

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
# при первом развёртывании или пустой таблице Tariff:
npx prisma db seed
npm run start:dev
```

Сид тарифов **идемпотентен**: если в `Tariff` уже есть строки, повторный `db seed` их не меняет.

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
2. Пассажир подтягивает тарифы через `**GET /tariffs**`, выбирает пункт назначения и тариф на главном экране, затем создаёт заказ через `**POST /orders**` (опционально `tariffId` из ответа `GET /tariffs`).
3. Backend считает примерную стоимость и ставит задачу `find-driver` в очередь.
4. `MatchingModule` ищет ближайших `ONLINE` водителей через Redis GEO.
5. Водитель получает оффер через Socket.IO событие `new_ride_offer` (также поддерживаются legacy aliases).
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

## Feature flags (dev/mock режим)

В мобильных приложениях есть единые флаги:

- `customer/src/config/flags.ts`
- `driver/src/config/flags.ts`

Текущие ключи:

- `USE_MOCK_MAP`: рендерить заглушку карты (Mapbox не используется)
- `USE_DEV_COORDS`: фиксированные координаты для dev flow
- `USE_FIXED_DESTINATIONS`: фиксированные точки назначения в customer
- `ENABLE_ROUTE_FETCHING`: временно выключено

## Maps adapter (подготовка к Mapbox)

Customer/Driver имеют слой адаптера карт, чтобы позже включить Mapbox одной настройкой:

- `*/src/services/map/mapAdapter.ts` выбирает `mockMapAdapter` или `mapboxAdapter` по `USE_MOCK_MAP`
- `mapboxAdapter` сейчас безопасная заглушка (не падает), реальная интеграция Mapbox будет добавлена позже

## Полезные команды

Backend:

```bash
cd backend
npm test
npm run test:core-flow
npm run build
npm run start:dev
npm run prisma:seed   # то же, что npx prisma db seed
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
npm run start

cd ../driver
npm run typecheck
npm run start
```

Customer для работы с API должен знать URL бэкенда: `**EXPO_PUBLIC_API_URL**` в `customer/.env` (после изменения — перезапуск с `npx expo start -c`).

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