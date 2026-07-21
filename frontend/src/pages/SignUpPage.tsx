import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    agree: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!EMAIL_RE.test(form.email)) e.email = "Enter a valid email address.";
    if (form.password.length < 8)
      e.password = "Password must be at least 8 characters.";
    if (form.confirm !== form.password)
      e.confirm = "Passwords do not match.";
    if (!form.agree) e.agree = "Please accept the terms to continue.";
    return e;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    try {
      await register(form.email, form.password, form.name || undefined);
      setDone(true);
    } catch (err) {
      setErrors({
        email: err instanceof Error ? err.message : "Registration failed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="You're in!" subtitle="Your account has been created.">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#10b981] text-3xl text-white">
            ✓
          </div>
          <button
            type="button"
            onClick={() => navigate("/app/dashboard")}
            className={`mt-6 ${authSubmit}`}
          >
            Continue to the app →
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Sign Up" subtitle="Start turning telemetry into lap time.">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label className={authLabel} htmlFor="name">
            Full name <span className="font-normal text-[#9ca3af]">(optional)</span>
          </label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={authInput}
            placeholder="Lewis Hamilton"
          />
        </div>

        <div>
          <label className={authLabel} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
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
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className={`${authInput} pr-16`}
              placeholder="At least 8 characters"
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

        <div>
          <label className={authLabel} htmlFor="confirm">
            Confirm password
          </label>
          <input
            id="confirm"
            type={showPw ? "text" : "password"}
            value={form.confirm}
            onChange={(e) => set("confirm", e.target.value)}
            className={authInput}
            placeholder="Re-enter your password"
            aria-invalid={Boolean(errors.confirm)}
          />
          {errors.confirm && <p className={authError}>{errors.confirm}</p>}
        </div>

        <div>
          <label className="flex items-start gap-2 text-sm text-[#374151]">
            <input
              type="checkbox"
              checked={form.agree}
              onChange={(e) => set("agree", e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand"
            />
            <span>
              I agree to the{" "}
              <Link to="/terms" className="font-semibold text-hero-blue hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="font-semibold text-hero-blue hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {errors.agree && <p className={authError}>{errors.agree}</p>}
        </div>

        <button type="submit" disabled={submitting} className={authSubmit}>
          {submitting ? "Creating account…" : "Sign Up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#6b7280]">
        Already have an account?{" "}
        <Link to="/sign-in" className="font-semibold text-hero-blue hover:underline">
          Sign In
        </Link>
      </p>
    </AuthShell>
  );
};

export default SignUpPage;
