FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ARG NEXT_PUBLIC_ADMIN_PHONE=+998900000001
ARG NEXT_PUBLIC_ADMIN_PASSWORD=password123
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ADMIN_PHONE=$NEXT_PUBLIC_ADMIN_PHONE
ENV NEXT_PUBLIC_ADMIN_PASSWORD=$NEXT_PUBLIC_ADMIN_PASSWORD
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY next.config.mjs ./
COPY tsconfig.json ./
COPY next-env.d.ts ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/next.config.mjs ./next.config.mjs
RUN npm prune --omit=dev
EXPOSE 3000
CMD ["npm", "run", "start"]
