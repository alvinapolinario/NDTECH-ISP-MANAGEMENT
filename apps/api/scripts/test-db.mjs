import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
config({ path: resolve(root, '.env') });
config({ path: resolve(root, 'apps/api/.env') });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const parsed = new URL(url);
const poolConfig = {
  host: parsed.hostname === 'localhost' ? '127.0.0.1' : parsed.hostname,
  port: parsed.port ? Number(parsed.port) : 3306,
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, ''),
  allowPublicKeyRetrieval: true,
  connectionLimit: 2,
};

console.log(
  `Connecting to ${poolConfig.user}@${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`,
);

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(poolConfig) });

try {
  await prisma.$connect();
  const customers = await prisma.customer.count();
  const routers = await prisma.mikrotikRouter.count();
  console.log(`OK customers=${customers} routers=${routers}`);
} catch (error) {
  const message =
    error?.cause?.cause?.message ??
    error?.cause?.message ??
    error?.message ??
    String(error);
  console.error('FAIL', message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
