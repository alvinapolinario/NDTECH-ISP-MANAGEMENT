import { getSuspendedPppProfileName } from '../mikrotik/mikrotik-profile.config';

export function isRadiusProvisionEnabled() {
  if (process.env.RADIUS_PROVISION_ENABLED?.trim().toLowerCase() === 'false') {
    return false;
  }

  return Boolean(process.env.RADIUS_DB_HOST?.trim());
}

export function getRadiusSuspendedGroupName() {
  return (
    process.env.RADIUS_SUSPENDED_GROUP?.trim() ||
    getSuspendedPppProfileName()
  );
}

export function shouldUseMikrotikProfileProvisioning() {
  return !isRadiusProvisionEnabled();
}
