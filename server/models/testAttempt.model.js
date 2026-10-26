import mongoose from "mongoose";

// One student's run at a test. The attempt starts only after the
// student accepts the integrity-logging notice (consentAt +
// noticeVersion are stored on the attempt itself, so what was agreed to
// is auditable later).
//
// events[] is the integrity log: things the student's browser reported
// during the attempt (tab hidden, fullscreen exited, window blurred,
// copy/paste attempts). Timestamps (`at`) are stamped by the SERVER when
// the event arrives, never trusted from the client. Paste events store
// only a character count — never the pasted content.
//
// reviewDecision is the instructor's call after looking at the flagged
// events: the system flags, a human decides.
export const TEST_EVENT_TYPES = [
  "tab_hidden",
  "tab_visible",
  "fullscreen_entered",
  "fullscreen_exited",
  "window_blur",
  "window_focus",
  "copy_attempt",
  "paste_attempt",
  "context_menu",
];

const eventSchema = new mongoose.Schema(
  {
    type: { type: String, enum: TEST_EVENT_TYPES, required: true },
    at: { type: Date, required: true },
    durationMs: { type: Number, min: 0, default: null },
    charCount: { type: Number, min: 0, default: null },
  },
  { _id: false }
);

const testAttemptSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "submitted", "auto_submitted"],
      default: "in_progress",
      index: true,
    },
    // Selected option index per question (-1 = unanswered). Saved as the
    // student works so an auto-submit (warning limit or time up) scores
    // what they had actually answered.
    answers: [{ type: Number }],
    scorePct: { type: Number, default: null, min: 0, max: 100 },
    passed: { type: Boolean, default: false },
    events: [eventSchema],
    warningsUsed: { type: Number, default: 0, min: 0 },
    consentAt: { type: Date, required: true },
    noticeVersion: { type: String, required: true, maxlength: 40 },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: null },
    reviewDecision: {
      type: String,
      enum: ["pending", "cleared", "upheld"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const TestAttempt = mongoose.model("TestAttempt", testAttemptSchema);
