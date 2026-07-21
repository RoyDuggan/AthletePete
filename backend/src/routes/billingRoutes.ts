import { Router, type Request, type Response } from "express";

import type { AuthedRequest } from "../middleware/requireAuth";
import {
  createCheckoutSession,
  createPortalSession,
  handleWebhookEvent,
  billingEnabled,
  configuredPlans,
  isPaidPlan,
} from "../services/billingService";

/** Best-effort public site origin for Stripe redirect URLs. */
function siteOrigin(req: Request): string {
  const origin = req.headers.origin;
  if (typeof origin === "string" && origin) return origin;
  const referer = req.headers.referer;
  if (typeof referer === "string" && referer) {
    try {
      return new URL(referer).origin;
    } catch {
      /* fall through */
    }
  }
  return process.env.PUBLIC_URL || "http://localhost:8080";
}

/**
 * Public webhook handler. Mounted in index.ts with express.raw (before the JSON
 * body parser) and WITHOUT requireAuth, since Stripe calls it directly and it is
 * secured by signature verification instead.
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  try {
    await handleWebhookEvent(
      req.body as Buffer,
      req.headers["stripe-signature"] as string | undefined
    );
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    // 400 tells Stripe the event was rejected (bad signature / processing error).
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Webhook failed.",
    });
  }
}

const router = Router();

/** GET /api/billing/config — whether billing is live and which plans are ready. */
router.get("/config", (_req: AuthedRequest, res) => {
  return res.status(200).json({
    enabled: billingEnabled(),
    plans: configuredPlans(),
  });
});

/** POST /api/billing/checkout { plan } — returns a Checkout redirect URL. */
router.post("/checkout", async (req: AuthedRequest, res) => {
  try {
    const plan = (req.body ?? {}).plan;
    if (!isPaidPlan(plan)) {
      return res.status(400).json({ error: "A valid plan is required." });
    }
    const url = await createCheckoutSession(req.userId!, plan, siteOrigin(req));
    return res.status(200).json({ url });
  } catch (error) {
    console.error("Checkout error:", error);
    const message =
      error instanceof Error ? error.message : "Could not start checkout.";
    const status = message.includes("not configured") ? 503 : 400;
    return res.status(status).json({ error: message });
  }
});

/** POST /api/billing/portal — returns a Customer Portal redirect URL. */
router.post("/portal", async (req: AuthedRequest, res) => {
  try {
    const url = await createPortalSession(req.userId!, siteOrigin(req));
    return res.status(200).json({ url });
  } catch (error) {
    console.error("Portal error:", error);
    const message =
      error instanceof Error ? error.message : "Could not open billing portal.";
    const status = message.includes("not configured") ? 503 : 400;
    return res.status(status).json({ error: message });
  }
});

export default router;
