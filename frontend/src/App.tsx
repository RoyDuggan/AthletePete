import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import PricingPage from "./pages/PricingPage";
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
import AthleteProfilePage from "./pages/app/AthleteProfilePage";
import CalendarPage from "./pages/app/CalendarPage";
import CoachingPage from "./pages/app/CoachingPage";
import SubscriptionPage from "./pages/app/SubscriptionPage";
import SettingsPage from "./pages/app/SettingsPage";

import { AuthProvider } from "./context/AuthContext";

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* ---- Public marketing site ---- */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/register" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
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
          <Route path="profile" element={<AthleteProfilePage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="coaching" element={<CoachingPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* ---- Backward-compatible redirects ---- */}
        <Route path="/signin" element={<Navigate to="/sign-in" replace />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />

        {/* Unknown routes fall back to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
