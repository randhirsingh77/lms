import { CourseProgress } from "../models/courseProgress.js";
import { Course } from "../models/course.model.js";

// Progress is the buyer's private learning record AND the doorway to the
// course content (the GET returns the course with its lectures). It used
// to answer ANY logged-in account: a stranger could read a course's full
// lecture list through this endpoint and even mark a course they never
// bought as completed. Access now requires enrolment or ownership —
// the same rule the client-side route guard pretends to enforce.
// Exported: the certificate, doubt and quiz controllers reuse this
// exact enrolment/ownership guard so access rules can never drift
// between "watch the course" and the features built on top of it.
export const loadCourseForProgress = async (req, res) => {
  const { courseId } = req.params;
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404).json({ message: "Course not found" });
    return null;
  }
  const isOwner = String(course.creator) === String(req.id);
  const isEnrolled = (course.enrolledStudents || []).some(
    (id) => String(id) === String(req.id)
  );
  if (!isOwner && !isEnrolled) {
    res.status(403).json({
      message: "Please purchase this course to access its content.",
    });
    return null;
  }
  return course;
};

export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    if (!(await loadCourseForProgress(req, res))) return;

    // step-1 fetch the user course progress
    let courseProgress = await CourseProgress.findOne({
      courseId,
      userId,
    }).populate("courseId");

    const courseDetails = await Course.findById(courseId).populate("lectures");

    // Step-2 If no progress found, return course details with an empty progress
    if (!courseProgress) {
      return res.status(200).json({
        data: {
          courseDetails,
          progress: [],
          completed: false,
        },
      });
    }

    // Step-3 Return the user's course progress alog with course details
    return res.status(200).json({
      data: {
        courseDetails,
        progress: courseProgress.lectureProgress,
        completed: courseProgress.completed,
      },
    });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ message: "Failed to load course progress" });
  }
};

export const updateLectureProgress = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const userId = req.id;

    const course = await loadCourseForProgress(req, res);
    if (!course) return;

    // The lecture must belong to this course. Any id used to be accepted,
    // so progress could be padded with foreign or invented lectures and
    // the completion math ran on meaningless entries.
    if (!(course.lectures || []).some((id) => String(id) === String(lectureId))) {
      return res.status(400).json({ message: "Lecture does not belong to this course" });
    }

    // fetch or create course progress
    let courseProgress = await CourseProgress.findOne({ courseId, userId });

    if (!courseProgress) {
      // If no progress exist, create a new record
      courseProgress = new CourseProgress({
        userId,
        courseId,
        completed: false,
        lectureProgress: [],
      });
    }

    // find the lecture progress in the course progress
    const lectureIndex = courseProgress.lectureProgress.findIndex(
      (lecture) => lecture.lectureId === lectureId
    );

    if (lectureIndex !== -1) {
      // if lecture already exist, update its status
      courseProgress.lectureProgress[lectureIndex].viewed = true;
    } else {
      // Add new lecture progress
      courseProgress.lectureProgress.push({
        lectureId,
        viewed: true,
      });
    }

    // Completion counts only lectures that are still part of the course
    // (a deleted lecture's stale entry must not skew the percentage).
    const courseLectureIds = new Set((course.lectures || []).map((id) => String(id)));
    const lectureProgressLength = courseProgress.lectureProgress.filter(
      (lectureProg) => lectureProg.viewed && courseLectureIds.has(String(lectureProg.lectureId))
    ).length;

    if (course.lectures.length > 0 && course.lectures.length === lectureProgressLength)
      courseProgress.completed = true;

    await courseProgress.save();

    return res.status(200).json({
      message: "Lecture progress updated successfully.",
    });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ message: "Failed to update lecture progress" });
  }
};

export const markAsCompleted = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    if (!(await loadCourseForProgress(req, res))) return;

    const courseProgress = await CourseProgress.findOne({ courseId, userId });
    if (!courseProgress)
      return res.status(404).json({ message: "Course progress not found" });

    // "Mark as completed" is a PERSONAL MARKER only. It used to also
    // flip every lecture's `viewed` flag, which made the marker
    // indistinguishable from actually watching the course — and
    // certificates are issued from those viewed records (see
    // utils/certificateEligibility). The marker now touches ONLY the
    // completed flag; viewed records are written solely by
    // updateLectureProgress when a lecture is really opened/played.
    courseProgress.completed = true;
    await courseProgress.save();
    return res.status(200).json({ message: "Course marked as completed." });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ message: "Failed to load course progress" });
  }
};

export const markAsInCompleted = async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.id;

      if (!(await loadCourseForProgress(req, res))) return;

      const courseProgress = await CourseProgress.findOne({ courseId, userId });
      if (!courseProgress)
        return res.status(404).json({ message: "Course progress not found" });

      // Mirror of markAsCompleted: only the marker flag changes. Real
      // viewed records (and any certificate earned from them) are
      // history and are never rewritten by the marker buttons.
      courseProgress.completed = false;
      await courseProgress.save();
      return res.status(200).json({ message: "Course marked as incompleted." });
    } catch (error) {
      console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
      return res.status(500).json({ message: "Failed to update course progress" });
    }
  };
