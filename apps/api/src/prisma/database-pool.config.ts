const DEFAULT_DATABASE_URL =
  'mysql://root:password@localhost:3306/isp_billing';

export function resolveDatabaseUrl() {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

function resolveDatabaseHost(hostname: string) {
  // Windows MariaDB often uses auth_gssapi_client for "localhost" only.
  return hostname === 'localhost' ? '127.0.0.1' : hostname;
}

export function createDatabasePoolConfig() {
  const url = new URL(resolveDatabaseUrl());

  return {
    host: resolveDatabaseHost(url.hostname),
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    allowPublicKeyRetrieval: true,
    connectionLimit: 10,
    acquireTimeout: 30_000,
    connectTimeout: 10_000,
  };
}
