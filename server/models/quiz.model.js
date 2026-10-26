import mongoose from "mongoose";

// One quiz per lecture (at most). The questions carry the correct
// answer and an explanation — those fields are SERVER-ONLY: the
// student-facing endpoint rebuilds the payload without them and
// scoring happens here, never in the browser (see quiz.controller).
// Exported so standalone tests (test.model.js) reuse the exact same
// question shape and validation instead of growing a second dialect.
export const questionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true, maxlength: 500 },
    options: {
      type: [{ type: String, maxlength: 300 }],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 2 && arr.length <= 6,
        message: "A question needs between 2 and 6 options",
      },
    },
    correctIndex: { type: Number, required: true, min: 0 },
    explanation: { type: String, default: "", maxlength: 1000 },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture",
      required: true,
      unique: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    passPct: { type: Number, default: 70, min: 1, max: 100 },
    questions: [questionSchema],
  },
  { timestamps: true }
);

export const Quiz = mongoose.model("Quiz", quizSchema);
