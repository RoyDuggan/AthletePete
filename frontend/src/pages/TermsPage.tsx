import React from "react";
import { Link } from "react-router-dom";

import LegalPage, { Section, P, UL } from "../components/marketing/LegalPage";
import { LEGAL } from "../lib/legal";

/**
 * Terms of Service. Standard SaaS terms; company-identity and jurisdiction
 * values come from lib/legal.ts (currently placeholders — replace before going
 * live). Have a solicitor review before commercial launch.
 */
const TermsPage: React.FC = () => (
  <LegalPage
    title="Terms of Service"
    updated={LEGAL.lastUpdated}
    intro={
      <>
        These terms govern your use of {LEGAL.siteName}. By creating an account
        or using the service, you agree to them. Please also read our{" "}
        <Link to="/privacy" className="text-brand hover:underline">
          Privacy Policy
        </Link>
        .
      </>
    }
  >
    <Section title="1. Who we are">
      <P>
        {LEGAL.siteName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is operated by{" "}
        {LEGAL.company}, {LEGAL.entityDescription}
        {LEGAL.companyNumber ? ` (company no. ${LEGAL.companyNumber})` : ""}, at{" "}
        {LEGAL.address}. You can contact us at {LEGAL.contactEmail}.
      </P>
    </Section>

    <Section title="2. The service">
      <P>
        {LEGAL.siteName} provides kart telemetry analysis, setup and jetting
        tools, and AI-generated coaching insights. The service is provided to
        help you interpret data; it is for guidance only and is not professional
        coaching, engineering, or safety advice.
      </P>
      <P>
        AI-generated outputs can be inaccurate or incomplete. You are
        responsible for how you use any insight, on and off track.
      </P>
    </Section>

    <Section title="3. Accounts">
      <UL
        items={[
          "You must provide accurate registration details and keep your password secure.",
          "You are responsible for activity under your account.",
          "Accounts are for the account holder; do not share credentials.",
          "You must be old enough to enter a contract in your country. Where a driver is a minor, the account must be held and managed by a parent or guardian.",
        ]}
      />
    </Section>

    <Section title="4. Subscriptions, billing and cancellation">
      <UL
        items={[
          "Paid plans (Driver, Team, Coach) are billed monthly in advance via our payment processor, Stripe. We do not store your card details.",
          "Subscriptions renew automatically each month until cancelled.",
          "You can cancel or change your plan at any time from the Subscription page; cancellation takes effect at the end of the current paid period, and you keep access until then.",
          "Except where required by law, payments already made are non-refundable.",
          "We may change prices with reasonable prior notice; changes apply from your next renewal.",
        ]}
      />
    </Section>

    <Section title="5. Free trial and credits">
      <P>
        New accounts include a time-limited free trial and a number of upload
        credits. We may change or withdraw trial terms for future sign-ups. When
        a trial ends, continued analysis requires a paid subscription.
      </P>
    </Section>

    <Section title="6. Your data and content">
      <P>
        You retain ownership of the telemetry files and profile information you
        upload. You grant us a licence to store and process that data solely to
        provide the service to you (including generating analysis and AI
        coaching). Only telemetry-derived metrics — not your raw files — are sent
        to our AI provider. See the{" "}
        <Link to="/privacy" className="text-brand hover:underline">
          Privacy Policy
        </Link>{" "}
        for details.
      </P>
      <P>
        You must have the right to upload any data you provide, and must not
        upload another person&rsquo;s data without their permission.
      </P>
    </Section>

    <Section title="7. Acceptable use">
      <UL
        items={[
          "Do not misuse, disrupt, or attempt to gain unauthorised access to the service.",
          "Do not reverse engineer, scrape, or resell the service except as allowed by law.",
          "Do not upload unlawful content or use the service for any unlawful purpose.",
        ]}
      />
    </Section>

    <Section title="8. Intellectual property">
      <P>
        The {LEGAL.siteName} software, branding, and content are owned by us or
        our licensors. These terms do not transfer any of our intellectual
        property to you.
      </P>
    </Section>

    <Section title="9. Disclaimers">
      <P>
        The service is provided &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo;, without warranties of any kind to the fullest extent
        permitted by law. We do not warrant that analysis or AI outputs are
        accurate, complete, or fit for any particular purpose, or that the
        service will be uninterrupted or error-free.
      </P>
    </Section>

    <Section title="10. Limitation of liability">
      <P>
        Nothing in these terms limits liability that cannot be limited by law
        (such as for death or personal injury caused by negligence, or fraud).
        Subject to that, we are not liable for indirect or consequential loss,
        and our total liability to you is limited to the amount you paid us in
        the 12 months before the claim.
      </P>
    </Section>

    <Section title="11. Termination">
      <P>
        You may stop using the service and delete your account at any time. We
        may suspend or terminate access if you breach these terms or where
        required by law. On termination, your right to use the service ends; data
        handling on closure is described in the Privacy Policy.
      </P>
    </Section>

    <Section title="12. Changes to these terms">
      <P>
        We may update these terms from time to time. We will post the updated
        version here and, for material changes, take reasonable steps to notify
        you. Continued use after changes take effect means you accept them.
      </P>
    </Section>

    <Section title="13. Governing law">
      <P>
        These terms are governed by the laws of {LEGAL.jurisdiction}, and the
        courts of {LEGAL.jurisdiction} have exclusive jurisdiction, subject to
        any mandatory consumer-protection rights you have where you live.
      </P>
    </Section>

    <Section title="14. Contact">
      <P>Questions about these terms? Email {LEGAL.contactEmail}.</P>
    </Section>
  </LegalPage>
);

export default TermsPage;
