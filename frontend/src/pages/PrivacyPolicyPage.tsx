import React from "react";
import { Link } from "react-router-dom";

import LegalPage, { Section, P, UL } from "../components/marketing/LegalPage";
import { LEGAL } from "../lib/legal";

/**
 * Privacy Policy. The data-practice content reflects what the app actually does
 * today (account data, uploaded telemetry, Stripe billing, Anthropic AI, a
 * single auth cookie). Company-identity values come from lib/legal.ts
 * (placeholders — replace before going live). Have a solicitor review before
 * commercial launch.
 */
const PrivacyPolicyPage: React.FC = () => (
  <LegalPage
    title="Privacy Policy"
    updated={LEGAL.lastUpdated}
    intro={
      <>
        This policy explains what personal data {LEGAL.siteName} collects, why,
        and your rights over it. It sits alongside our{" "}
        <Link to="/terms" className="text-brand hover:underline">
          Terms of Service
        </Link>
        .
      </>
    }
  >
    <Section title="1. Who is responsible for your data">
      <P>
        {LEGAL.company} ({LEGAL.entityDescription}
        {LEGAL.companyNumber ? `, company no. ${LEGAL.companyNumber}` : ""}) is
        the data controller for {LEGAL.siteName}. For any privacy question or to
        exercise your rights, contact us at {LEGAL.contactEmail}.
      </P>
    </Section>

    <Section title="2. What we collect">
      <UL
        items={[
          "Account data: your email address, an optional full name, and a securely hashed password (we never store your password in plain text).",
          "Telemetry and profile data you upload: session data files, plus driver, kart and setup details you enter, and the metrics we derive from them.",
          "Billing data: your subscription status and plan. Payments are handled by Stripe — we do not see or store your card number.",
          "Technical data: your IP address and basic request information, used for security and to keep the service running.",
        ]}
      />
    </Section>

    <Section title="3. How and why we use it">
      <UL
        items={[
          "To provide the service: store your sessions, run analysis, and generate AI coaching.",
          "To manage your account, trial, credits and subscription.",
          "To secure the service (e.g. rate limiting and abuse prevention).",
          "To contact you about your account or important service changes.",
        ]}
      />
      <P>
        Our lawful bases (UK GDPR) are: performance of our contract with you
        (providing the service and billing), our legitimate interests (securing
        and improving the service), consent where required, and compliance with
        legal obligations.
      </P>
    </Section>

    <Section title="4. AI processing">
      <P>
        To generate coaching, we send telemetry-<em>derived metrics</em> (such as
        speeds, times and grip-usage figures) — not your raw uploaded files — to
        our AI provider, Anthropic, which processes them to return a written
        summary. We do not use your data to train third-party AI models.
      </P>
    </Section>

    <Section title="5. Who we share it with (sub-processors)">
      <P>We share data only with providers that help us run the service:</P>
      <UL
        items={[
          "Stripe — payment processing and subscription management.",
          "Anthropic — AI processing of telemetry-derived metrics to produce coaching.",
          `Our hosting provider — [HOSTING PROVIDER] — which stores the application, database and uploaded files.`,
        ]}
      />
      <P>
        We do not sell your personal data. We may disclose data where required by
        law or to protect our rights.
      </P>
    </Section>

    <Section title="6. Cookies">
      <P>
        We use a single, strictly-necessary cookie to keep you signed in (an
        authentication token). We do not use advertising or third-party tracking
        cookies. Because it is essential to the service, it does not require
        consent, but you can clear it by signing out or clearing your browser
        data.
      </P>
    </Section>

    <Section title="7. International transfers">
      <P>
        Some providers (such as Stripe and Anthropic) may process data outside
        the UK/EEA. Where they do, appropriate safeguards (such as the UK
        International Data Transfer Agreement or Standard Contractual Clauses)
        apply.
      </P>
    </Section>

    <Section title="8. How long we keep it">
      <P>
        We keep your account and uploaded data for as long as your account is
        active. If you close your account or ask us to delete your data, we
        remove it within a reasonable period, except where we must retain limited
        records (for example, billing records) to meet legal obligations.
      </P>
    </Section>

    <Section title="9. Your rights">
      <P>Under UK GDPR you have the right to:</P>
      <UL
        items={[
          "Access a copy of your personal data (data portability / export).",
          "Correct inaccurate data.",
          "Erase your data (“right to be forgotten”).",
          "Restrict or object to certain processing.",
          "Withdraw consent where we rely on it.",
        ]}
      />
      <P>
        To exercise any of these, email {LEGAL.contactEmail}. You also have the
        right to complain to {LEGAL.regulator}.
      </P>
    </Section>

    <Section title="10. Children and young drivers">
      <P>
        Karting involves young drivers. Accounts must be held and managed by an
        adult (a parent or guardian) who is responsible for any driver profile
        that describes a minor. The service is not intended to be used directly
        by children without adult supervision. If you believe a child has
        created an account, contact us and we will remove it.
      </P>
    </Section>

    <Section title="11. Security">
      <P>
        We protect your data with measures including hashed passwords,
        encrypted-in-transit connections (HTTPS), access controls and rate
        limiting. No system is perfectly secure, but we work to keep your data
        safe and will notify you and the regulator of any breach where required.
      </P>
    </Section>

    <Section title="12. Changes to this policy">
      <P>
        We may update this policy from time to time. We will post the updated
        version here and, for material changes, take reasonable steps to notify
        you.
      </P>
    </Section>

    <Section title="13. Contact">
      <P>
        For any privacy request or question, email {LEGAL.contactEmail}.
      </P>
    </Section>
  </LegalPage>
);

export default PrivacyPolicyPage;
