import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import AuthShell from "../components/marketing/AuthShell";
import { authInput, authLabel, authSubmit, authError } from "../components/marketing/ui";
import { resetPassword } from "../api/auth";

const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Reset password" subtitle="Link problem.">
        <p className="text-sm text-[#374151]">
          This reset link is missing or invalid. Please request a new one.
        </p>
        <p className="mt-6 text-center text-sm text-[#6b7280]">
          <Link to="/forgot-password" className="font-semibold text-hero-blue hover:underline">
            Request a new link
          </Link>
        </p>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You're all set.">
        <p className="text-sm text-[#374151]">
          Your password has been changed. You can now sign in with your new
          password.
        </p>
        <p className="mt-6 text-center text-sm text-[#6b7280]">
          <Link to="/sign-in" className="font-semibold text-hero-blue hover:underline">
            Go to sign in
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Set your new password below.">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label className={authLabel} htmlFor="password">
            New password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInput}
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label className={authLabel} htmlFor="confirm">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={authInput}
            placeholder="Re-enter your password"
          />
          {error && <p className={authError}>{error}</p>}
        </div>
        <button type="submit" disabled={loading} className={authSubmit}>
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
};

export default ResetPasswordPage;
