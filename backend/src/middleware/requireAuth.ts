import type { Request, Response, NextFunction } from "express";

import { verifyToken } from "../services/authService";

export const AUTH_COOKIE = "vp_token";

/** Express request augmented with the authenticated user id. */
export interface AuthedRequest extends Request {
  userId?: string;
}

/** Rejects the request with 401 unless a valid auth cookie is present. */
export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    const { sub } = verifyToken(token);
    req.userId = sub;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired or invalid." });
  }
}
