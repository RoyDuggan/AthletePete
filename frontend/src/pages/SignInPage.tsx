import React, { useState } from "react";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/marketing/AuthShell";
import {
  authInput,
  authLabel,
  authSubmit,
  authError,
  focusRing,
} from "../components/marketing/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? "/app/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const fail = (e: Record<string, string>) => {
    setErrors(e);
    setShake(true);
    window.setTimeout(() => setShake(false), 400);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const e: Record<string, string> = {};
    if (!EMAIL_RE.test(email)) e.email = "Enter a valid email address.";
    if (password.length === 0) e.password = "Enter your password.";
    if (Object.keys(e).length > 0) {
      fail(e);
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      fail({
        password: err instanceof Error ? err.message : "Sign in failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Already signed in (e.g. clicked "Access My Race Hub" while logged in) —
  // skip the Welcome Back form and go straight to the workspace.
  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <AuthShell title="Welcome Back" subtitle="Sign in to your workspace." shake={shake}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label className={authLabel} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInput}
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <p className={authError}>{errors.email}</p>}
        </div>

        <div>
          <label className={authLabel} htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${authInput} pr-16`}
              placeholder="Your password"
              aria-invalid={Boolean(errors.password)}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-bold uppercase text-[#6b7280] hover:text-[#374151] ${focusRing}`}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && <p className={authError}>{errors.password}</p>}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-[#374151]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-hero-blue hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={loading} className={authSubmit}>
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#6b7280]">
        Don't have an account?{" "}
        <Link to="/register" className="font-semibold text-hero-blue hover:underline">
          Register
        </Link>
      </p>
    </AuthShell>
  );
};

export default SignInPage;
