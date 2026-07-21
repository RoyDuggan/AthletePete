import { ServerClient } from "postmark";

/**
 * Transactional email via Postmark. Env-driven and inert until
 * POSTMARK_SERVER_TOKEN is set: when unconfigured, sends are logged (with the
 * link) to the server console instead — handy in dev and so account actions
 * never fail just because email isn't wired up yet.
 */
const FROM = process.env.EMAIL_FROM || "no-reply@athletepete.co.uk";

export function emailEnabled(): boolean {
  return Boolean(process.env.POSTMARK_SERVER_TOKEN);
}

let client: ServerClient | null = null;
function getClient(): ServerClient {
  if (!client) client = new ServerClient(process.env.POSTMARK_SERVER_TOKEN as string);
  return client;
}

/** Public base URL for links in emails: request origin, else env, else local. */
export function linkBase(reqOrigin?: string): string {
  if (reqOrigin) return reqOrigin.replace(/\/$/, "");
  return (
    process.env.APP_URL ||
    process.env.PUBLIC_URL ||
    "http://localhost:8080"
  ).replace(/\/$/, "");
}

type Mail = { to: string; subject: string; html: string; text: string };

async function send(mail: Mail): Promise<void> {
  if (!emailEnabled()) {
    console.log(
      `[email:disabled] would send to ${mail.to} — "${mail.subject}"\n${mail.text}`
    );
    return;
  }
  await getClient().sendEmail({
    From: FROM,
    To: mail.to,
    Subject: mail.subject,
    HtmlBody: mail.html,
    TextBody: mail.text,
    MessageStream: "outbound",
  });
}

const wrap = (heading: string, body: string, cta: { label: string; url: string }) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
    <h2 style="color:#111827">${heading}</h2>
    <p style="line-height:1.6">${body}</p>
    <p style="margin:28px 0">
      <a href="${cta.url}" style="background:#a6e22e;color:#000;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block">${cta.label}</a>
    </p>
    <p style="font-size:12px;color:#6b7280;line-height:1.6">If the button doesn't work, copy this link into your browser:<br>${cta.url}</p>
    <p style="font-size:12px;color:#6b7280">— AthletePete</p>
  </div>`;

export async function sendVerificationEmail(
  to: string,
  name: string | null,
  url: string
): Promise<void> {
  const hi = name ? `Hi ${name},` : "Hi,";
  await send({
    to,
    subject: "Verify your AthletePete email address",
    text: `${hi}\n\nThanks for creating your AthletePete account. Confirm your email address using this link (expires in 24 hours):\n\n${url}\n\nIf you didn't sign up, you can ignore this email.\n\n— AthletePete`,
    html: wrap(
      "Confirm your email",
      `${hi} thanks for creating your AthletePete account. Please confirm your email address — this link expires in 24 hours. If you didn't sign up, you can ignore this email.`,
      { label: "Verify email address", url }
    ),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string | null,
  url: string
): Promise<void> {
  const hi = name ? `Hi ${name},` : "Hi,";
  await send({
    to,
    subject: "Reset your AthletePete password",
    text: `${hi}\n\nWe received a request to reset your AthletePete password. Choose a new one using this link (expires in 1 hour):\n\n${url}\n\nIf you didn't request this, no action is needed and your password stays the same.\n\n— AthletePete`,
    html: wrap(
      "Reset your password",
      `${hi} we received a request to reset your AthletePete password. This link expires in 1 hour. If you didn't request this, no action is needed and your password stays the same.`,
      { label: "Reset password", url }
    ),
  });
}
