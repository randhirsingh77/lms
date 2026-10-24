// Boot-time environment validation: fail fast with a clear list of what is
// missing instead of booting half-configured and failing per-request.
// Values are NEVER printed — only variable names.
const REQUIRED_ALWAYS = ["MONGO_URI", "SECRET_KEY"];
// Needed for the features they power; the server boots without them but
// the corresponding endpoints answer 503, so warn loudly.
const OPTIONAL_FEATURES = [
  ["STRIPE_SECRET_KEY", "payments (checkout + webhook)"],
  ["WEBHOOK_ENDPOINT_SECRET", "payments (checkout + webhook)"],
  ["CLOUD_NAME", "media uploads (Cloudinary)"],
  ["API_KEY", "media uploads (Cloudinary)"],
  ["API_SECRET", "media uploads (Cloudinary)"],
  ["FRONTEND_URL", "payment redirect URLs"],
  ["SMTP_HOST", "password-reset emails (SMTP)"],
  ["SMTP_USER", "password-reset emails (SMTP)"],
  ["SMTP_PASS", "password-reset emails (SMTP)"],
];

export function validateEnv() {
  const missing = REQUIRED_ALWAYS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(
      `FATAL: missing required environment variables: ${missing.join(", ")}. ` +
        "Set them (see server/.env.example) and restart."
    );
    process.exit(1);
  }
  if (process.env.SECRET_KEY.length < 32) {
    console.warn(
      "WARNING: SECRET_KEY is shorter than 32 characters. " +
        "Use a long random value in production (e.g. `openssl rand -hex 32`)."
    );
  }
  for (const [name, feature] of OPTIONAL_FEATURES) {
    if (!process.env[name]) {
      console.warn(`WARNING: ${name} is not set — ${feature} will be unavailable.`);
    }
  }
}
