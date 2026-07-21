import type { Response, NextFunction } from "express";

import { prisma } from "../db";
import type { AuthedRequest } from "./requireAuth";

/**
 * Gate for coach-only actions (reviewing/curating athletes' training plans).
 * Uses the `driverAdmin` flag as the coach role (set by a site admin via the
 * database). Assumes requireAuth ran first.
 */
export async function requireCoach(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { driverAdmin: true },
  });
  if (!user?.driverAdmin) {
    return res.status(403).json({ error: "Coach access required." });
  }
  return next();
}
