import { prisma } from "../db";
import { LimitError } from "./kartService";

/**
 * Kart configurations are setup snapshots owned (transitively) by a user via
 * their parent kart. Every operation first verifies the kart belongs to the
 * requesting user, so a configuration can never leak across accounts.
 */
async function assertKartOwned(userId: string, kartId: string) {
  const kart = await prisma.kart.findFirst({ where: { id: kartId, userId } });
  if (!kart) throw new LimitError("Kart not found.", 404);
  return kart;
}

export async function listKartConfigs(userId: string, kartId: string) {
  await assertKartOwned(userId, kartId);
  return prisma.kartConfiguration.findMany({
    where: { kartId },
    orderBy: { createdAt: "desc" },
  });
}

type ConfigInput = {
  name?: string;
  chassis?: string | null;
  axle?: string | null;
  rideHeight?: string | null;
  tyres?: string | null;
  engine?: string | null;
  trackWidthFront?: number | string | null;
  trackWidthRear?: number | string | null;
  gearFront?: number | string | null;
  gearRear?: number | string | null;
  airTempC?: number | string | null;
  trackTempC?: number | string | null;
  weatherCondition?: string | null;
  notes?: string | null;
};

const str = (v: string | null | undefined) => v?.trim() || null;

/** Coerce a numeric field; blank/invalid → null (never throws on bad input). */
const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Fields common to create and update, normalized from raw request input. */
function normalize(input: ConfigInput) {
  return {
    chassis: str(input.chassis),
    axle: str(input.axle),
    rideHeight: str(input.rideHeight),
    tyres: str(input.tyres),
    engine: str(input.engine),
    trackWidthFront: num(input.trackWidthFront),
    trackWidthRear: num(input.trackWidthRear),
    gearFront: num(input.gearFront),
    gearRear: num(input.gearRear),
    airTempC: num(input.airTempC),
    trackTempC: num(input.trackTempC),
    weatherCondition: str(input.weatherCondition),
    notes: str(input.notes),
  };
}

export async function createKartConfig(
  userId: string,
  kartId: string,
  input: ConfigInput
) {
  await assertKartOwned(userId, kartId);

  const name = (input.name ?? "").trim();
  if (!name) throw new LimitError("Configuration name is required.", 400);

  return prisma.kartConfiguration.create({
    data: { kartId, name, ...normalize(input) },
  });
}

export async function updateKartConfig(
  userId: string,
  kartId: string,
  id: string,
  input: ConfigInput
) {
  await assertKartOwned(userId, kartId);

  const existing = await prisma.kartConfiguration.findFirst({
    where: { id, kartId },
  });
  if (!existing) throw new LimitError("Configuration not found.", 404);

  return prisma.kartConfiguration.update({
    where: { id },
    data: { name: input.name?.trim() || existing.name, ...normalize(input) },
  });
}

export async function deleteKartConfig(
  userId: string,
  kartId: string,
  id: string
): Promise<boolean> {
  await assertKartOwned(userId, kartId);
  const result = await prisma.kartConfiguration.deleteMany({
    where: { id, kartId },
  });
  return result.count > 0;
}
