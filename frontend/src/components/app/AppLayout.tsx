import React from "react";
import { Outlet } from "react-router-dom";

import AppHeader from "./AppHeader";
import SiteFooter from "../marketing/SiteFooter";

/**
 * Dark-themed shell for the signed-in app. Mirrors MarketingLayout but swaps
 * the public marketing header for the protected app navigation. Nested
 * `/app/*` routes render through the <Outlet/>.
 */
const AppLayout: React.FC = () => (
  <div className="flex min-h-screen flex-col bg-ink text-left text-gray-200">
    <AppHeader />
    <main className="flex-1">
      <Outlet />
    </main>
    <SiteFooter />
  </div>
);

export default AppLayout;
