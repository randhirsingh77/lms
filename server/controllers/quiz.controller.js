import { Quiz } from "../models/quiz.model.js";
import { QuizAttempt } from "../models/quizAttempt.model.js";
import { Course } from "../models/course.model.js";
import { loadCourseForProgress } from "./courseProgress.controller.js";

// Quiz rules (trimmed design):
//  - A quiz exists only where the instructor authored one. Lectures
//    without a quiz NEVER block progress or certificates.
//  - The gate is firm in exactly one place: certificate eligibility
//    requires a passing attempt for every lecture that has a quiz.
//  - Lecture-to-lecture watching is never blocked (soft gating).
//  - Answers are scored on the server. The student payload is rebuilt
//    field-by-field WITHOUT correctIndex/explanation; explanations are
//    revealed only inside a submission's result.

const isStr = (v, min, max) =>
  typeof v === "string" && v.trim().length >= min && v.trim().length <= max;

const validateQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 20) {
    return "A quiz needs between 1 and 20 questions.";
  }
  for (const q of questions) {
    if (!q || !isStr(q.prompt, 1, 500)) return "Every question needs a prompt.";
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
      return "Every question needs between 2 and 6 options.";
    }
    if (q.options.some((o) => !isStr(o, 1, 300))) return "Options cannot be empty.";
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      return "Every question needs a valid correct option.";
    }
    if (q.explanation !== undefined && (typeof q.explanation !== "string" || q.explanation.length > 1000)) {
      return "Explanations must be at most 1000 characters.";
    }
  }
  return null;
};

// Instructor authoring guard: course must exist, belong to the caller,
// and contain the lecture (same ownership pattern as editLecture).
const loadOwnedCourseLecture = async (req, res) => {
  const { courseId, lectureId } = req.params;
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404).json({ success: false, message: "Course not found!" });
    return null;
  }
  if (String(course.creator) !== String(req.id)) {
    res.status(403).json({ success: false, message: "You can only manage quizzes on your own courses." });
    return null;
  }
  if (!(course.lectures || []).some((id) => String(id) === String(lectureId))) {
    res.status(404).json({ success: false, message: "Lecture not found in this course!" });
    return null;
  }
  return course;
};

// PUT /api/v1/course/:courseId/lecture/:lectureId/quiz — create or
// replace the lecture's quiz (instructor, owner only).
export const upsertLectureQuiz = async (req, res) => {
  try {
    const course = await loadOwnedCourseLecture(req, res);
    if (!course) return;
    const { lectureId } = req.params;
    const { questions, passPct } = req.body || {};
    const questionError = validateQuestions(questions);
    if (questionError) {
      return res.status(400).json({ success: false, message: questionError });
    }
    const pct = passPct === undefined ? 70 : Number(passPct);
    if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
      return res.status(400).json({ success: false, message: "Pass percentage must be a whole number between 1 and 100." });
    }
    const cleanQuestions = questions.map((q) => ({
      prompt: q.prompt.trim(),
      options: q.options.map((o) => o.trim()),
      correctIndex: q.correctIndex,
      explanation: (q.explanation || "").trim(),
    }));
    const quiz = await Quiz.findOneAndUpdate(
      { lectureId },
      { lectureId, courseId: course._id, passPct: pct, questions: cleanQuestions },
      { new: true, upsert: true, runValidators: true }
    );
    return res.status(200).json({ success: true, quiz, message: "Quiz saved." });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to save quiz" });
  }
};

// GET /api/v1/course/:courseId/lecture/:lectureId/quiz — authoring
// view: the owner DOES get correctIndex here (it's their own quiz).
export const getLectureQuizForAuthoring = async (req, res) => {
  try {
    const course = await loadOwnedCourseLecture(req, res);
    if (!course) return;
    const quiz = await Quiz.findOne({ lectureId: req.params.lectureId }).lean();
    return res.status(200).json({ success: true, quiz: quiz || null });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to load quiz" });
  }
};

// DELETE /api/v1/course/:courseId/lecture/:lectureId/quiz
export const deleteLectureQuiz = async (req, res) => {
  try {
    const course = await loadOwnedCourseLecture(req, res);
    if (!course) return;
    await Quiz.findOneAndDelete({ lectureId: req.params.lectureId });
    return res.status(200).json({ success: true, message: "Quiz removed." });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to remove quiz" });
  }
};

// The student shape: rebuilt field-by-field so correctIndex and
// explanation cannot leak, even if the schema grows new fields later.
const studentQuizShape = (quiz) => ({
  _id: quiz._id,
  lectureId: quiz.lectureId,
  courseId: quiz.courseId,
  passPct: quiz.passPct,
  questions: quiz.questions.map((q) => ({
    prompt: q.prompt,
    options: q.options,
  })),
});

const myQuizSummary = async (userId, quizId) => {
  const attempts = await QuizAttempt.find({ userId, quizId })
    .select("score passed attemptedAt")
    .sort({ attemptedAt: -1 })
    .lean();
  return {
    attempts: attempts.length,
    bestScore: attempts.length ? Math.max(...attempts.map((a) => a.score)) : null,
    passed: attempts.some((a) => a.passed),
    lastAttemptedAt: attempts[0]?.attemptedAt || null,
  };
};

// GET /api/v1/quiz/lecture/:lectureId — student view (enrolled/owner).
export const getLectureQuizForStudent = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ lectureId: req.params.lectureId });
    if (!quiz) {
      return res.status(200).json({ success: true, quiz: null, myStatus: null });
    }
    // Enrolment guard needs the course id in params.
    req.params.courseId = String(quiz.courseId);
    const course = await loadCourseForProgress(req, res);
    if (!course) return;
    const myStatus = await myQuizSummary(req.id, quiz._id);
    return res.status(200).json({ success: true, quiz: studentQuizShape(quiz), myStatus });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to load quiz" });
  }
};

// POST /api/v1/quiz/:quizId/submit — scored here, on the server.
export const submitQuizAttempt = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }
    req.params.courseId = String(quiz.courseId);
    const course = await loadCourseForProgress(req, res);
    if (!course) return;

    const { answers } = req.body || {};
    if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
      return res.status(400).json({
        success: false,
        message: `Answer all ${quiz.questions.length} questions.`,
      });
    }
    const cleanAnswers = answers.map((a) =>
      Number.isInteger(a) && a >= 0 ? a : -1
    );
    const results = quiz.questions.map((q, i) => ({
      correct: cleanAnswers[i] === q.correctIndex,
      correctIndex: q.correctIndex,
      explanation: q.explanation || "",
    }));
    const correctCount = results.filter((r) => r.correct).length;
    const score = Math.round((correctCount / quiz.questions.length) * 100);
    const passed = score >= quiz.passPct;

    const attempt = await QuizAttempt.create({
      userId: req.id,
      quizId: quiz._id,
      lectureId: quiz.lectureId,
      courseId: quiz.courseId,
      answers: cleanAnswers,
      score,
      passed,
      attemptedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      attempt: { _id: attempt._id, score, passed, attemptedAt: attempt.attemptedAt },
      passPct: quiz.passPct,
      results,
      message: passed ? "Quiz passed." : "Not passed yet — review the explanations and retry.",
    });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to submit quiz" });
  }
};

// GET /api/v1/quiz/course/:courseId/status — per-lecture quiz status
// for the signed-in student (only lectures that HAVE a quiz appear).
export const getCourseQuizStatus = async (req, res) => {
  try {
    const course = await loadCourseForProgress(req, res);
    if (!course) return;
    const quizzes = await Quiz.find({ courseId: course._id }).select("_id lectureId").lean();
    const statuses = [];
    for (const quiz of quizzes) {
      const summary = await myQuizSummary(req.id, quiz._id);
      statuses.push({ lectureId: String(quiz.lectureId), quizId: quiz._id, ...summary });
    }
    return res.status(200).json({ success: true, statuses });
  } catch (error) {
    console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
    return res.status(500).json({ success: false, message: "Failed to load quiz status" });
  }
};
