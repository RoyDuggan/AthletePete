/**
 * Company / legal identity used across the Terms and Privacy pages. The
 * bracketed values are PLACEHOLDERS — swap them for the real details before
 * going live (they also feed the Stripe live Customer Portal requirements).
 *
 * Sub-processors are derived from what the app actually uses today (Stripe for
 * billing, Anthropic for AI coaching); update if that changes.
 */
export const LEGAL = {
  siteName: "Virtual Pete",
  /** Legal / trading name of the business operating the service. */
  company: "[COMPANY / TRADING NAME]",
  /** e.g. "a sole trader" or "a company registered in England & Wales". */
  entityDescription: "[BUSINESS TYPE — e.g. a sole trader based in the UK]",
  /** Companies House number, if a limited company (else leave blank). */
  companyNumber: "",
  /** Registered or trading address. */
  address: "[REGISTERED / TRADING ADDRESS]",
  /** Contact address for support + privacy/data requests. */
  contactEmail: "[CONTACT EMAIL]",
  /** Governing law / courts. Defaulted to England & Wales — confirm. */
  jurisdiction: "England & Wales",
  /** Data-protection regulator for complaints (UK). */
  regulator: "the Information Commissioner's Office (ICO), ico.org.uk",
  /** Shown as "Last updated". */
  lastUpdated: "20 July 2026",
} as const;
