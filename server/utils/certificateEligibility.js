import { CourseProgress } from "../models/courseProgress.js";

// Single source of truth for "has this student EARNED a certificate for
// this course". Used by the certificate issue endpoint — and ONLY by it.
//
// The rule is deliberately NOT the CourseProgress `completed` flag:
// that flag can be set by the "Mark as completed" button, which is a
// personal marker, not evidence of learning. Eligibility is computed
// from primary records instead: a `viewed` progress entry for EVERY
// lecture currently in the course (entries for lectures since removed
// don't count, and an empty course can never be certified).
export const getCertificateEligibility = async (userId, course) => {
  const lectureIds = (course.lectures || []).map((id) => String(id));
  const progress = await CourseProgress.findOne({
    courseId: String(course._id),
    userId: String(userId),
  });

  const viewedIds = new Set(
    (progress?.lectureProgress || [])
      .filter((entry) => entry.viewed)
      .map((entry) => String(entry.lectureId))
  );
  const missingLectureIds = lectureIds.filter((id) => !viewedIds.has(id));

  return {
    eligible: lectureIds.length > 0 && missingLectureIds.length === 0,
    totalLectures: lectureIds.length,
    viewedLectures: lectureIds.length - missingLectureIds.length,
    missingLectureIds,
  };
};
