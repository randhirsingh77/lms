import { CourseProgress } from "../models/courseProgress.js";
import { Quiz } from "../models/quiz.model.js";
import { QuizAttempt } from "../models/quizAttempt.model.js";

// Single source of truth for "has this student EARNED a certificate for
// this course". Used by the certificate issue endpoint — and ONLY by it.
//
// The rule is deliberately NOT the CourseProgress `completed` flag:
// that flag can be set by the "Mark as completed" button, which is a
// personal marker, not evidence of learning. Eligibility is computed
// from primary records instead:
//   1. a `viewed` progress entry for EVERY lecture currently in the
//      course (entries for lectures since removed don't count), and
//   2. a PASSING quiz attempt for every lecture that has a quiz
//      (lectures without a quiz never block — quizzes are opt-in
//      content, see quiz.controller).
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

  // Quiz gate: only lectures that actually have a quiz can block.
  const quizzes = await Quiz.find({ courseId: course._id }).select("lectureId").lean();
  const quizLectureIds = [...new Set(quizzes.map((q) => String(q.lectureId)))];
  const unpassedQuizLectureIds = [];
  if (quizLectureIds.length > 0) {
    const passedAttempts = await QuizAttempt.find({
      userId,
      quizId: { $in: quizzes.map((q) => q._id) },
      passed: true,
    })
      .select("quizId")
      .lean();
    const passedQuizIds = new Set(passedAttempts.map((a) => String(a.quizId)));
    const quizByLecture = new Map(quizzes.map((q) => [String(q.lectureId), String(q._id)]));
    for (const lectureId of quizLectureIds) {
      if (!passedQuizIds.has(quizByLecture.get(lectureId))) {
        unpassedQuizLectureIds.push(lectureId);
      }
    }
  }

  return {
    eligible:
      lectureIds.length > 0 &&
      missingLectureIds.length === 0 &&
      unpassedQuizLectureIds.length === 0,
    totalLectures: lectureIds.length,
    viewedLectures: lectureIds.length - missingLectureIds.length,
    missingLectureIds,
    quizLectureCount: quizLectureIds.length,
    unpassedQuizLectureIds,
  };
};
