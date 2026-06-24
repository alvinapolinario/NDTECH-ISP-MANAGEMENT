export type CollectorAuthQrPayload = {
  v: 1;
  apiUrl: string;
  token: string;
};

export const COLLECTOR_MOBILE_API_URL_KEY = "ndtech_collector_mobile_api_url";

export function normalizeMobileApiUrl(raw: string) {
  let url = raw.trim();
  if (!url) return "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `http://${url}`;
  }
  return url.replace(/\/+$/, "");
}

export function buildCollectorAuthQrPayload(apiUrl: string, token: string): string {
  const payload: CollectorAuthQrPayload = {
    v: 1,
    apiUrl: normalizeMobileApiUrl(apiUrl),
    token: token.trim(),
  };
  return JSON.stringify(payload);
}

export function isLocalhostApiUrl(apiUrl: string) {
  try {
    const host = new URL(normalizeMobileApiUrl(apiUrl)).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

export function readStoredMobileApiUrl(fallback: string) {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(COLLECTOR_MOBILE_API_URL_KEY);
  return stored ? normalizeMobileApiUrl(stored) : fallback;
}

export function storeMobileApiUrl(apiUrl: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    COLLECTOR_MOBILE_API_URL_KEY,
    normalizeMobileApiUrl(apiUrl),
  );
}
