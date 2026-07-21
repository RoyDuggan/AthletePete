import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import ForDriversPage from "./pages/ForDriversPage";
import ForParentsPage from "./pages/ForParentsPage";
import ForTeamsPage from "./pages/ForTeamsPage";
import ExampleOutputsPage from "./pages/ExampleOutputsPage";
import PricingPage from "./pages/PricingPage";
import KartSetupPage from "./pages/KartSetupPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import SignUpPage from "./pages/SignUpPage";
import SignInPage from "./pages/SignInPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";

import RequireAuth from "./components/RequireAuth";
import AppLayout from "./components/app/AppLayout";
import DashboardPage from "./pages/app/DashboardPage";
import DriverSetupPage from "./pages/app/DriverSetupPage";
import KartSetupAppPage from "./pages/app/KartSetupAppPage";
import JettingPage from "./pages/app/JettingPage";
import CalendarPage from "./pages/app/CalendarPage";
import TelemetryPage from "./pages/app/TelemetryPage";
import CoachingPage from "./pages/app/CoachingPage";
import SubscriptionPage from "./pages/app/SubscriptionPage";
import SettingsPage from "./pages/app/SettingsPage";

import { AuthProvider } from "./context/AuthContext";
import { AnalysisProvider } from "./context/AnalysisContext";

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <AnalysisProvider>
        <Routes>
        {/* ---- Public marketing site ---- */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/drivers" element={<ForDriversPage />} />
        <Route path="/parents" element={<ForParentsPage />} />
        <Route path="/teams" element={<ForTeamsPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/register" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Kept public content pages (reachable via footer / direct link) */}
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/example-outputs" element={<ExampleOutputsPage />} />
        <Route path="/kart-setup" element={<KartSetupPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />

        {/* ---- Protected app (single guard wraps the whole subtree) ---- */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="driver" element={<DriverSetupPage />} />
          <Route path="kart" element={<KartSetupAppPage />} />
          <Route path="jetting" element={<JettingPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="telemetry" element={<TelemetryPage />} />
          <Route path="coaching" element={<CoachingPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Race Hub = friendly entrance to the protected app. Authenticated
            users land on the dashboard; logged-out users get the AccessGate. */}
        <Route path="/race-hub" element={<Navigate to="/app/dashboard" replace />} />

        {/* ---- Backward-compatible redirects (old paths) ---- */}
        <Route path="/for-drivers" element={<Navigate to="/drivers" replace />} />
        <Route path="/for-parents" element={<Navigate to="/parents" replace />} />
        <Route path="/for-teams" element={<Navigate to="/teams" replace />} />
        <Route path="/signin" element={<Navigate to="/sign-in" replace />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />
        <Route path="/garage" element={<Navigate to="/app/dashboard" replace />} />

        {/* Unknown routes fall back to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnalysisProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
