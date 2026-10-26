import mongoose from "mongoose";
import crypto from "node:crypto";

// A certificate is a SERVER record, not a file: the public verify page
// looks this document up by its unguessable id, so a printed/downloaded
// copy proves nothing on its own and a revoked certificate fails the
// lookup even if the printout still exists. The snapshot freezes the
// names as they were on the day of issue — a later profile rename must
// not rewrite history on an already-issued certificate.
const certificateSchema = new mongoose.Schema(
  {
    certId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => crypto.randomUUID(),
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    issuer: {
      type: String,
      default: "E-Learning",
    },
    snapshot: {
      studentName: { type: String, required: true },
      courseTitle: { type: String, required: true },
      instructorName: { type: String, default: "" },
    },
    // HMAC-SHA256 over the snapshot fields, keyed by a server-only
    // secret. Recomputed at verify time: if the stored record were ever
    // edited directly in the database, the checksum would no longer
    // match and verification reports the mismatch instead of "valid".
    checksum: {
      type: String,
      default: "",
    },
    revoked: {
      type: Boolean,
      default: false,
    },
    revokedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// One live certificate per student per course: re-issuing returns the
// existing record instead of minting duplicates.
certificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const Certificate = mongoose.model("Certificate", certificateSchema);
