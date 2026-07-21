import React from "react";
import { useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import AccessGate from "./AccessGate";

/**
 * Guards protected routes. Unauthenticated visitors get the AccessGate screen
 * (register / sign in) rather than a redirect or blank error.
 */
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-sm text-gray-400">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <AccessGate from={location.pathname} />;
  }

  return <>{children}</>;
};

export default RequireAuth;
