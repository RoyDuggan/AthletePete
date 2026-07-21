import { Router } from "express";

import type { AuthedRequest } from "../middleware/requireAuth";
import { AUTH_COOKIE } from "../middleware/requireAuth";
import { exportUserData, deleteUserAccount } from "../services/gdprService";

/**
 * GDPR self-service, mounted behind requireAuth at /api/account.
 * - GET /export → download all of the caller's data (subject access).
 * - DELETE /    → permanently delete the caller's account (erasure).
 */
const router = Router();

router.get("/export", async (req: AuthedRequest, res) => {
  try {
    const data = await exportUserData(req.userId!);
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="virtualpete-data-export.json"'
    );
    return res.status(200).send(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Data export error:", error);
    return res.status(500).json({ error: "Could not export your data." });
  }
});

router.delete("/", async (req: AuthedRequest, res) => {
  try {
    await deleteUserAccount(req.userId!);
    res.clearCookie(AUTH_COOKIE, { path: "/" });
    return res.status(200).json({ deleted: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return res.status(500).json({ error: "Could not delete your account." });
  }
});

export default router;
