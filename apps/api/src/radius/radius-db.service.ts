import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as mariadb from 'mariadb';

@Injectable()
export class RadiusDbService implements OnModuleDestroy {
  private readonly logger = new Logger(RadiusDbService.name);
  private pool: mariadb.Pool | null = null;

  isConfigured(): boolean {
    return Boolean(process.env.RADIUS_DB_HOST?.trim());
  }

  async query<T>(
    sql: string,
    params: Record<string, unknown> = {},
  ): Promise<T[]> {
    const pool = await this.getPool();
    return pool.query(sql, params) as Promise<T[]>;
  }

  async execute(
    sql: string,
    params: Record<string, unknown> = {},
  ): Promise<number> {
    const pool = await this.getPool();
    const result = await pool.query(sql, params);
    return Number((result as { affectedRows?: number }).affectedRows ?? 0);
  }

  private async getPool(): Promise<mariadb.Pool> {
    if (this.pool) return this.pool;

    const host = process.env.RADIUS_DB_HOST?.trim();
    if (!host) {
      throw new Error('RADIUS_DB_HOST is not configured');
    }

    this.pool = mariadb.createPool({
      host,
      port: Number(process.env.RADIUS_DB_PORT ?? 3307),
      user: process.env.RADIUS_DB_USER ?? 'radius',
      password: process.env.RADIUS_DB_PASSWORD ?? 'radiuspass',
      database: process.env.RADIUS_DB_NAME ?? 'radius',
      connectionLimit: Number(process.env.RADIUS_DB_CONNECTION_LIMIT ?? 5),
      namedPlaceholders: true,
    });

    this.logger.log(`RADIUS DB pool ready (${host})`);
    return this.pool;
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
