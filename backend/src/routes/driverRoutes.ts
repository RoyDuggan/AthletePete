import { Router } from "express";

import {
  handleGetDriverProfile,
  handleSaveDriverProfile,
  handleGetDriverFraming,
  handleSaveDriverFraming,
} from "../services/driverService";
import { requireDriverAdmin } from "../middleware/requireDriverAdmin";

/**
 * Driver profile + AI-framing routes. Mounted behind requireAuth at /api, so
 * every handler has req.userId. Editing the shared framing prompts is further
 * gated by requireDriverAdmin.
 */
const router = Router();

router.get("/driver-profile", handleGetDriverProfile);
router.put("/driver-profile", handleSaveDriverProfile);

router.get("/driver-framing", handleGetDriverFraming);
router.put("/driver-framing", requireDriverAdmin, handleSaveDriverFraming);

export default router;
