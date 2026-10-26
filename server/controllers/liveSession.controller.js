import mongoose from "mongoose";
import crypto from "node:crypto";
import { LiveSession } from "../models/liveSession.model.js";
import { Course } from "../models/course.model.js";
import { User } from "../models/user.model.js";
import { loadCourseForProgress } from "./courseProgress.controller.js";

// Live sessions (Jitsi Meet embed). Scheduling and enrolment live
// here; the call itself runs on meet.jit.si in the student's/teacher's
// browser via the IFrame API — this server never touches media.
//
// Access rules:
//  - Only the course owner (an instructor) can schedule/end sessions.
//  - The room slug is the join secret. Students see a session in their
//    list as soon as it is scheduled, but the slug itself is released
//    only inside the join window (15 minutes before start until the
//    scheduled end) or while the teacher has marked the session live —
//    and only to enrolled students, via the join endpoint.
//  - One Jitsi rule shapes the UX copy: whoever starts a room on
//    meet.jit.si may be asked by Jitsi to sign in (Google/GitHub/
//    Facebook) to host it. The teacher should join first; students join
//    without any account.

const JOIN_EARLY_MS = 15 * 60 * 1000;

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const serverError = (res, error, message) => {
  console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
  return res.status(500).json({ success: false, message });
};

const isJoinable = (session, now = Date.now()) => {
  if (session.status === "ended") return false;
  if (session.status === "live") return true;
  const start = new Date(session.startsAt).getTime();
  const end = start + session.durationMin * 60_000;
  return now >= start - JOIN_EARLY_MS && now <= end;
};

const loadOwnedCourse = async (req, res, courseId) => {
  const course = await Course.findById(courseId);
  if (!course) {
    fail(res, 404, "Course not found!");
    return null;
  }
  if (String(course.creator) !== String(req.id)) {
    fail(res, 403, "You can only manage live sessions on your own courses.");
    return null;
  }
  return course;
};

const loadOwnedSession = async (req, res, sessionId) => {
  const session = await LiveSession.findById(sessionId);
  if (!session) {
    fail(res, 404, "Live session not found!");
    return null;
  }
  const course = await loadOwnedCourse(req, res, session.courseId);
  if (!course) return null;
  return session;
};

// POST /api/v1/live-session/course/:courseId
export const createLiveSession = async (req, res) => {
  try {
    const course = await loadOwnedCourse(req, res, req.params.courseId);
    if (!course) return;
    const { title, startsAt, durationMin } = req.body || {};
    if (typeof title !== "string" || title.trim().length < 1 || title.trim().length > 200) {
      return fail(res, 400, "A session needs a title of at most 200 characters.");
    }
    const start = new Date(startsAt);
    if (!startsAt || Number.isNaN(start.getTime())) {
      return fail(res, 400, "A session needs a valid start time.");
    }
    const duration = durationMin === undefined ? 60 : Number(durationMin);
    if (!Number.isInteger(duration) || duration < 5 || duration > 600) {
      return fail(res, 400, "Duration must be a whole number of minutes between 5 and 600.");
    }
    const sessionId = new mongoose.Types.ObjectId();
    const roomSlug = `lms-${course._id}-${sessionId}-${crypto
      .randomBytes(6)
      .toString("hex")}`;
    const session = await LiveSession.create({
      _id: sessionId,
      courseId: course._id,
      title: title.trim(),
      startsAt: start,
      durationMin: duration,
      roomSlug,
      createdBy: req.id,
    });
    return res.status(201).json({ success: true, session, message: "Live session scheduled." });
  } catch (error) {
    return serverError(res, error, "Failed to schedule live session");
  }
};

// GET /api/v1/live-session/course/:courseId — owner view, slugs included
// (the owner needs them to join/host).
export const listCourseSessionsForOwner = async (req, res) => {
  try {
    const course = await loadOwnedCourse(req, res, req.params.courseId);
    if (!course) return;
    const sessions = await LiveSession.find({ courseId: course._id })
      .sort({ startsAt: 1 })
      .lean();
    return res.status(200).json({
      success: true,
      sessions: sessions.map((s) => ({ ...s, joinable: isJoinable(s) })),
    });
  } catch (error) {
    return serverError(res, error, "Failed to load live sessions");
  }
};

// PATCH /api/v1/live-session/:sessionId/status { status }
export const setLiveSessionStatus = async (req, res) => {
  try {
    const session = await loadOwnedSession(req, res, req.params.sessionId);
    if (!session) return;
    const status = (req.body || {}).status;
    if (!["scheduled", "live", "ended"].includes(status)) {
      return fail(res, 400, "Status must be 'scheduled', 'live' or 'ended'.");
    }
    session.status = status;
    await session.save();
    return res.status(200).json({
      success: true,
      session: { _id: session._id, status: session.status },
      message: "Session updated.",
    });
  } catch (error) {
    return serverError(res, error, "Failed to update live session");
  }
};

// DELETE /api/v1/live-session/:sessionId
export const deleteLiveSession = async (req, res) => {
  try {
    const session = await loadOwnedSession(req, res, req.params.sessionId);
    if (!session) return;
    await LiveSession.findByIdAndDelete(session._id);
    return res.status(200).json({ success: true, message: "Live session deleted." });
  } catch (error) {
    return serverError(res, error, "Failed to delete live session");
  }
};

// GET /api/v1/live-session/mine — sessions for my enrolled courses.
// The room slug is included ONLY for sessions inside their join
// window; everything else is schedule information.
export const listMyLiveSessions = async (req, res) => {
  try {
    const courses = await Course.find({
      $or: [{ enrolledStudents: req.id }, { creator: req.id }],
    })
      .select("courseTitle")
      .lean();
    const courseById = new Map(courses.map((c) => [String(c._id), c]));
    const sessions = await LiveSession.find({
      courseId: { $in: courses.map((c) => c._id) },
    })
      .sort({ startsAt: 1 })
      .lean();
    const now = Date.now();
    return res.status(200).json({
      success: true,
      sessions: sessions.map((s) => {
        const joinable = isJoinable(s, now);
        return {
          _id: s._id,
          courseId: s.courseId,
          courseTitle: courseById.get(String(s.courseId))?.courseTitle || "",
          title: s.title,
          startsAt: s.startsAt,
          durationMin: s.durationMin,
          status: s.status,
          joinable,
          ...(joinable ? { roomSlug: s.roomSlug } : {}),
        };
      }),
    });
  } catch (error) {
    return serverError(res, error, "Failed to load live sessions");
  }
};

// GET /api/v1/live-session/:sessionId/join — the gate at join time:
// enrolled (or owner) AND inside the join window. Returns everything
// the embed needs, including the caller's display name for Jitsi.
export const getLiveSessionJoinInfo = async (req, res) => {
  try {
    const session = await LiveSession.findById(req.params.sessionId);
    if (!session) return fail(res, 404, "Live session not found!");
    req.params.courseId = String(session.courseId);
    const course = await loadCourseForProgress(req, res);
    if (!course) return;
    if (!isJoinable(session)) {
      return fail(
        res,
        403,
        session.status === "ended"
          ? "This session has ended."
          : "This session is not open yet — joining opens 15 minutes before the start time."
      );
    }
    const me = await User.findById(req.id).select("name role").lean();
    return res.status(200).json({
      success: true,
      session: {
        _id: session._id,
        courseId: session.courseId,
        title: session.title,
        startsAt: session.startsAt,
        durationMin: session.durationMin,
        status: session.status,
        roomSlug: session.roomSlug,
      },
      me: { name: me?.name || "Guest", role: me?.role || "student" },
    });
  } catch (error) {
    return serverError(res, error, "Failed to load live session");
  }
};
