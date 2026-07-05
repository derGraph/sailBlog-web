import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../../prisma/generated/client'; 

// Initialize the driver adapter with your connection credentials
const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'prisma',
  password: process.env.DATABASE_PASSWORD || 'sailBlog' ,
  database: process.env.DATABASE_NAME || 'db',
  port: Number(process.env.DATABASE_PORT) || 3306,
  connectionLimit: 5, // Recommended for connection pooling in Prisma 7
});

const prisma = new PrismaClient({ adapter });

export { prisma };