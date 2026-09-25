export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = BASE_PATH.replace(/\/$/, "");

  if (!base) {
    return normalizedPath;
  }

  if (normalizedPath === base || normalizedPath.startsWith(`${base}/`)) {
    return normalizedPath;
  }

  return `${base}${normalizedPath}`;
}
