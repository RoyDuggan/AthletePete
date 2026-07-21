import { Router } from "express";

import { prisma } from "../db";
import type { AuthedRequest } from "../middleware/requireAuth";
import { getAthleteProfile } from "../services/athleteProfileStore";
import {
  getTrainingPlan,
  saveTrainingPlan,
  listPlanStatuses,
  type TrainingPlan,
} from "../services/trainingPlanStore";

/**
 * Coach curation, mounted behind requireAuth + requireCoach at /api/coach.
 * A coach reviews and edits athletes' AI-generated programs before they're
 * finalised.
 */
const router = Router();

/** Roster: athletes (non-coach users) who have a profile and/or a plan. */
router.get("/athletes", async (_req: AuthedRequest, res) => {
  const users = await prisma.user.findMany({
    where: { driverAdmin: false },
    select: { id: true, email: true, fullName: true },
  });
  const statuses = listPlanStatuses();

  const athletes = users
    .map((u) => {
      const hasProfile = Object.keys(getAthleteProfile(u.id)).length > 0;
      const plan = statuses[u.id];
      return {
        userId: u.id,
        email: u.email,
        fullName: u.fullName,
        hasProfile,
        planStatus: plan?.status ?? null,
        generatedAt: plan?.generatedAt ?? null,
      };
    })
    .filter((a) => a.hasProfile || a.planStatus);

  return res.status(200).json({ athletes });
});

/** One athlete's intake answers + current plan. */
router.get("/athletes/:userId", async (req: AuthedRequest, res) => {
  const userId = String(req.params.userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true },
  });
  if (!user) return res.status(404).json({ error: "Athlete not found." });

  return res.status(200).json({
    athlete: { userId, ...user },
    profile: getAthleteProfile(userId),
    plan: getTrainingPlan(userId),
  });
});

/** Save the coach's edited plan and mark it curated (or another status). */
router.put("/athletes/:userId/plan", (req: AuthedRequest, res) => {
  const userId = String(req.params.userId);
  const { plan, status } = (req.body ?? {}) as {
    plan?: unknown;
    status?: TrainingPlan["status"];
  };
  if (typeof plan !== "string" || !plan.trim()) {
    return res.status(400).json({ error: "A plan is required." });
  }
  const next = status === "active" ? "active" : "curated";
  return res.status(200).json({ plan: saveTrainingPlan(userId, plan, next) });
});

export default router;
