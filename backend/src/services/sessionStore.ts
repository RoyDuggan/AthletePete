import { prisma } from "../db";

/** Free-tier cap on stored telemetry sessions per user. */
export const MAX_SESSIONS = 100;

export function countSessions(userId: string): Promise<number> {
  return prisma.session.count({ where: { userId } });
}

export async function createSessions(
  userId: string,
  items: {
    storageKey: string;
    name: string;
    originalName?: string | null;
    sizeBytes?: number | null;
  }[]
): Promise<void> {
  if (items.length === 0) return;
  await prisma.session.createMany({
    data: items.map((i) => ({
      userId,
      storageKey: i.storageKey,
      name: i.name,
      originalName: i.originalName ?? null,
      sizeBytes: i.sizeBytes ?? null,
    })),
  });
}

/**
 * Maps each already-stored session `name` (the reference string) to its
 * storageKey for this user, for the given candidate names. Used to detect and
 * skip duplicate uploads. When a name has several stored copies the earliest
 * (by upload time) wins, so re-uploads always resolve to the original file.
 */
export async function findStorageKeysByNames(
  userId: string,
  names: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const rows = await prisma.session.findMany({
    where: { userId, name: { in: unique } },
    select: { name: true, storageKey: true },
    orderBy: { uploadedAt: "asc" },
  });

  const byName = new Map<string, string>();
  for (const row of rows) {
    if (!byName.has(row.name)) byName.set(row.name, row.storageKey);
  }
  return byName;
}

/** Whether this user owns the session stored under `storageKey` (the file name). */
export async function userOwnsSession(
  userId: string,
  storageKey: string
): Promise<boolean> {
  const found = await prisma.session.findFirst({
    where: { userId, storageKey },
    select: { id: true },
  });
  return Boolean(found);
}

export function listSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
  });
}

/**
 * Deletes a session row (by id) if it belongs to the user, returning its
 * storageKey so the caller can remove the underlying file. Null if not found.
 */
export async function deleteSession(
  userId: string,
  id: string
): Promise<string | null> {
  const found = await prisma.session.findFirst({
    where: { id, userId },
    select: { storageKey: true },
  });
  if (!found) return null;
  await prisma.session.delete({ where: { id } });
  return found.storageKey;
}
