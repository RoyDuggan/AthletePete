import { prisma } from "../db";

/** Free-tier cap on karts per user. */
export const MAX_KARTS = 2;

export class LimitError extends Error {
  constructor(message: string, public status = 403, public code?: string) {
    super(message);
  }
}

export function listKarts(userId: string) {
  return prisma.kart.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

type KartInput = {
  name?: string;
  chassis?: string | null;
  engine?: string | null;
  notes?: string | null;
};

export async function createKart(userId: string, input: KartInput) {
  const name = (input.name ?? "").trim();
  if (!name) throw new LimitError("Kart name is required.", 400);

  const count = await prisma.kart.count({ where: { userId } });
  if (count >= MAX_KARTS) {
    throw new LimitError(
      `Kart limit reached (${MAX_KARTS}). Upgrade to add more karts.`,
      403,
      "kart_limit"
    );
  }

  return prisma.kart.create({
    data: {
      userId,
      name,
      chassis: input.chassis?.trim() || null,
      engine: input.engine?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
}

export async function updateKart(
  userId: string,
  id: string,
  input: KartInput
) {
  const existing = await prisma.kart.findFirst({ where: { id, userId } });
  if (!existing) throw new LimitError("Kart not found.", 404);

  return prisma.kart.update({
    where: { id },
    data: {
      name: input.name?.trim() || existing.name,
      chassis: input.chassis !== undefined ? input.chassis?.trim() || null : existing.chassis,
      engine: input.engine !== undefined ? input.engine?.trim() || null : existing.engine,
      notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
    },
  });
}

export async function deleteKart(userId: string, id: string): Promise<boolean> {
  const result = await prisma.kart.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
