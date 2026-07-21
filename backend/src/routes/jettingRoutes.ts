import { Router } from "express";

import { listEngineProfiles } from "../data/jettingProfiles";
import {
  calculateJettingRecommendation,
  JettingValidationError,
  type JettingInputs,
} from "../services/jetting/jettingCalculator";

const router = Router();

/** GET /api/jetting/profiles — available engine profiles for the advisor. */
router.get("/profiles", (_req, res) => {
  res.json({ profiles: listEngineProfiles() });
});

/** POST /api/jetting/recommendation — baseline jetting advisory. */
router.post("/recommendation", (req, res) => {
  try {
    const recommendation = calculateJettingRecommendation(
      (req.body ?? {}) as JettingInputs
    );
    res.json({ recommendation });
  } catch (error) {
    if (error instanceof JettingValidationError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Jetting route error:", error);
    res.status(500).json({ error: "Failed to calculate jetting recommendation." });
  }
});

export default router;
