import React, { useEffect } from "react";

import SplitHeroLanding from "../components/landing/SplitHeroLanding";

/**
 * Public base-URL ("/") landing page: a split-screen entrance that separates the
 * public marketing message (left) from the Race Hub access area (right). The
 * existing app, auth, pricing and content pages are unchanged — this is only the
 * new front door.
 */
const LandingPage: React.FC = () => {
  useEffect(() => {
    const prev = document.title;
    document.title = "Virtual Pete — AI-Powered Karting Insights";
    return () => {
      document.title = prev;
    };
  }, []);

  return <SplitHeroLanding />;
};

export default LandingPage;
