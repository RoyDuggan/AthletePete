import React, { useState } from "react";
import { Link } from "react-router-dom";

import AuthShell from "../components/marketing/AuthShell";
import { authInput, authLabel, authSubmit, authError } from "../components/marketing/ui";
import { forgotPassword } from "../api/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      // The endpoint always succeeds; a network error is the only failure.
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle="Password reset requested.">
        <p className="text-sm leading-relaxed text-[#374151]">
          If an account exists for <strong>{email}</strong>, we&rsquo;ve emailed a
          link to reset your password. It expires in 1 hour. Don&rsquo;t forget to
          check your spam folder.
        </p>
        <p className="mt-6 text-center text-sm text-[#6b7280]">
          <Link to="/sign-in" className="font-semibold text-hero-blue hover:underline">
            Back to sign in
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password" subtitle="We'll email you a reset link.">
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
            aria-invalid={Boolean(error)}
          />
          {error && <p className={authError}>{error}</p>}
        </div>
        <button type="submit" disabled={loading} className={authSubmit}>
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[#6b7280]">
        <Link to="/sign-in" className="font-semibold text-hero-blue hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
