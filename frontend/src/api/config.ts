/**
 * Base URL for the backend API. Same-origin `/api` in both dev and prod:
 * - dev: the Vite dev server proxies `/api` → the backend (see vite.config.ts)
 * - prod: Caddy proxies `/api` → the backend container
 * Override with the `VITE_API_BASE` build-time env var if needed.
 */
export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

/** fetch() options that send the auth cookie with every API request. */
export const withCreds: RequestInit = { credentials: "include" };
