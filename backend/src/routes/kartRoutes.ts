import { Router } from "express";

import {
  listKarts,
  createKart,
  updateKart,
  deleteKart,
  MAX_KARTS,
  LimitError,
} from "../services/kartService";
import {
  listKartConfigs,
  createKartConfig,
  updateKartConfig,
  deleteKartConfig,
} from "../services/kartConfigService";
import { type AuthedRequest } from "../middleware/requireAuth";

const router = Router();

function fail(res: any, error: unknown) {
  const status = error instanceof LimitError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Request failed.";
  const code = error instanceof LimitError ? error.code : undefined;
  if (status === 500) console.error("Kart route error:", error);
  return res.status(status).json({ error: message, code });
}

router.get("/", async (req: AuthedRequest, res) => {
  const karts = await listKarts(req.userId!);
  res.json({ limit: MAX_KARTS, used: karts.length, karts });
});

router.post("/", async (req: AuthedRequest, res) => {
  try {
    const kart = await createKart(req.userId!, req.body ?? {});
    res.status(201).json({ kart });
  } catch (error) {
    fail(res, error);
  }
});

router.patch("/:id", async (req: AuthedRequest, res) => {
  try {
    const kart = await updateKart(req.userId!, String(req.params.id), req.body ?? {});
    res.json({ kart });
  } catch (error) {
    fail(res, error);
  }
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  const ok = await deleteKart(req.userId!, String(req.params.id));
  if (!ok) return res.status(404).json({ error: "Kart not found." });
  res.json({ deleted: true });
});

/* ---- Configurations (setup snapshots, nested under a kart) ---- */

router.get("/:kartId/configs", async (req: AuthedRequest, res) => {
  try {
    const configs = await listKartConfigs(req.userId!, String(req.params.kartId));
    res.json({ configs });
  } catch (error) {
    fail(res, error);
  }
});

router.post("/:kartId/configs", async (req: AuthedRequest, res) => {
  try {
    const config = await createKartConfig(
      req.userId!,
      String(req.params.kartId),
      req.body ?? {}
    );
    res.status(201).json({ config });
  } catch (error) {
    fail(res, error);
  }
});

router.patch("/:kartId/configs/:id", async (req: AuthedRequest, res) => {
  try {
    const config = await updateKartConfig(
      req.userId!,
      String(req.params.kartId),
      String(req.params.id),
      req.body ?? {}
    );
    res.json({ config });
  } catch (error) {
    fail(res, error);
  }
});

router.delete("/:kartId/configs/:id", async (req: AuthedRequest, res) => {
  try {
    const ok = await deleteKartConfig(
      req.userId!,
      String(req.params.kartId),
      String(req.params.id)
    );
    if (!ok) return res.status(404).json({ error: "Configuration not found." });
    res.json({ deleted: true });
  } catch (error) {
    fail(res, error);
  }
});

export default router;
