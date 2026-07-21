import { API_BASE as BASE, withCreds } from "./config";

/**
 * Downloads all of the current user's data as a JSON file (GDPR subject access).
 * Fetches with credentials, then triggers a browser download.
 */
export async function exportMyData(): Promise<void> {
  const res = await fetch(`${BASE}/account/export`, withCreds);
  if (!res.ok) throw new Error("Could not export your data.");

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "virtualpete-data-export.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/** Permanently deletes the current user's account and all their data. */
export async function deleteMyAccount(): Promise<void> {
  const res = await fetch(`${BASE}/account`, { method: "DELETE", ...withCreds });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(
      (payload as { error?: string }).error ?? "Could not delete your account."
    );
  }
}
