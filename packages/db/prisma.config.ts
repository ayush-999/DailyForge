import path from "node:path";
import { defineConfig } from "prisma/config";
import { readFileSync } from "node:fs";

// Manually load packages/db/.env — Prisma 7 does not auto-read .env files
// when datasource.url is supplied programmatically.
try {
  const raw = readFileSync(path.join(__dirname, ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const match = line.match(/^([^#=\s]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (match) process.env[match[1]] ??= match[2];
  }
} catch {
  // .env is optional — DATABASE_URL may come from the host environment
}

export default defineConfig({
  schema: path.join(__dirname, "prisma/schema.prisma"),
  migrations: {
    path: path.join(__dirname, "prisma/migrations"),
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
  },
});
