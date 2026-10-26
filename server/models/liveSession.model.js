import mongoose from "mongoose";

// A scheduled live class for a course, run over Jitsi Meet
// (meet.jit.si, embedded with the IFrame API — no account or API key
// needed on our side). We store only the schedule and the room name.
//
// roomSlug is deliberately unguessable — courseId + sessionId + a
// random suffix — because a public Jitsi room is open to anyone who
// has its name. The slug is therefore a secret of the enrolled class:
// it is only ever returned to the course owner and to enrolled
// students, and for students only once the join window opens.
const liveSessionSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    startsAt: { type: Date, required: true },
    durationMin: { type: Number, default: 60, min: 5, max: 600 },
    roomSlug: { type: String, required: true, unique: true, index: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "ended"],
      default: "scheduled",
      index: true,
    },
  },
  { timestamps: true }
);

export const LiveSession = mongoose.model("LiveSession", liveSessionSchema);
