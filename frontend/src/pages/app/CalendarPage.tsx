import React from "react";

import { useAuth } from "../../context/AuthContext";
import { AppPage, ComingSoon, UpgradeNotice } from "../../components/app/AppPage";
import { hasFeature } from "../../lib/tiers";

/** Race calendar. Premium feature (Trial and paid tiers). */
const CalendarPage: React.FC = () => {
  const { user } = useAuth();

  if (!hasFeature(user, "calendar")) {
    return (
      <AppPage title="Calendar" subtitle="Plan your race weekends and test days.">
        <UpgradeNotice feature="Calendar" />
      </AppPage>
    );
  }

  return (
    <AppPage
      title="Calendar"
      subtitle="Plan your race weekends, test days and championship rounds."
    >
      <ComingSoon>
        Your race calendar is coming soon. You'll be able to add events, link
        sessions and telemetry to each round, and track results over the season.
      </ComingSoon>
    </AppPage>
  );
};

export default CalendarPage;
