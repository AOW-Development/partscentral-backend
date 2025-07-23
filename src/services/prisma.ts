import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prismadb: PrismaClient | undefined;
}

const globalForPrisma = global as typeof globalThis & { prismadb?: PrismaClient };

export const prisma =
  globalForPrisma.prismadb ??
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismadb = prisma;