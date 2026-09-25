export type ParsedRateLimit = {
  downloadMbps: number | null;
  uploadMbps: number | null;
};

function parseRateToken(token: string | null | undefined): number | null {
  const trimmed = token?.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d+(?:\.\d+)?)([kKmMgG])?$/);
  if (!match) return null;

  const value = Number(match[1]);
  const unit = (match[2] ?? 'M').toUpperCase();

  if (unit === 'G') return Math.round(value * 1000);
  if (unit === 'M') return Math.round(value);
  if (unit === 'K') return Math.max(1, Math.round(value / 1000));

  return Math.round(value);
}

export function parseMikrotikRateLimit(
  rateLimit: string | null | undefined,
): ParsedRateLimit {
  if (!rateLimit?.trim()) {
    return { downloadMbps: null, uploadMbps: null };
  }

  const [downloadToken, uploadToken] = rateLimit.split('/');
  return {
    downloadMbps: parseRateToken(downloadToken),
    uploadMbps: parseRateToken(uploadToken),
  };
}

export function resolveProfileSpeedMbps(profile: {
  rateLimit?: string | null;
  downloadRate?: string | null;
  uploadRate?: string | null;
}): ParsedRateLimit {
  const fromRateLimit = parseMikrotikRateLimit(profile.rateLimit);
  if (fromRateLimit.downloadMbps != null || fromRateLimit.uploadMbps != null) {
    return fromRateLimit;
  }

  return {
    downloadMbps: parseRateToken(profile.downloadRate),
    uploadMbps: parseRateToken(profile.uploadRate),
  };
}
