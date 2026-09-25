import { Injectable } from '@nestjs/common';
import { RadiusDbService } from './radius-db.service';

export type RadiusSubscriberRow = {
  username: string;
  groupname: string | null;
  priority: number | null;
  lastStart: Date | null;
  activeSessions: number;
};

@Injectable()
export class RadiusSubscribersService {
  constructor(private readonly radiusDb: RadiusDbService) {}

  async listSubscribers(options: {
    search?: string;
    groupname?: string;
    limit?: number;
  }): Promise<RadiusSubscriberRow[]> {
    if (!this.radiusDb.isConfigured()) {
      return [];
    }

    const search = options.search?.trim() ?? '';
    const like = `%${search}%`;
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);

    const rows = await this.radiusDb.query<RadiusSubscriberRow>(
      `
        SELECT
          c.username,
          u.groupname,
          u.priority,
          MAX(a.acctstarttime) AS lastStart,
          SUM(
            CASE
              WHEN a.acctstoptime IS NULL AND a.radacctid IS NOT NULL THEN 1
              ELSE 0
            END
          ) AS activeSessions
        FROM radcheck c
        LEFT JOIN radusergroup u ON u.username = c.username
        LEFT JOIN radacct a ON a.username = c.username
        WHERE c.attribute = 'Cleartext-Password'
          AND (:search = '' OR c.username LIKE :like OR u.groupname LIKE :like)
          AND (:groupname = '' OR u.groupname = :groupname)
        GROUP BY c.username, u.groupname, u.priority
        ORDER BY c.username ASC
        LIMIT :limit
      `,
      {
        search,
        like,
        groupname: options.groupname?.trim() ?? '',
        limit,
      },
    );

    return rows.map((row) => ({
      username: row.username,
      groupname: row.groupname,
      priority: row.priority,
      lastStart: row.lastStart ? new Date(row.lastStart) : null,
      activeSessions: Number(row.activeSessions ?? 0),
    }));
  }

  async getSubscriberPassword(username: string): Promise<string | null> {
    if (!this.radiusDb.isConfigured()) return null;

    const rows = await this.radiusDb.query<{ value: string }>(
      `
        SELECT value
        FROM radcheck
        WHERE username = :username
          AND attribute = 'Cleartext-Password'
        LIMIT 1
      `,
      { username },
    );

    return rows[0]?.value ?? null;
  }
}
