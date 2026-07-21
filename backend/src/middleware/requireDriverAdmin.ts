import type { Response, NextFunction } from "express";

import { prisma } from "../db";
import type { AuthedRequest } from "./requireAuth";

/**
 * Gate for Driver-Admin-only actions (managing the shared AI framing prompts).
 * Assumes requireAuth ran first (so req.userId is set). The flag is set only by
 * a site admin via direct DB access — it is never user-configurable.
 */
export async function requireDriverAdmin(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { driverAdmin: true },
  });

  if (!user?.driverAdmin) {
    return res.status(403).json({ error: "Driver Admin access required." });
  }

  return next();
}
