import { PrismaClient } from "../prisma/generated/client/index.js";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var __db: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({ adapter });
}

// Singleton — avoids exhausting connection pools on Next.js hot-reloads
export const db: PrismaClient =
  globalThis.__db ?? (globalThis.__db = createClient());

if (process.env.NODE_ENV !== "production") {
  globalThis.__db = db;
}

export type { PrismaClient } from "../prisma/generated/client/index.js";
