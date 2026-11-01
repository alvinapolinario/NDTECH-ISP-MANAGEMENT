import type { SnmpScalarValue } from './snmp.types';

export function parseOpticalPowerDbm(raw: SnmpScalarValue): number | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim().toLowerCase();
  if (!text || text === 'n/a' || text === 'na') return null;

  const parenMatch = text.match(/\(([-+]?\d+(?:\.\d+)?)\s*dbm\)/i);
  if (parenMatch) return roundDbm(Number(parenMatch[1]));

  const dbmMatch = text.match(/([-+]?\d+(?:\.\d+)?)\s*dbm/i);
  if (dbmMatch) return roundDbm(Number(dbmMatch[1]));

  if (/^-?\d+(\.\d+)?$/.test(text)) {
    const numeric = Number(text);
    if (Math.abs(numeric) > 100) return roundDbm(numeric / 100);
    return roundDbm(numeric);
  }

  return null;
}

export function parseInteger(raw: SnmpScalarValue): number | null {
  if (raw === null || raw === undefined) return null;
  const numeric = Number(String(raw).replace(/[^\d.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

export function normalizeVendor(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export function isVsolVendor(vendor: string): boolean {
  const normalized = normalizeVendor(vendor);
  return normalized.includes('vsol') || normalized.includes('vsolution');
}

export function isCdataVendor(vendor: string): boolean {
  const normalized = normalizeVendor(vendor);
  return normalized.includes('cdata') || normalized.includes('cdta');
}

export function isMikrotikVendor(vendor: string): boolean {
  return normalizeVendor(vendor).includes('mikrotik');
}

export function isUnifiVendor(vendor: string): boolean {
  const normalized = normalizeVendor(vendor);
  return normalized.includes('unifi') || normalized.includes('ubiquiti');
}

export function isEdgeSwitchVendor(vendor: string): boolean {
  return normalizeVendor(vendor).includes('edgeswitch');
}

function roundDbm(value: number): number {
  return Math.round(value * 100) / 100;
}
