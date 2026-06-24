export function getSuspendedPppProfileName() {
  return process.env.MIKROTIK_SUSPENDED_PROFILE?.trim() || 'suspended';
}

export function resolvePlanPppProfileName(plan: {
  pppoeProfileName: string | null;
  code: string;
  name: string;
}) {
  return plan.pppoeProfileName?.trim() || plan.code.trim() || plan.name.trim();
}
