// Lazy-init Resend (ESM-only package) via dynamic import so the rest of the
// codebase stays CommonJS. Falls back to console logging in dev when no API key.
let _resend = null;

async function getResend() {
  if (_resend) return _resend;
  if (!process.env.RESEND_API_KEY) return null;
  const { Resend } = await import("resend");
  _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.EMAIL_FROM || "DailyForge <noreply@dailyforge.app>";

async function sendEmail({ to, subject, html }) {
  const resend = await getResend();
  if (resend) {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) throw new Error(error.message);
  } else {
    const plain = html.replace(/<a[^>]+href="([^"]+)"[^>]*>[^<]+<\/a>/g, "$1")
                      .replace(/<[^>]+>/g, "")
                      .trim();
    console.log("\n━━━━━━━━━━ [DEV EMAIL] ━━━━━━━━━━");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(plain);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }
}

async function sendVerificationEmail(email, token) {
  const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
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

async function sendPasswordResetEmail(email, token) {
  const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
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

async function sendEmailChangeVerification(newEmail, token) {
  const url = `${process.env.CLIENT_URL}/verify-email-change?token=${token}`;
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

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEmailChangeVerification,
};
