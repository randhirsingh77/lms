import mongoose from "mongoose";
import { questionSchema } from "./quiz.model.js";

// A standalone, timed test attached to a course (unlike per-lecture
// quizzes, which are untimed practice). Questions reuse the quiz
// question schema verbatim — correctIndex and explanation are
// SERVER-ONLY and are stripped from every student payload, with scoring
// done in test.controller.js, never in the browser.
//
// Integrity logging: attempts record focus/fullscreen/copy-paste events
// the student's browser reports (see testAttempt.model.js). The events
// are evidence for the instructor to review — the platform records what
// happened in the test window; it does not judge intent.
const testSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 1000 },
    questions: [questionSchema],
    durationMin: { type: Number, default: 30, min: 1, max: 600 },
    passPct: { type: Number, default: 70, min: 1, max: 100 },
    // Qualifying integrity events (long tab-hide, fullscreen exit, long
    // window blur) count as warnings. The student gets a final warning
    // at this count; one more qualifying event auto-submits the attempt.
    maxWarnings: { type: Number, default: 3, min: 0, max: 20 },
    published: { type: Boolean, default: false, index: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Test = mongoose.model("Test", testSchema);
