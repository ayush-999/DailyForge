import type { Resend as ResendType } from "resend";

let _client: ResendType | null = null;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM = process.env.EMAIL_FROM ?? "DailyForge <noreply@dailyforge.app>";

async function getResend(): Promise<ResendType | null> {
  if (_client) return _client;
  if (!process.env.RESEND_API_KEY) return null;
  const { Resend } = await import("resend");
  _client = new Resend(process.env.RESEND_API_KEY);
  return _client;
}

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = await getResend();
  if (resend) {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) throw new Error(error.message);
  } else {
    const plain = html
      .replace(/<a[^>]+href="([^"]+)"[^>]*>[^<]+<\/a>/g, "$1")
      .replace(/<[^>]+>/g, "")
      .trim();
    console.log("\n━━━━━━━━━━ [DEV EMAIL] ━━━━━━━━━━");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(plain);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: "Verify your DailyForge account",
    html: `
      <p>Welcome to DailyForge!</p>
      <p>Click the link below to verify your email address. The link expires in 24 hours.</p>
      <p><a href="${url}">${url}</a></p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: "Reset your DailyForge password",
    html: `
      <p>We received a request to reset your DailyForge password.</p>
      <p>Click the link below to set a new password. The link expires in 1 hour.</p>
      <p><a href="${url}">${url}</a></p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
    `,
  });
}

export async function sendEmailChangeVerification(newEmail: string, token: string) {
  const url = `${APP_URL}/verify-email-change?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: newEmail,
    subject: "Confirm your new DailyForge email",
    html: `
      <p>Click the link below to confirm your new email address. The link expires in 24 hours.</p>
      <p><a href="${url}">${url}</a></p>
      <p>If you didn't request this change, please contact support immediately.</p>
    `,
  });
}
