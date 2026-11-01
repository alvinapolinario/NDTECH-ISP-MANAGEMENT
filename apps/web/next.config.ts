import { config } from "dotenv";
import { resolve } from "path";
import type { NextConfig } from "next";

const rootEnvFile =
  process.env.DOCKER_ENV === "true" ? ".env.docker" : ".env";

config({ path: resolve(__dirname, "../../", rootEnvFile) });

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/isp-billing";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? `${basePath}/backend`;
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? apiUrl;

const nextConfig: NextConfig = {
  output: "standalone",
  basePath,
  trailingSlash: true,
  allowedDevOrigins: ["10.250.106.199", "172.27.201.182", "localhost", "127.0.0.1"],
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_SOCKET_URL: socketUrl,
  },
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: "http://api:4000/:path*",
      },
    ];
  },
};

export default nextConfig;
