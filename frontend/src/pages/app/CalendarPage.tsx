import React from "react";

import { useAuth } from "../../context/AuthContext";
import { AppPage, ComingSoon, UpgradeNotice } from "../../components/app/AppPage";
import { hasFeature } from "../../lib/tiers";

/** Training calendar — the athlete's curated workout plan, week by week. */
const CalendarPage: React.FC = () => {
  const { user } = useAuth();

  if (!hasFeature(user, "calendar")) {
    return (
      <AppPage title="Training" accent="Calendar" subtitle="Your weekly training plan.">
        <UpgradeNotice feature="Training Calendar" />
      </AppPage>
    );
  }

  return (
    <AppPage
      title="Training"
      accent="Calendar"
      subtitle="Your coach-curated training plan, laid out week by week."
    >
      <ComingSoon>
        Your training calendar is being built. It will show your AI-generated,
        coach-curated workouts (on-ice, strength, conditioning, recovery) by day,
        with completion tracking and weekly reviews.
      </ComingSoon>
    </AppPage>
  );
};

export default CalendarPage;
