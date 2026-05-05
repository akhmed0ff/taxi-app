import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

const DEFAULT_POSTGRES_USER = 'taxi';
const DEFAULT_POSTGRES_HOST = 'localhost';
const DEFAULT_POSTGRES_PORT = '5432';
const DEFAULT_POSTGRES_DB = 'taxi_app';

function loadEnvFile(path: string) {
  const resolved = resolve(path);

  if (!existsSync(resolved)) {
    return;
  }

  const content = readFileSync(resolved, 'utf8');

  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] != null) {
      continue;
    }

    const commentIndex = value.indexOf(' #');
    if (commentIndex !== -1) {
      value = value.slice(0, commentIndex).trim();
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile('../.env');
loadEnvFile('.env');

function buildDatabaseUrl() {
  const user = process.env.POSTGRES_USER ?? DEFAULT_POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const host = process.env.POSTGRES_HOST ?? DEFAULT_POSTGRES_HOST;
  const port = process.env.POSTGRES_PORT ?? DEFAULT_POSTGRES_PORT;
  const database = process.env.POSTGRES_DB ?? DEFAULT_POSTGRES_DB;

  if (!password) {
    throw new Error(
      'DATABASE_URL is invalid and POSTGRES_PASSWORD is not set, so a safe Prisma connection URL cannot be built.',
    );
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    password,
  )}@${host}:${port}/${encodeURIComponent(database)}?schema=public`;
}

function parseDatabaseUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
}

function resolveDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return buildDatabaseUrl();
  }

  const parsed = parseDatabaseUrl(databaseUrl);

  if (!parsed) {
    return buildDatabaseUrl();
  }

  // A numeric year as the host is a sign that an unescaped password fragment
  // containing "@" was interpreted as the URL authority host.
  if (/^20\d{2}$/.test(parsed.hostname)) {
    return buildDatabaseUrl();
  }

  return databaseUrl;
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
  engine: 'classic',
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
