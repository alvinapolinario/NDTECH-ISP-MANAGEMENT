import { Injectable, Logger } from '@nestjs/common';
import { RadiusDbService } from './radius-db.service';
import {
  parseMikrotikRateLimit,
  resolveProfileSpeedMbps,
} from './radius-rate-limit.util';

export type RadiusProfileRow = {
  groupname: string;
  displayName: string | null;
  rateLimit: string | null;
  uploadRate: string | null;
  downloadRate: string | null;
  dataCapMb: number | null;
  fupEnabled: boolean;
  fupThresholdMb: number | null;
  fupRateLimit: string | null;
  attributeCount: number;
  subscriberCount: number;
};

export type RadiusProfile = RadiusProfileRow & {
  downloadMbps: number | null;
  uploadMbps: number | null;
};

@Injectable()
export class RadiusProfilesService {
  private readonly logger = new Logger(RadiusProfilesService.name);

  constructor(private readonly radiusDb: RadiusDbService) {}

  async listProfiles(): Promise<RadiusProfile[]> {
    if (!this.radiusDb.isConfigured()) {
      return [];
    }

    let rows: RadiusProfileRow[];

    try {
      rows = await this.queryProfilesWithUiMetadata();
    } catch (error) {
      this.logger.warn(
        `Falling back to radgroupreply-only profile query: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      rows = await this.queryProfilesFromGroupReply();
    }

    return rows.map((row) => this.toRadiusProfile(row));
  }

  private toRadiusProfile(row: RadiusProfileRow): RadiusProfile {
    const { downloadMbps, uploadMbps } = resolveProfileSpeedMbps({
      rateLimit: row.rateLimit,
      downloadRate: row.downloadRate,
      uploadRate: row.uploadRate,
    });

    return {
      ...row,
      downloadMbps,
      uploadMbps,
    };
  }

  private async queryProfilesWithUiMetadata(): Promise<RadiusProfileRow[]> {
    return this.radiusDb.query<RadiusProfileRow>(
      `
        SELECT
          r.groupname,
          MAX(p.display_name) AS displayName,
          MAX(CASE WHEN r.attribute = 'Mikrotik-Rate-Limit' THEN r.value END) AS rateLimit,
          MAX(p.upload_rate) AS uploadRate,
          MAX(p.download_rate) AS downloadRate,
          MAX(p.data_cap_mb) AS dataCapMb,
          MAX(CASE WHEN p.fup_enabled = 1 THEN 1 ELSE 0 END) AS fupEnabled,
          MAX(p.fup_threshold_mb) AS fupThresholdMb,
          MAX(p.fup_rate_limit) AS fupRateLimit,
          COUNT(DISTINCT r.id) AS attributeCount,
          COUNT(DISTINCT u.username) AS subscriberCount
        FROM radgroupreply r
        LEFT JOIN radusergroup u ON u.groupname = r.groupname
        LEFT JOIN ui_profiles p ON p.groupname = r.groupname
        GROUP BY r.groupname
        ORDER BY r.groupname ASC
      `,
    ).then((rows) =>
      rows.map((row) => ({
        ...row,
        fupEnabled: Boolean(Number(row.fupEnabled ?? 0)),
        dataCapMb:
          row.dataCapMb == null ? null : Number(row.dataCapMb),
        fupThresholdMb:
          row.fupThresholdMb == null ? null : Number(row.fupThresholdMb),
        attributeCount: Number(row.attributeCount ?? 0),
        subscriberCount: Number(row.subscriberCount ?? 0),
      })),
    );
  }

  private async queryProfilesFromGroupReply(): Promise<RadiusProfileRow[]> {
    return this.radiusDb.query<RadiusProfileRow>(
      `
        SELECT
          r.groupname,
          NULL AS displayName,
          MAX(CASE WHEN r.attribute = 'Mikrotik-Rate-Limit' THEN r.value END) AS rateLimit,
          NULL AS uploadRate,
          NULL AS downloadRate,
          NULL AS dataCapMb,
          0 AS fupEnabled,
          NULL AS fupThresholdMb,
          NULL AS fupRateLimit,
          COUNT(DISTINCT r.id) AS attributeCount,
          COUNT(DISTINCT u.username) AS subscriberCount
        FROM radgroupreply r
        LEFT JOIN radusergroup u ON u.groupname = r.groupname
        GROUP BY r.groupname
        ORDER BY r.groupname ASC
      `,
    ).then((rows) =>
      rows.map((row) => ({
        ...row,
        fupEnabled: false,
        dataCapMb: null,
        fupThresholdMb: null,
        attributeCount: Number(row.attributeCount ?? 0),
        subscriberCount: Number(row.subscriberCount ?? 0),
      })),
    );
  }

  parseRateLimit(rateLimit: string | null | undefined) {
    return parseMikrotikRateLimit(rateLimit);
  }
}
