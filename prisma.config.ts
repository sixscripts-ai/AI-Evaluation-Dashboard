// Prisma 7 configuration
//
// DATABASE_URL = pooled connection (used by PrismaClient at runtime via adapter)
// DIRECT_URL   = direct connection (used by Prisma CLI for migrations)
//
// For Neon:
//   DATABASE_URL = pooled connection string (includes ?pgbouncer=true&connection_limit=1)
//   DIRECT_URL   = direct connection string
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
