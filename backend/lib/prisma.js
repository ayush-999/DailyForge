const { PrismaClient } = require("../prisma/generated/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Singleton to avoid exhausting the connection pool in dev (hot reload)
const prisma = global.__prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") global.__prisma = prisma;

module.exports = prisma;
