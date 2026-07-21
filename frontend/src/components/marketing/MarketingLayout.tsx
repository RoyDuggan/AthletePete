import React from "react";

import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

/**
 * Dark-themed page shell shared by all marketing/content pages: the sticky
 * lime header, a dark page body that fills the viewport, and the dark footer.
 */
const MarketingLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="flex min-h-screen flex-col bg-ink text-left text-gray-200">
    <SiteHeader />
    <main className="flex-1">{children}</main>
    <SiteFooter />
  </div>
);

export default MarketingLayout;
