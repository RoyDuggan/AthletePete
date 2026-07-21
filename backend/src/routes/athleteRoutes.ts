import { Router } from "express";

import type { AuthedRequest } from "../middleware/requireAuth";
import {
  getAthleteProfile,
  setAthleteProfile,
} from "../services/athleteProfileStore";

/**
 * Athlete intake questionnaire, mounted behind requireAuth at /api.
 * - GET /athlete-profile → the caller's saved answers ({} if none).
 * - PUT /athlete-profile → upsert the answers map.
 */
const router = Router();

router.get("/athlete-profile", (req: AuthedRequest, res) => {
  return res.status(200).json({ answers: getAthleteProfile(req.userId!) });
});

router.put("/athlete-profile", (req: AuthedRequest, res) => {
  const answers = (req.body ?? {}).answers;
  if (!answers || typeof answers !== "object") {
    return res.status(400).json({ error: "answers object is required." });
  }
  return res.status(200).json({ answers: setAthleteProfile(req.userId!, answers) });
});

export default router;
