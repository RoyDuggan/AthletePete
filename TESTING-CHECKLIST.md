# Testing checklist — 2026-07-20 release

Covers the changes since the **17 Jul review** (baseline `c3a22ce`). Tick each
item; note the environment caveats at the bottom.

> **Before you start:** hard-refresh (Ctrl+Shift+R) so you're on the latest
> build. Where a step is destructive (delete account, subscribe), use a
> **throwaway test account**, not your main one.

---

## 1. Accounts & auth

- [ ] **Register** a new account → you land in the app. Check the **backend
  console** for a "Verify your AthletePete email address" log line with a link
  (email isn't sending yet — see caveats).
- [ ] Open that `/verify-email?token=…` link → shows **"Email verified"**;
  Settings now shows **Email verified: Yes**.
- [ ] **Forgot password**: Sign-in page → "Forgot password?" → enter your email →
  "Check your email". Grab the `/reset-password?token=…` link from the console.
- [ ] Open it → set a new password → sign in with the **new** password.
- [ ] Reset link is **single-use**: reopening the same link fails; an old/expired
  link is rejected.
- [ ] **Resend verification** from Settings (when unverified) shows
  "Verification email sent".

## 2. Billing (Stripe — TEST MODE)

- [ ] Subscription page shows **Driver £15 / Team £25 / Coach £35 / mo** with
  **Subscribe** buttons (not "Coming soon").
- [ ] Subscribe to **Driver** → Stripe Checkout shows £15/month → pay with test
  card **`4242 4242 4242 4242`**, any future expiry / CVC / postcode.
- [ ] Redirect back → "Payment received" banner → within a few seconds the header
  shows **INDIVIDUAL PLAN** and Telemetry shows **"Subscribed — unlimited
  uploads"** (no trial/credits banner).
- [ ] **Manage billing** → Customer Portal opens → **switch plan** (e.g. Driver→
  Team) → app reflects the new plan.
- [ ] Manage billing → **Cancel** → plan returns to Free at period end.
- [ ] (Optional) Stripe dashboard → Webhooks → recent deliveries show **200**.

## 3. GDPR (Settings → Your data)

- [ ] **Download my data** → a `athletepete-data-export.json` downloads; open it
  and confirm it contains your account, driver profile, karts, sessions.
- [ ] **Delete my account** (throwaway account) → type `DELETE` → confirm → you're
  signed out and returned home; the account can no longer sign in; any Stripe
  subscription is cancelled.

## 4. Coaching & analysis

- [ ] **Fastest lap retained**: Coaching → move the sensitivity slider; corners on
  the fastest lap stay lit at every setting.
- [ ] **Medals**: the Lap-time column shows gold / silver / bronze on the three
  quickest laps.
- [ ] **Prompt persistence**: edit the AI interpretation prompt (Telemetry) or the
  zone prompt → regenerate → reload the page / another browser → edit persists
  (saved to account).
- [ ] **Driver framing**: Driver Setup → set Age **Under 12**, Experience
  **Novice**, Coaching style **Encouraging** → Save → generate coaching → output
  is descriptive with **no raw numbers**.
- [ ] **Driver Admin** (if your account has the flag): the framing-prompt editor
  appears on Driver Setup; Settings shows **Driver Admin: Yes**.

## 5. Kart setup

- [ ] Kart Setup → **create** a configuration (name, gearing, weather) → it lists;
  **delete** removes it; values persist across reload.

## 6. Navigation & marketing

- [ ] Logged **out**, the marketing header shows a **Sign In** button (top-right).
- [ ] Home → **"Access My Race Hub"** goes to the **Welcome Back** (sign-in) page.
- [ ] Sign-up page says **"Register"** and its Terms/Privacy links work.

## 7. Legal

- [ ] `/terms` and `/privacy` load and render.
- [ ] Footer **Terms** / **Privacy** links and the sign-up consent links point to
  them. *(Company name/contact are placeholders — expected.)*

## 8. Security (spot checks)

- [ ] After ~20 rapid failed logins you get **"Too many attempts"** (rate limit).
- [ ] No **"Sign in with Google"** button remains on sign-in/register.

---

## Environment caveats (important for testers)

- **Stripe is in TEST mode** — use test cards only; no real charges.
- **Email does not send yet** — Postmark isn't configured, so verification/reset
  **links appear in the backend server console**, not a real inbox. (Retrieve
  with `docker compose logs backend --since 2m`.)
- **Legal pages** show placeholder company details.
- Everything is on branch **`feature/fingerprint-coaching`**, deployed to the
  current URL.
