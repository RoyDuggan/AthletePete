import { Router } from "express";
import fs from "fs";
import path from "path";

import {
  listSessions,
  deleteSession,
  MAX_SESSIONS,
} from "../services/sessionStore";
import { type AuthedRequest } from "../middleware/requireAuth";

const UPLOADS_DIR = path.join(__dirname, "../../uploads");
const router = Router();

router.get("/", async (req: AuthedRequest, res) => {
  const sessions = await listSessions(req.userId!);
  res.json({
    limit: MAX_SESSIONS,
    used: sessions.length,
    sessions: sessions.map((s) => ({
      id: s.id,
      name: s.name,
      storageKey: s.storageKey,
      originalName: s.originalName,
      sizeBytes: s.sizeBytes,
      uploadedAt: s.uploadedAt,
    })),
  });
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  const storageKey = await deleteSession(req.userId!, String(req.params.id));
  if (!storageKey) {
    return res.status(404).json({ error: "Session not found." });
  }

  // Best-effort removal of the underlying telemetry file.
  try {
    fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(storageKey)));
  } catch {
    /* file already gone — ignore */
  }

  return res.json({ deleted: true });
});

export default router;
