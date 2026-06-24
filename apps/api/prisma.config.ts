import { config } from "dotenv";
import { defineConfig } from "prisma/config";

const rootEnvFile =
  process.env.DOCKER_ENV === "true" ? "../../.env.docker" : "../../.env";

config({ path: rootEnvFile });
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
