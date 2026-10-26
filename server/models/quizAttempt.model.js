import mongoose from "mongoose";

// Every submission is kept: retakes are unlimited, and both the
// certificate gate and the public skill profile read the student's
// BEST/passing attempts from these records. attemptedAt doubles as an
// activity timestamp for learning streaks.
const quizAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
      index: true,
    },
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    answers: [{ type: Number }],
    score: { type: Number, required: true, min: 0, max: 100 },
    passed: { type: Boolean, required: true, default: false },
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const QuizAttempt = mongoose.model("QuizAttempt", quizAttemptSchema);
