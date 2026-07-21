import type { Response, NextFunction } from "express";

import {
  getEntitlement,
  canAnalyse,
  canUpload,
} from "../services/entitlementsService";
import type { AuthedRequest } from "./requireAuth";

const TRIAL_ENDED =
  "Your free trial has ended. Subscribe to keep analysing telemetry.";
const NO_CREDITS =
  "You've used all your free credits. Subscribe to upload more telemetry.";

/** Gate for analysing already-loaded data: subscription OR active trial. */
export async function requireAnalysis(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const e = await getEntitlement(req.userId!);
  if (!e) return res.status(401).json({ error: "Not authenticated." });
  if (canAnalyse(e)) return next();
  return res.status(402).json({ error: TRIAL_ENDED, code: "trial_expired" });
}

/** Gate for loading a new dataset: subscription OR (active trial AND credits). */
export async function requireUploadCredit(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const e = await getEntitlement(req.userId!);
  if (!e) return res.status(401).json({ error: "Not authenticated." });
  if (canUpload(e)) return next();

  if (!e.subscriptionActive && !e.withinTrial) {
    return res.status(402).json({ error: TRIAL_ENDED, code: "trial_expired" });
  }
  return res.status(402).json({ error: NO_CREDITS, code: "no_credits" });
}
