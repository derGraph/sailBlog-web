import { PrismaMariaDb } from '@prisma/adapter-mariadb';
// Change this line:
import { PrismaClient } from '@prisma-custom/client';

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME || 'db',
  port: Number(process.env.DATABASE_PORT) || 3306,
  connectionLimit: 5
});

const prisma = new PrismaClient({ adapter });

export { prisma };
