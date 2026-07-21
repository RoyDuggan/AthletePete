import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { AppPage, appPanel, ComingSoon } from "../../components/app/AppPage";
import { getTier, TIER_LABEL } from "../../lib/tiers";
import { exportMyData, deleteMyAccount } from "../../api/account";
import { resendVerification } from "../../api/auth";

const rowCls = "flex items-center justify-between gap-4 py-3 text-sm";
const labelCls = "text-xs font-bold uppercase tracking-wide text-gray-500";

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [exporting, setExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleResend = async () => {
    setResendState("sending");
    try {
      await resendVerification();
      setResendState("sent");
    } catch {
      setResendState("error");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      await exportMyData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteMyAccount();
      // Full navigation resets all app state; /me now returns null.
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deletion failed.");
      setDeleting(false);
    }
  };

  return (
    <AppPage title="Settings" subtitle="Manage your account.">
      <div className={`${appPanel} max-w-2xl divide-y divide-white/5`}>
        <div className={rowCls}>
          <span className={labelCls}>Email</span>
          <span className="truncate font-semibold text-white">{user?.email}</span>
        </div>
        <div className={rowCls}>
          <span className={labelCls}>Name</span>
          <span className="font-semibold text-white">{user?.fullName ?? "—"}</span>
        </div>
        <div className={rowCls}>
          <span className={labelCls}>Plan</span>
          <span className="font-semibold text-brand">{TIER_LABEL[getTier(user)]}</span>
        </div>
        <div className={`${rowCls} flex-wrap`}>
          <span className={labelCls}>Email verified</span>
          <span className="flex items-center gap-3">
            <span className="font-semibold text-white">
              {user?.emailVerified ? "Yes" : "No"}
            </span>
            {!user?.emailVerified &&
              (resendState === "sent" ? (
                <span className="text-xs text-brand">Verification email sent</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendState === "sending"}
                  className="rounded-md border border-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-200 transition hover:border-white/40 disabled:opacity-50"
                >
                  {resendState === "sending"
                    ? "Sending…"
                    : resendState === "error"
                    ? "Retry send"
                    : "Resend"}
                </button>
              ))}
          </span>
        </div>
        <div className={rowCls}>
          <span className={labelCls}>Coach</span>
          <span
            className="font-semibold text-white"
            title="Grants access to the Coach review area. Managed by the site admin — not user-configurable."
          >
            {user?.driverAdmin ? "Yes" : "No"}
          </span>
        </div>
        <div className={`${rowCls} flex-wrap`}>
          <span className={labelCls}>Session</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-200 transition hover:border-white/40"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Your data (GDPR) */}
      <div className={`${appPanel} mt-6 max-w-2xl`}>
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
          Your data
        </h2>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
          <p className="text-sm text-gray-300">
            Download a copy of all the data we hold about you (account, driver
            profile, karts, sessions and settings) as a JSON file.
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="shrink-0 rounded-md border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-100 transition hover:border-white/40 disabled:opacity-50"
          >
            {exporting ? "Preparing…" : "Download my data"}
          </button>
        </div>

        <div className="mt-4">
          <p className="text-sm text-gray-300">
            Permanently delete your account and all associated data. This cancels
            any active subscription and cannot be undone.
          </p>

          {!confirmOpen ? (
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(true);
                setError(null);
              }}
              className="mt-3 rounded-md border border-[#ef4444]/50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#ef4444] transition hover:border-[#ef4444]"
            >
              Delete my account
            </button>
          ) : (
            <div className="mt-3 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/5 p-4">
              <p className="text-sm text-gray-200">
                This is permanent. Type <strong>DELETE</strong> to confirm.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="mt-3 w-full max-w-xs rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white focus:border-[#ef4444] focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={confirmText !== "DELETE" || deleting}
                  className="rounded-md bg-[#ef4444] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deleting ? "Deleting…" : "Permanently delete"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmOpen(false);
                    setConfirmText("");
                  }}
                  disabled={deleting}
                  className="rounded-md border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-200 transition hover:border-white/40"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-[#ef4444]">{error}</p>}
      </div>

      <div className="mt-6 max-w-2xl">
        <ComingSoon>
          Editing your name and password will be available here soon.
        </ComingSoon>
      </div>
    </AppPage>
  );
};

export default SettingsPage;
