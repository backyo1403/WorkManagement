import { PrismaClient } from '@prisma/client';

/**
 * Next.js dev mode reloads modules on every edit, which would otherwise open a
 * new pool of SQLite connections each time. Cache the client on globalThis.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
