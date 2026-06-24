import { config } from "dotenv";
import { resolve } from "path";
import type { NextConfig } from "next";

config({ path: resolve(__dirname, "../../.env") });

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? apiUrl;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_SOCKET_URL: socketUrl,
  },
};

export default nextConfig;
