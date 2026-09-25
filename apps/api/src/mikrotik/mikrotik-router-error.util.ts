import { BadGatewayException } from '@nestjs/common';

export function formatMikrotikRouterError(error: unknown): string {
  if (isEmptyListReply(error)) {
    return 'Router returned an empty list.';
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  const errno = (error as { errno?: number | string })?.errno;
  if (errno === -111 || errno === -61) {
    return 'Connection refused. Enable RouterOS API (/ip service enable api) and allow this server in the firewall.';
  }
  if (errno === -110 || errno === -60) {
    return 'Connection timed out. Check router host, routing, and firewall rules.';
  }

  return 'Unable to connect to MikroTik router.';
}

function isEmptyListReply(error: unknown) {
  const errno = (error as { errno?: unknown })?.errno;
  const message =
    error instanceof Error ? error.message : String(error ?? '');

  return errno === 'UNKNOWNREPLY' && message.includes('!empty');
}

export function toMikrotikRouterException(
  error: unknown,
  action: string,
  host: string,
  apiPort: number,
): BadGatewayException {
  return new BadGatewayException(
    `Unable to ${action} on ${host}:${apiPort}. ${formatMikrotikRouterError(error)}`,
  );
}
