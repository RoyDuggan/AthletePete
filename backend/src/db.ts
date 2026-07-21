import { PrismaClient } from "@prisma/client";

/**
 * Single shared Prisma client. The constructor is lazy (it does not open a
 * connection until the first query), so importing this is safe even before the
 * database is reachable / DATABASE_URL is configured.
 */
export const prisma = new PrismaClient();

/** Lightweight connectivity probe for the health endpoint. */
export async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
