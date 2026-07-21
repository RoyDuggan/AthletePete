import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import AuthShell from "../components/marketing/AuthShell";
import { verifyEmailToken } from "../api/auth";

type Status = "verifying" | "success" | "error";

const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true; // guard React 18 StrictMode double-invoke (token is single-use)
    verifyEmailToken(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <AuthShell
      title={
        status === "success"
          ? "Email verified"
          : status === "verifying"
          ? "Verifying…"
          : "Verification failed"
      }
      subtitle={status === "verifying" ? "One moment." : ""}
    >
      {status === "verifying" && (
        <p className="text-sm text-[#374151]">Confirming your email address…</p>
      )}
      {status === "success" && (
        <>
          <p className="text-sm text-[#374151]">
            Thanks — your email address is now verified.
          </p>
          <p className="mt-6 text-center text-sm text-[#6b7280]">
            <Link
              to="/app/dashboard"
              className="font-semibold text-hero-blue hover:underline"
            >
              Go to your dashboard
            </Link>
          </p>
        </>
      )}
      {status === "error" && (
        <>
          <p className="text-sm text-[#374151]">
            This verification link is invalid or has expired. You can request a
            new one from your Settings after signing in.
          </p>
          <p className="mt-6 text-center text-sm text-[#6b7280]">
            <Link
              to="/sign-in"
              className="font-semibold text-hero-blue hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
};

export default VerifyEmailPage;
