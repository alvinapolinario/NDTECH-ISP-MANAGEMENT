"use client";

import { apiRequest } from "@/lib/api";

export type Tr069Config = {
  enabled: boolean;
  nbiUrl: string | null;
  cwmpUrl: string | null;
};

export type OnuTr069Status = {
  onuDeviceId?: number;
  serialNumber: string;
  configured: Tr069Config;
  linked: boolean;
  device: {
    deviceId: string;
    serialNumber: string | null;
    manufacturer: string | null;
    productClass: string | null;
    lastInform: string | null;
    tags: string[];
    parameters: Record<string, string | number | boolean | null>;
  } | null;
};

export function fetchTr069Config() {
  return apiRequest<Tr069Config>("/onu-devices/tr069/config");
}

export function fetchTr069LookupBySerial(serial: string) {
  const params = new URLSearchParams({ serial });
  return apiRequest<Omit<OnuTr069Status, "onuDeviceId">>(
    `/onu-devices/tr069/lookup?${params.toString()}`,
  );
}

export function fetchOnuTr069Status(onuDeviceId: number) {
  return apiRequest<OnuTr069Status>(`/onu-devices/${onuDeviceId}/tr069/status`);
}

export function setOnuWifiSsidTr069(
  onuDeviceId: number,
  body: { ssid: string; ssid5g?: string },
) {
  return apiRequest(`/onu-devices/${onuDeviceId}/tr069/wifi-ssid`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function setOnuWifiPasswordTr069(onuDeviceId: number, body: { password: string }) {
  return apiRequest(`/onu-devices/${onuDeviceId}/tr069/wifi-password`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function setOnuPppoeTr069(
  onuDeviceId: number,
  body: { username: string; password: string },
) {
  return apiRequest(`/onu-devices/${onuDeviceId}/tr069/pppoe`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function rebootOnuTr069(onuDeviceId: number) {
  return apiRequest(`/onu-devices/${onuDeviceId}/tr069/reboot`, {
    method: "POST",
  });
}

export function refreshOnuTr069(onuDeviceId: number) {
  return apiRequest(`/onu-devices/${onuDeviceId}/tr069/refresh`, {
    method: "POST",
  });
}
