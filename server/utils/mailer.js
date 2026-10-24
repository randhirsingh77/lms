import nodemailer from "nodemailer";

// Outbound mail (currently: password-reset links only). SMTP is configured
// ONLY through environment variables — no credentials ever live in code:
//
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
//
// (For Gmail, SMTP_USER is the mailbox and SMTP_PASS an *app password*.)
// When SMTP is not configured, isSmtpConfigured() is false and the caller
// decides the fallback (dev: log the link; prod: log an error) — the API
// response to the user never changes either way.

export const isSmtpConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS upgrade
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

export const sendPasswordResetEmail = async (to, resetUrl) => {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  await getTransporter().sendMail({
    from,
    to,
    subject: "Reset your E-Learning password",
    text:
      "We received a request to reset your E-Learning password.\n\n" +
      `Reset it here (link expires in 30 minutes and works only once):\n${resetUrl}\n\n` +
      "If you didn't request this, you can ignore this email — your password stays unchanged.",
    html:
      `<p>We received a request to reset your E-Learning password.</p>` +
      `<p><a href="${resetUrl}">Reset your password</a> — the link expires in 30 minutes and works only once.</p>` +
      `<p>If you didn't request this, you can ignore this email — your password stays unchanged.</p>`,
  });
};
