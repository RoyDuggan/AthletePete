/**
 * Shared class-string building blocks for the marketing pages, so every page
 * uses the same dark theme, spacing, buttons and cards as the home page.
 *
 * Palette (spec): ink #030303 page, panel #151515 sections/cards, brand
 * #a6e22e lime accent, steel #3a3a3a buttons, mist #f5f7fa light inputs/cards.
 */

/** Centered content column with consistent horizontal padding. */
export const container = "mx-auto w-full max-w-6xl px-6 md:px-12";

/** Section vertical rhythm. */
export const section = "py-12 md:py-20";

/** Accessible focus ring (brand lime), used on every interactive element. */
export const focusRing =
  "focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/** Uppercase bold headline. Pass a size via the caller for context. */
export const heading =
  "font-extrabold uppercase tracking-wide leading-tight text-white";

/** Primary CTA: dark-gray bg, lime text, 24px radius, lift on hover. */
export const ctaButton =
  "inline-flex items-center justify-center rounded-3xl bg-steel px-7 py-3 text-sm font-bold uppercase tracking-wide text-brand transition duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#2a2a2a] " +
  focusRing;

/** Solid brand CTA (for strong primary actions, e.g. form submit). */
export const ctaButtonLime =
  "inline-flex items-center justify-center rounded-3xl bg-brand px-7 py-3 text-sm font-bold uppercase tracking-wide text-white transition duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-hero-blue " +
  focusRing;

/** Light card on the dark page (Example Outputs / Kart Setup). */
export const lightCard =
  "rounded-lg bg-mist text-[#374151] shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition duration-300 hover:scale-[1.02] hover:shadow-[0_10px_24px_rgba(0,0,0,0.35)]";

/** Dark panel card (e.g. pricing). */
export const panelCard =
  "rounded-lg border border-white/10 bg-panel p-7 text-gray-300 transition duration-300 hover:scale-[1.02] hover:border-brand/40";

/* ---- Auth form building blocks (light card on the dark page) ---- */

export const authInput =
  "w-full rounded-md border border-[#d1d5db] bg-mist px-3 py-3 text-sm text-[#374151] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-brand";

export const authLabel = "mb-1 block text-sm font-bold text-[#1f2937]";

export const authSubmit =
  "flex h-12 w-full items-center justify-center rounded-3xl bg-steel text-sm font-bold uppercase tracking-wide text-brand transition duration-300 hover:-translate-y-0.5 hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-60 " +
  focusRing;

export const authError = "mt-1 text-xs font-semibold text-[#ef4444]";
