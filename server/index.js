import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import connectDB from "./database/db.js";
import { validateEnv } from "./utils/validateEnv.js";
import { sanitizeMongo } from "./middlewares/sanitize.js";
import userRoute from "./routes/user.route.js";
import courseRoute from "./routes/course.route.js";
import mediaRoute from "./routes/media.route.js";
import purchaseRoute from "./routes/purchaseCourse.route.js";
import courseProgressRoute from "./routes/courseProgress.route.js";

dotenv.config({});
validateEnv();

const app = express();
const PORT = process.env.PORT || 3000;

// Render (and most hosts) put a proxy in front of the app; without this,
// req.ip is the proxy's address and IP rate limits would lump every user
// into one shared bucket.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// The Stripe webhook needs the RAW body to verify its signature, so it is
// parsed here — before express.json() turns it into an object.
app.use("/api/v1/purchase/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(sanitizeMongo);
app.use(helmet());

// CORS: only origins on the allow-list get credentialed access. Configure
// with CLIENT_URLS (comma-separated); FRONTEND_URL's origin is always
// included because checkout redirects depend on it. The localhost entries
// are development defaults only.
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://lms-seven-gold.vercel.app",
];
const envOrigins = (process.env.CLIENT_URLS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
if (process.env.FRONTEND_URL) {
  try {
    envOrigins.push(new URL(process.env.FRONTEND_URL).origin);
  } catch {
    // ignore a malformed FRONTEND_URL here; checkout will surface it
  }
}
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (curl, server-to-server, health checks) is fine.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      const err = new Error("Origin not allowed by CORS");
      err.statusCode = 403;
      return callback(err);
    },
    credentials: true,
  })
);

// Rate limits: a generous ceiling for the whole API, a strict one for the
// credential endpoints (brute-force protection). In-memory store — correct
// for the single-instance deployment this app runs on; a multi-instance
// deployment would need a shared store.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
  skip: (req) => req.path.startsWith("/api/v1/purchase/webhook"),
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // Only FAILED attempts consume the budget — brute force is made of
  // failures; a legitimate user logging in successfully is never throttled.
  skipSuccessfulRequests: true,
  message: { success: false, message: "Too many login attempts, please try again later." },
});
app.use("/api/v1", apiLimiter);
app.use("/api/v1/user/login", authLimiter);
app.use("/api/v1/user/register", authLimiter);

// Password recovery/change get their own tight hourly budgets so the flow
// can't be spammed: a handful of honest mistakes is fine, fun-and-games is
// not. forgot-password is additionally keyed per email+IP, so one mailbox
// can't be mail-bombed from a crowd of addresses either.
const tooMany = (what) => ({
  success: false,
  message: `Too many ${what} requests. Please try again later.`,
});
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany("password reset"),
});
const forgotPerEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `email:${String(req.body?.email || "").toLowerCase().trim()}`,
  message: tooMany("password reset"),
});
const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany("password reset"),
});
const changePasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany("password change"),
});
app.use("/api/v1/user/forgot-password", forgotPasswordLimiter, forgotPerEmailLimiter);
app.use("/api/v1/user/reset-password", resetPasswordLimiter);
app.use("/api/v1/user/change-password", changePasswordLimiter);

// Cheap liveness probe for the host — no DB access, no internals leaked.
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// apis
app.use("/api/v1/media", mediaRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/course", courseRoute);
app.use("/api/v1/purchase", purchaseRoute);
app.use("/api/v1/progress", courseProgressRoute);

// Any other route: JSON 404 (used to be Express's HTML error page).
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler — must stay last. Known client errors keep their
// status and a safe message; everything else is a generic 500 and the
// detail goes to the server log only (never a stack trace to the client).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err?.type === "entity.parse.failed" || (err instanceof SyntaxError && "body" in err)) {
    return res.status(400).json({ success: false, message: "Malformed JSON body" });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body too large" });
  }
  if (err?.name === "MulterError") {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({ success: false, message: `Upload rejected (${err.code})` });
  }
  if (err?.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }
  const status = err?.statusCode || 500;
  if (status >= 500) {
    console.error(err?.name || "Error", "-", String(err?.message || "").slice(0, 200));
  }
  return res.status(status).json({
    success: false,
    message: status >= 500 ? "Internal server error" : err.message || "Request failed",
  });
});

await connectDB();

const server = app.listen(PORT, () => {
  console.log(`Server listen at port ${PORT}`);
});

// Graceful shutdown: stop accepting requests, close the DB pool, then exit.
// A stuck shutdown is forced after 10s so the host can restart cleanly.
const shutdown = (signal) => {
  console.log(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    try {
      await mongoose.disconnect();
    } finally {
      process.exit(0);
    }
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
