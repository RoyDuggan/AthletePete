import React from "react";

import { AppPage, ComingSoon } from "../../components/app/AppPage";

/**
 * Athlete intake questionnaire. Placeholder for now — the form (position, level,
 * goals, availability, injury history, etc.) will feed the AI training-plan
 * generator and the coach's curation.
 */
const AthleteProfilePage: React.FC = () => (
  <AppPage
    title="Athlete"
    accent="Profile"
    subtitle="Your intake questionnaire — used to generate and tailor your training plan."
  >
    <ComingSoon>
      The athlete intake questionnaire is being built. It will capture your
      position, level, goals, weekly availability and history, and feed the AI
      training-plan generator (reviewed by your coach).
    </ComingSoon>
  </AppPage>
);

export default AthleteProfilePage;
