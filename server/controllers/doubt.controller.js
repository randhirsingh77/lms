import { Doubt } from "../models/doubt.model.js";
import { Course } from "../models/course.model.js";
import { User } from "../models/user.model.js";
import { loadCourseForProgress } from "./courseProgress.controller.js";

// Doubts are visible to the students enrolled in the course (and its
// creator) — never to the public. Every handler below resolves access
// through the same enrolment guard as course progress, or an explicit
// creator/enrolled check for the id-based routes. Bodies are plain
// text: the server strips Mongo operators globally, and the client
// renders text (React-escaped), so no HTML ever needs to be trusted.

const isStr = (v, min, max) =>
  typeof v === "string" && v.trim().length >= min && v.trim().length <= max;

const populateDoubt = (query) =>
  query
    .populate({ path: "userId", select: "name photoUrl" })
    .populate({ path: "replies.by", select: "name photoUrl" });

const canAccessCourse = (course, userId) =>
  String(course.creator) === String(userId) ||
  (course.enrolledStudents || []).some((id) => String(id) === String(userId));

// POST /api/v1/doubt/course/:courseId/lecture/:lectureId
export const createDoubt = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const course = await loadCourseForProgress(req, res);
    if (!course) return;
    if (!(course.lectures || []).some((id) => String(id) === String(lectureId))) {
      return res.status(400).json({ success: false, message: "Lecture does not belong to this course" });
    }
    const { body, timestampSec, videoDurationSec } = req.body || {};
    if (!isStr(body, 1, 2000)) {
      return res.status(400).json({ success: false, message: "Write your question (up to 2000 characters)." });
    }
    const ts = Number(timestampSec);
    if (!Number.isFinite(ts) || ts < 0) {
      return res.status(400).json({ success: false, message: "A valid video timestamp is required." });
    }
    const duration = Number(videoDurationSec);
    const doubt = await Doubt.create({
      courseId,
      lectureId,
      userId: req.id,
      body: body.trim(),
      timestampSec: Math.round(ts),
      videoDurationSec: Number.isFinite(duration) && duration >= 0 ? Math.round(duration) : undefined,
    });
    const populated = await populateDoubt(Doubt.findById(doubt._id));
    return res.status(201).json({ success: true, doubt: populated, message: "Doubt posted." });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to post doubt" });
  }
};

// GET /api/v1/doubt/course/:courseId/lecture/:lectureId — sorted by
// timestamp, so the list doubles as a map of the moments students
// found confusing.
export const getDoubtsForLecture = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const course = await loadCourseForProgress(req, res);
    if (!course) return;
    if (!(course.lectures || []).some((id) => String(id) === String(lectureId))) {
      return res.status(400).json({ success: false, message: "Lecture does not belong to this course" });
    }
    const doubts = await populateDoubt(
      Doubt.find({ courseId, lectureId }).sort({ timestampSec: 1, createdAt: 1 })
    ).lean();
    return res.status(200).json({ success: true, doubts });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to load doubts" });
  }
};

// GET /api/v1/doubt/inbox — instructor-only (middleware): every doubt
// across the courses this instructor created, open ones first.
export const getInstructorInbox = async (req, res) => {
  try {
    const myCourses = await Course.find({ creator: req.id }).select("_id").lean();
    const courseIds = myCourses.map((c) => c._id);
    if (courseIds.length === 0) {
      return res.status(200).json({ success: true, doubts: [] });
    }
    const doubts = await populateDoubt(
      Doubt.find({ courseId: { $in: courseIds } })
        .populate({ path: "courseId", select: "courseTitle" })
        .populate({ path: "lectureId", select: "lectureTitle" })
        .sort({ createdAt: -1 })
        .limit(300)
    ).lean();
    const statusRank = { open: 0, answered: 1, closed: 2 };
    doubts.sort(
      (a, b) =>
        statusRank[a.status] - statusRank[b.status] ||
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    return res.status(200).json({ success: true, doubts });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to load doubt inbox" });
  }
};

const loadDoubtWithAccess = async (req, res) => {
  const doubt = await Doubt.findById(req.params.doubtId);
  if (!doubt) {
    res.status(404).json({ success: false, message: "Doubt not found" });
    return null;
  }
  const course = await Course.findById(doubt.courseId).select("creator enrolledStudents");
  if (!course || !canAccessCourse(course, req.id)) {
    res.status(403).json({ success: false, message: "Please purchase this course to access its doubts." });
    return null;
  }
  return { doubt, course };
};

// POST /api/v1/doubt/:doubtId/reply
export const replyToDoubt = async (req, res) => {
  try {
    const loaded = await loadDoubtWithAccess(req, res);
    if (!loaded) return;
    const { doubt, course } = loaded;
    const { body } = req.body || {};
    if (!isStr(body, 1, 2000)) {
      return res.status(400).json({ success: false, message: "Write a reply (up to 2000 characters)." });
    }
    if (doubt.status === "closed") {
      return res.status(400).json({ success: false, message: "This doubt is closed." });
    }
    const me = await User.findById(req.id).select("role");
    const isCreator = String(course.creator) === String(req.id);
    doubt.replies.push({
      by: req.id,
      role: isCreator ? "instructor" : me?.role === "instructor" ? "instructor" : "student",
      body: body.trim(),
      at: new Date(),
    });
    // An answer from the course creator IS the answer — marking it
    // answered here keeps the inbox honest without a second click.
    if (isCreator && doubt.status === "open") doubt.status = "answered";
    await doubt.save();
    const populated = await populateDoubt(Doubt.findById(doubt._id));
    return res.status(201).json({ success: true, doubt: populated, message: "Reply posted." });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to post reply" });
  }
};

// POST /api/v1/doubt/:doubtId/upvote — toggle. Upvotes let students
// back an existing question instead of asking a duplicate.
export const upvoteDoubt = async (req, res) => {
  try {
    const loaded = await loadDoubtWithAccess(req, res);
    if (!loaded) return;
    const { doubt } = loaded;
    const idx = doubt.upvotedBy.findIndex((id) => String(id) === String(req.id));
    if (idx === -1) doubt.upvotedBy.push(req.id);
    else doubt.upvotedBy.splice(idx, 1);
    await doubt.save();
    return res.status(200).json({
      success: true,
      upvoted: idx === -1,
      upvotes: doubt.upvotedBy.length,
    });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to upvote doubt" });
  }
};

// PATCH /api/v1/doubt/:doubtId/status — course creator only (e.g. to
// close doubts left stale by a replaced video).
export const setDoubtStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!["open", "answered", "closed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be open, answered or closed." });
    }
    const doubt = await Doubt.findById(req.params.doubtId);
    if (!doubt) {
      return res.status(404).json({ success: false, message: "Doubt not found" });
    }
    const course = await Course.findById(doubt.courseId).select("creator");
    if (!course || String(course.creator) !== String(req.id)) {
      return res.status(403).json({ success: false, message: "Only the course creator can change a doubt's status." });
    }
    doubt.status = status;
    await doubt.save();
    return res.status(200).json({ success: true, doubt, message: "Doubt status updated." });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to update doubt status" });
  }
};

// DELETE /api/v1/doubt/:doubtId — the author or the course creator.
export const deleteDoubt = async (req, res) => {
  try {
    const doubt = await Doubt.findById(req.params.doubtId);
    if (!doubt) {
      return res.status(404).json({ success: false, message: "Doubt not found" });
    }
    const course = await Course.findById(doubt.courseId).select("creator");
    const isCreator = course && String(course.creator) === String(req.id);
    if (!isCreator && String(doubt.userId) !== String(req.id)) {
      return res.status(403).json({ success: false, message: "You can only delete your own doubts." });
    }
    await doubt.deleteOne();
    return res.status(200).json({ success: true, message: "Doubt deleted." });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to delete doubt" });
  }
};
