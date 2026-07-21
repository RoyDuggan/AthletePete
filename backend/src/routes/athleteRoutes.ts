import { Router } from "express";

import type { AuthedRequest } from "../middleware/requireAuth";
import {
  getAthleteProfile,
  setAthleteProfile,
} from "../services/athleteProfileStore";
import {
  generateTrainingPlan,
  hasEnoughToGenerate,
} from "../services/trainingPlanService";
import {
  getTrainingPlan,
  saveTrainingPlan,
} from "../services/trainingPlanStore";

/**
 * Athlete intake questionnaire + training plan, mounted behind requireAuth at
 * /api.
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

/** The caller's saved training plan (null if none generated yet). */
router.get("/training-plan", (req: AuthedRequest, res) => {
  return res.status(200).json({ plan: getTrainingPlan(req.userId!) });
});

/** Generate a program from the caller's saved questionnaire, and store it. */
router.post("/training-plan/generate", async (req: AuthedRequest, res) => {
  try {
    const answers = getAthleteProfile(req.userId!);
    if (!hasEnoughToGenerate(answers)) {
      return res.status(400).json({
        error: "Fill in your athlete profile questionnaire first.",
      });
    }
    const text = await generateTrainingPlan(answers);
    const plan = saveTrainingPlan(req.userId!, text, "generated");
    return res.status(200).json({ plan });
  } catch (error) {
    console.error("Training plan generation error:", error);
    const message =
      error instanceof Error ? error.message : "Could not generate the program.";
    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return res.status(status).json({ error: message });
  }
});

export default router;
