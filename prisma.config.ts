import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";

// Load .env file explicitly for prisma CLI commands
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // For migrations and CLI commands, use direct connection (not pgbouncer pooler)
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
