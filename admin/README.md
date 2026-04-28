# ANGREN TAXI Admin Panel

Dispatcher and admin panel built with Next.js, Ant Design and Socket.IO.

## Functions

- Monitoring orders: live map, active trips and system status
- Driver management: live ONLINE/BUSY/OFFLINE status and documents
- Tariffs: backend price configuration
- Analytics: trips, revenue, active drivers from backend data

## Pages

- `/` - monitoring
- `/drivers` - driver management
- `/tariffs` - tariff settings
- `/analytics` - analytics

## Quick Start

```bash
npm install
npm run dev
```

Required backend config:

- `NEXT_PUBLIC_API_URL` points to the backend, default `http://localhost:3000`.
- `NEXT_PUBLIC_ADMIN_PHONE` and `NEXT_PUBLIC_ADMIN_PASSWORD` are used for admin login.
- Admin data is loaded from backend API only; local mock data is not used.
