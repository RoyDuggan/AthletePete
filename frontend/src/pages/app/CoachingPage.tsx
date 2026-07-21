import React from "react";

import { AppPage, ComingSoon } from "../../components/app/AppPage";

/**
 * AI coaching. Placeholder for now — will generate a training plan from the
 * athlete's questionnaire, surface weekly AI coaching feedback, and route the
 * plan through coach curation before it goes live on the calendar.
 */
const CoachingPage: React.FC = () => (
  <AppPage
    title="AI"
    accent="Coaching"
    subtitle="AI-generated training plans and coaching feedback, curated by a professional coach."
  >
    <ComingSoon>
      AI coaching is being built. It will turn your questionnaire into a
      structured training plan, provide weekly feedback, and adapt as you log
      progress.
    </ComingSoon>
  </AppPage>
);

export default CoachingPage;
