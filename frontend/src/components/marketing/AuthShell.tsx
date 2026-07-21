import React from "react";

import MarketingLayout from "./MarketingLayout";

/**
 * Centered light auth card on the dark marketing page. Shared by the Sign Up
 * and Sign In pages so they stay visually identical apart from their fields.
 */
const AuthShell: React.FC<{
  title: string;
  subtitle?: string;
  shake?: boolean;
  children: React.ReactNode;
}> = ({ title, subtitle, shake, children }) => (
  <MarketingLayout>
    <section className="flex items-center justify-center px-4 py-12 md:py-20">
      <div
        className={`w-full max-w-md rounded-xl bg-white p-7 shadow-[0_10px_40px_rgba(0,0,0,0.5)] md:p-9 ${
          shake ? "animate-shake" : ""
        }`}
      >
        <h1 className="text-center text-2xl font-extrabold uppercase tracking-wide text-[#111827]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-center text-sm text-[#6b7280]">{subtitle}</p>
        )}
        <div className="mt-6">{children}</div>
      </div>
    </section>
  </MarketingLayout>
);

export default AuthShell;
