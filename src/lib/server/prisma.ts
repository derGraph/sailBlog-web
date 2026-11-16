import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../../prisma/generated/client';

function createPrismaClient() {
  const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST || 'localhost',
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'db',
    port: Number(process.env.DATABASE_PORT) || 3306,
    connectionLimit: 10,
    allowPublicKeyRetrieval: true
  });

  return new PrismaClient({ adapter });
}

// Vite can reload this module; keep its connection pool alive across development reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export { prisma };
