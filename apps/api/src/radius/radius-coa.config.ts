import { isRadiusProvisionEnabled } from './radius-provision.config';

export function isRadiusCoaEnabled() {
  if (process.env.RADIUS_COA_ENABLED?.trim().toLowerCase() === 'false') {
    return false;
  }

  return isRadiusProvisionEnabled();
}

export function getRadiusCoaPort() {
  return Number(process.env.RADIUS_COA_PORT ?? 3799);
}

export function getRadiusCoaTimeoutMs() {
  return Number(process.env.RADIUS_COA_TIMEOUT_MS ?? 3000);
}

export function getRadiusDefaultNasSecret() {
  return process.env.RADIUS_DEFAULT_NAS_SECRET?.trim() || '';
}

export function shouldMockRadiusCoa() {
  return process.env.RADIUS_COA_USE_MOCK?.trim().toLowerCase() === 'true';
}
