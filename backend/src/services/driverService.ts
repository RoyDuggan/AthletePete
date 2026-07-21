import type { Response } from "express";

import type { AuthedRequest } from "../middleware/requireAuth";
import { getDriverProfile, setDriverProfile } from "./driverProfileStore";
import {
  DRIVER_FRAMING_DIMENSIONS,
  getFramingOverrides,
  setFramingOverride,
  isFramingKey,
} from "./driverFramingStore";

/** GET /api/driver-profile — the caller's saved driver profile. */
export const handleGetDriverProfile = (req: AuthedRequest, res: Response) => {
  return res.status(200).json({ profile: getDriverProfile(req.userId!) });
};

/** PUT /api/driver-profile — upserts the caller's driver profile. */
export const handleSaveDriverProfile = (req: AuthedRequest, res: Response) => {
  const profile = setDriverProfile(req.userId!, req.body?.profile ?? req.body);
  return res.status(200).json({ profile });
};

/**
 * GET /api/driver-framing — the framing option dimensions (with defaults) plus
 * the current admin overrides. Available to any authenticated user so the
 * Driver Setup dropdowns can render; only Driver Admins can edit.
 */
export const handleGetDriverFraming = (_req: AuthedRequest, res: Response) => {
  return res.status(200).json({
    dimensions: DRIVER_FRAMING_DIMENSIONS,
    overrides: getFramingOverrides(),
  });
};

/**
 * PUT /api/driver-framing — upserts one framing fragment override (Driver Admin
 * only; gated by requireDriverAdmin on the route). Body: { key, text }. An empty
 * text resets that fragment to its default.
 */
export const handleSaveDriverFraming = (req: AuthedRequest, res: Response) => {
  const { key, text } = (req.body ?? {}) as { key?: unknown; text?: unknown };

  if (!isFramingKey(key)) {
    return res.status(400).json({ error: "Unknown framing key." });
  }
  if (typeof text !== "string") {
    return res.status(400).json({ error: "text must be a string." });
  }

  setFramingOverride(key, text);
  return res.status(200).json({ overrides: getFramingOverrides() });
};
