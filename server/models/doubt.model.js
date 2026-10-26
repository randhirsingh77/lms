import mongoose from "mongoose";

// A doubt is a question pinned to a MOMENT in a lecture video, not
// just to the lecture: timestampSec is captured from the player when
// the student asks, and clicking the doubt seeks the player back to
// that second. videoDurationSec is stored alongside so a doubt whose
// video was later replaced with a different-length cut can be spotted
// (and closed by the instructor) instead of pointing at a wrong
// moment forever.
const replySchema = new mongoose.Schema(
  {
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["instructor", "student"], default: "student" },
    body: { type: String, required: true, maxlength: 2000 },
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const doubtSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    timestampSec: { type: Number, required: true, min: 0 },
    videoDurationSec: { type: Number, min: 0 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ["open", "answered", "closed"],
      default: "open",
      index: true,
    },
    replies: [replySchema],
    upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export const Doubt = mongoose.model("Doubt", doubtSchema);
