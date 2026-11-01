import { Injectable } from '@nestjs/common';
import { RadiusDbService } from './radius-db.service';

export type RadiusActiveSessionUsage = {
  radacctId: number;
  username: string;
  nasIpAddress: string;
  framedIpAddress: string | null;
  callingStationId: string | null;
  acctStartTime: string | null;
  acctUpdateTime: string | null;
  acctSessionTime: number;
  uploadBytes: string;
  downloadBytes: string;
  totalBytes: string;
};

export type RadiusAggregatedBandwidthUser = {
  username: string;
  uploadBytes: string;
  downloadBytes: string;
  totalBytes: string;
};

@Injectable()
export class RadiusSessionMonitorService {
  constructor(private readonly radiusDb: RadiusDbService) {}

  isConfigured() {
    return this.radiusDb.isConfigured();
  }

  async listActiveSessions(nasIpAddress?: string) {
    if (!this.radiusDb.isConfigured()) {
      return [];
    }

    const rows = await this.radiusDb.query<{
      radacctId: number;
      username: string;
      nasIpAddress: string;
      framedIpAddress: string | null;
      callingStationId: string | null;
      acctStartTime: Date | null;
      acctUpdateTime: Date | null;
      acctSessionTime: number | null;
      uploadBytes: number | null;
      downloadBytes: number | null;
    }>(
      `
        SELECT
          radacctid AS radacctId,
          username,
          nasipaddress AS nasIpAddress,
          NULLIF(framedipaddress, '') AS framedIpAddress,
          NULLIF(callingstationid, '') AS callingStationId,
          acctstarttime AS acctStartTime,
          acctupdatetime AS acctUpdateTime,
          COALESCE(acctsessiontime, 0) AS acctSessionTime,
          COALESCE(acctinputoctets, 0) AS uploadBytes,
          COALESCE(acctoutputoctets, 0) AS downloadBytes
        FROM radacct
        WHERE acctstoptime IS NULL
          AND (:nasIpAddress = '' OR nasipaddress = :nasIpAddress)
        ORDER BY COALESCE(acctupdatetime, acctstarttime) DESC
      `,
      { nasIpAddress: nasIpAddress?.trim() ?? '' },
    );

    return rows.map((row) => this.mapSession(row));
  }

  async getTopBandwidthUsers(limit = 10, nasIpAddress?: string) {
    if (!this.radiusDb.isConfigured()) {
      return [];
    }

    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const rows = await this.radiusDb.query<{
      radacctId: number;
      username: string;
      nasIpAddress: string;
      framedIpAddress: string | null;
      callingStationId: string | null;
      acctStartTime: Date | null;
      acctUpdateTime: Date | null;
      acctSessionTime: number | null;
      uploadBytes: number | null;
      downloadBytes: number | null;
    }>(
      `
        SELECT
          radacctid AS radacctId,
          username,
          nasipaddress AS nasIpAddress,
          NULLIF(framedipaddress, '') AS framedIpAddress,
          NULLIF(callingstationid, '') AS callingStationId,
          acctstarttime AS acctStartTime,
          acctupdatetime AS acctUpdateTime,
          COALESCE(acctsessiontime, 0) AS acctSessionTime,
          COALESCE(acctinputoctets, 0) AS uploadBytes,
          COALESCE(acctoutputoctets, 0) AS downloadBytes
        FROM radacct
        WHERE acctstoptime IS NULL
          AND (:nasIpAddress = '' OR nasipaddress = :nasIpAddress)
        ORDER BY (COALESCE(acctinputoctets, 0) + COALESCE(acctoutputoctets, 0)) DESC
        LIMIT ${safeLimit}
      `,
      { nasIpAddress: nasIpAddress?.trim() ?? '' },
    );

    return rows.map((row) => this.mapSession(row));
  }

  async getAggregatedTopBandwidthUsers(limit = 10) {
    if (!this.radiusDb.isConfigured()) {
      return [];
    }

    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const rows = await this.radiusDb.query<{
      username: string;
      uploadBytes: number | null;
      downloadBytes: number | null;
      totalBytes: number | null;
    }>(
      `
        SELECT
          username,
          SUM(COALESCE(acctinputoctets, 0)) AS uploadBytes,
          SUM(COALESCE(acctoutputoctets, 0)) AS downloadBytes,
          SUM(COALESCE(acctinputoctets, 0) + COALESCE(acctoutputoctets, 0)) AS totalBytes
        FROM radacct
        WHERE acctstoptime IS NULL
        GROUP BY username
        ORDER BY totalBytes DESC
        LIMIT ${safeLimit}
      `,
    );

    return rows.map((row) => {
      const upload = BigInt(row.uploadBytes ?? 0);
      const download = BigInt(row.downloadBytes ?? 0);

      return {
        username: row.username,
        uploadBytes: upload.toString(),
        downloadBytes: download.toString(),
        totalBytes: (upload + download).toString(),
      } satisfies RadiusAggregatedBandwidthUser;
    });
  }

  private mapSession(row: {
    radacctId: number;
    username: string;
    nasIpAddress: string;
    framedIpAddress: string | null;
    callingStationId: string | null;
    acctStartTime: Date | null;
    acctUpdateTime: Date | null;
    acctSessionTime: number | null;
    uploadBytes: number | null;
    downloadBytes: number | null;
  }): RadiusActiveSessionUsage {
    const upload = BigInt(row.uploadBytes ?? 0);
    const download = BigInt(row.downloadBytes ?? 0);

    return {
      radacctId: Number(row.radacctId),
      username: row.username,
      nasIpAddress: row.nasIpAddress,
      framedIpAddress: row.framedIpAddress,
      callingStationId: row.callingStationId,
      acctStartTime: row.acctStartTime?.toISOString() ?? null,
      acctUpdateTime: row.acctUpdateTime?.toISOString() ?? null,
      acctSessionTime: Number(row.acctSessionTime ?? 0),
      uploadBytes: upload.toString(),
      downloadBytes: download.toString(),
      totalBytes: (upload + download).toString(),
    };
  }
}
