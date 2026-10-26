import { Test } from "../models/test.model.js";
import { TestAttempt, TEST_EVENT_TYPES } from "../models/testAttempt.model.js";
import { Course } from "../models/course.model.js";
import { loadCourseForProgress } from "./courseProgress.controller.js";
import { validateQuestions } from "./quiz.controller.js";

// Standalone timed tests with integrity logging.
//
// Rules:
//  - Authoring is instructor + course-owner only (same ownership pattern
//    as lecture quizzes). A test is invisible to students until the
//    instructor publishes it.
//  - Students see tests only for courses they are enrolled in (the
//    course owner can also open them). Student payloads NEVER include
//    correctIndex or explanations before the attempt is submitted;
//    scoring happens here, on the server.
//  - An attempt starts only after the student accepts the
//    integrity-logging notice; the acceptance timestamp and the notice
//    version are stored on the attempt.
//  - During the attempt the browser reports events (tab hidden,
//    fullscreen exit, window blur, copy/paste attempts). The server
//    stamps each event with its own clock. Qualifying events — tab
//    hidden for 3s+, fullscreen exited, window blurred for 5s+ — count
//    as warnings: the student is warned as they happen, gets a FINAL
//    warning at the test's maxWarnings count, and one more qualifying
//    event auto-submits the attempt with the answers saved so far.
//    Copy/paste/context-menu events are logged but never count.
//  - After submission the instructor sees the score plus the flagged
//    event timeline and records a review decision (cleared / upheld).
//    The system flags events; the instructor decides what they mean.

// Bump this whenever the wording of the integrity-logging notice
// changes, so stored consent always names the text the student saw.
export const TEST_NOTICE_VERSION = "2026-10-v1";

const QUALIFYING_MIN_DURATION = { tab_hidden: 3000, window_blur: 5000 };

const isQualifying = (type, durationMs) => {
  if (type === "fullscreen_exited") return true;
  const min = QUALIFYING_MIN_DURATION[type];
  if (min !== undefined) return Number(durationMs) >= min;
  return false;
};

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const serverError = (res, error, message) => {
  console.error(error?.name || "Error", "-", String(error?.message || "").slice(0, 200));
  return res.status(500).json({ success: false, message });
};

// Instructor guard: course exists and belongs to the caller.
const loadOwnedCourse = async (req, res, courseId) => {
  const course = await Course.findById(courseId);
  if (!course) {
    fail(res, 404, "Course not found!");
    return null;
  }
  if (String(course.creator) !== String(req.id)) {
    fail(res, 403, "You can only manage tests on your own courses.");
    return null;
  }
  return course;
};

// Instructor guard for test-scoped routes: test exists and its course
// belongs to the caller.
const loadOwnedTest = async (req, res, testId) => {
  const test = await Test.findById(testId);
  if (!test) {
    fail(res, 404, "Test not found!");
    return null;
  }
  const course = await loadOwnedCourse(req, res, test.courseId);
  if (!course) return null;
  return test;
};

const cleanQuestions = (questions) =>
  questions.map((q) => ({
    prompt: q.prompt.trim(),
    options: q.options.map((o) => o.trim()),
    correctIndex: q.correctIndex,
    explanation: (q.explanation || "").trim(),
  }));

const validateTestFields = (body, { partial = false } = {}) => {
  const out = {};
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length < 1 || body.title.trim().length > 200) {
      return { error: "A test needs a title of at most 200 characters." };
    }
    out.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.length > 1000) {
      return { error: "Description must be at most 1000 characters." };
    }
    out.description = body.description.trim();
  }
  if (!partial || body.questions !== undefined) {
    const questionError = validateQuestions(body.questions);
    if (questionError) return { error: questionError.replace("quiz", "test") };
    out.questions = cleanQuestions(body.questions);
  }
  for (const [field, min, max, label] of [
    ["durationMin", 1, 600, "Duration"],
    ["passPct", 1, 100, "Pass percentage"],
    ["maxWarnings", 0, 20, "Max warnings"],
  ]) {
    if (body[field] !== undefined) {
      const v = Number(body[field]);
      if (!Number.isInteger(v) || v < min || v > max) {
        return { error: `${label} must be a whole number between ${min} and ${max}.` };
      }
      out[field] = v;
    }
  }
  return { value: out };
};

// ---------- Instructor: CRUD + publish ----------

// POST /api/v1/test/course/:courseId
export const createTest = async (req, res) => {
  try {
    const course = await loadOwnedCourse(req, res, req.params.courseId);
    if (!course) return;
    const { error, value } = validateTestFields(req.body || {});
    if (error) return fail(res, 400, error);
    const test = await Test.create({
      courseId: course._id,
      createdBy: req.id,
      durationMin: 30,
      passPct: 70,
      maxWarnings: 3,
      ...value,
    });
    return res.status(201).json({ success: true, test, message: "Test created." });
  } catch (error) {
    return serverError(res, error, "Failed to create test");
  }
};

// GET /api/v1/test/course/:courseId — authoring list (full questions).
export const listCourseTestsForAuthoring = async (req, res) => {
  try {
    const course = await loadOwnedCourse(req, res, req.params.courseId);
    if (!course) return;
    const tests = await Test.find({ courseId: course._id })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, tests });
  } catch (error) {
    return serverError(res, error, "Failed to load tests");
  }
};

// GET /api/v1/test/authoring/:testId — authoring view of one test.
export const getTestForAuthoring = async (req, res) => {
  try {
    const test = await loadOwnedTest(req, res, req.params.testId);
    if (!test) return;
    return res.status(200).json({ success: true, test });
  } catch (error) {
    return serverError(res, error, "Failed to load test");
  }
};

// PUT /api/v1/test/:testId
export const updateTest = async (req, res) => {
  try {
    const test = await loadOwnedTest(req, res, req.params.testId);
    if (!test) return;
    const { error, value } = validateTestFields(req.body || {}, { partial: true });
    if (error) return fail(res, 400, error);
    Object.assign(test, value);
    await test.save();
    return res.status(200).json({ success: true, test, message: "Test updated." });
  } catch (error) {
    return serverError(res, error, "Failed to update test");
  }
};

// DELETE /api/v1/test/:testId
export const deleteTest = async (req, res) => {
  try {
    const test = await loadOwnedTest(req, res, req.params.testId);
    if (!test) return;
    await Test.findByIdAndDelete(test._id);
    return res.status(200).json({ success: true, message: "Test deleted." });
  } catch (error) {
    return serverError(res, error, "Failed to delete test");
  }
};

// PATCH /api/v1/test/:testId/publish { published }
export const setTestPublished = async (req, res) => {
  try {
    const test = await loadOwnedTest(req, res, req.params.testId);
    if (!test) return;
    test.published = !!(req.body || {}).published;
    await test.save();
    return res.status(200).json({
      success: true,
      test: { _id: test._id, published: test.published },
      message: test.published ? "Test published." : "Test unpublished.",
    });
  } catch (error) {
    return serverError(res, error, "Failed to update test");
  }
};

// ---------- Instructor: attempts + review ----------

// GET /api/v1/test/:testId/attempts — every attempt with its event log.
export const listTestAttempts = async (req, res) => {
  try {
    const test = await loadOwnedTest(req, res, req.params.testId);
    if (!test) return;
    const attempts = await TestAttempt.find({ testId: test._id })
      .populate("userId", "name email")
      .sort({ startedAt: -1 })
      .lean();
    return res.status(200).json({
      success: true,
      test: {
        _id: test._id,
        title: test.title,
        courseId: test.courseId,
        passPct: test.passPct,
        maxWarnings: test.maxWarnings,
      },
      attempts: attempts.map((a) => ({
        _id: a._id,
        student: a.userId
          ? { _id: a.userId._id, name: a.userId.name, email: a.userId.email }
          : null,
        status: a.status,
        scorePct: a.scorePct,
        passed: a.passed,
        warningsUsed: a.warningsUsed,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        reviewDecision: a.reviewDecision,
        // The flagged timeline: qualifying events are the ones that
        // counted as warnings; the rest are context.
        events: (a.events || []).map((e) => ({
          type: e.type,
          at: e.at,
          durationMs: e.durationMs,
          charCount: e.charCount,
          counted: isQualifying(e.type, e.durationMs),
        })),
      })),
    });
  } catch (error) {
    return serverError(res, error, "Failed to load attempts");
  }
};

// PATCH /api/v1/test/attempt/:attemptId/review { decision }
export const reviewTestAttempt = async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.attemptId);
    if (!attempt) return fail(res, 404, "Attempt not found!");
    const course = await loadOwnedCourse(req, res, attempt.courseId);
    if (!course) return;
    const decision = (req.body || {}).decision;
    if (!["cleared", "upheld"].includes(decision)) {
      return fail(res, 400, "Decision must be 'cleared' or 'upheld'.");
    }
    if (attempt.status === "in_progress") {
      return fail(res, 400, "This attempt is still in progress.");
    }
    attempt.reviewDecision = decision;
    attempt.reviewedBy = req.id;
    attempt.reviewedAt = new Date();
    await attempt.save();
    return res.status(200).json({
      success: true,
      attempt: {
        _id: attempt._id,
        reviewDecision: attempt.reviewDecision,
        reviewedAt: attempt.reviewedAt,
      },
      message: "Review decision recorded.",
    });
  } catch (error) {
    return serverError(res, error, "Failed to record review decision");
  }
};

// ---------- Student ----------

const attemptSummary = async (userId, testId) => {
  const attempts = await TestAttempt.find({ userId, testId })
    .select("status scorePct passed startedAt submittedAt warningsUsed reviewDecision")
    .sort({ startedAt: -1 })
    .lean();
  const finished = attempts.filter((a) => a.status !== "in_progress");
  return {
    attempts: attempts.length,
    inProgressAttemptId: attempts.find((a) => a.status === "in_progress")?._id || null,
    bestScorePct: finished.length
      ? Math.max(...finished.map((a) => a.scorePct ?? 0))
      : null,
    passed: finished.some((a) => a.passed),
    lastAttempt: attempts[0] || null,
  };
};

// GET /api/v1/test/mine — published tests across my enrolled courses.
export const listMyTests = async (req, res) => {
  try {
    const courses = await Course.find({
      $or: [{ enrolledStudents: req.id }, { creator: req.id }],
    })
      .select("courseTitle")
      .lean();
    const courseById = new Map(courses.map((c) => [String(c._id), c]));
    const tests = await Test.find({
      courseId: { $in: courses.map((c) => c._id) },
      published: true,
    })
      .select("courseId title description durationMin passPct maxWarnings questions")
      .sort({ createdAt: -1 })
      .lean();
    const out = [];
    for (const t of tests) {
      out.push({
        _id: t._id,
        courseId: t.courseId,
        courseTitle: courseById.get(String(t.courseId))?.courseTitle || "",
        title: t.title,
        description: t.description,
        durationMin: t.durationMin,
        passPct: t.passPct,
        maxWarnings: t.maxWarnings,
        questionCount: (t.questions || []).length,
        myStatus: await attemptSummary(req.id, t._id),
      });
    }
    return res.status(200).json({ success: true, tests: out });
  } catch (error) {
    return serverError(res, error, "Failed to load tests");
  }
};

// Load a published test + verify the caller may take it (enrolled or
// course owner, via the same guard the progress endpoints use).
const loadTestForStudent = async (req, res, testId) => {
  const test = await Test.findById(testId);
  if (!test || !test.published) {
    fail(res, 404, "Test not found!");
    return null;
  }
  req.params.courseId = String(test.courseId);
  const course = await loadCourseForProgress(req, res);
  if (!course) return null;
  return test;
};

// GET /api/v1/test/:testId/brief — what the consent screen shows. No
// questions, no answers — just the shape of the test and the rules.
export const getTestBrief = async (req, res) => {
  try {
    const test = await loadTestForStudent(req, res, req.params.testId);
    if (!test) return;
    return res.status(200).json({
      success: true,
      test: {
        _id: test._id,
        courseId: test.courseId,
        title: test.title,
        description: test.description,
        durationMin: test.durationMin,
        passPct: test.passPct,
        maxWarnings: test.maxWarnings,
        questionCount: test.questions.length,
      },
      noticeVersion: TEST_NOTICE_VERSION,
      myStatus: await attemptSummary(req.id, test._id),
    });
  } catch (error) {
    return serverError(res, error, "Failed to load test");
  }
};

const studentTestShape = (test) => ({
  _id: test._id,
  courseId: test.courseId,
  title: test.title,
  durationMin: test.durationMin,
  passPct: test.passPct,
  maxWarnings: test.maxWarnings,
  // Rebuilt field-by-field: correctIndex and explanation cannot leak.
  questions: test.questions.map((q) => ({
    prompt: q.prompt,
    options: q.options,
  })),
});

const scoreAttempt = (test, answers) => {
  const clean = test.questions.map((_, i) =>
    Number.isInteger(answers?.[i]) && answers[i] >= 0 ? answers[i] : -1
  );
  const correctCount = test.questions.filter(
    (q, i) => clean[i] === q.correctIndex
  ).length;
  const scorePct = Math.round((correctCount / test.questions.length) * 100);
  return { clean, scorePct, passed: scorePct >= test.passPct };
};

const finishAttempt = async (attempt, test, status) => {
  const { clean, scorePct, passed } = scoreAttempt(test, attempt.answers);
  attempt.answers = clean;
  attempt.scorePct = scorePct;
  attempt.passed = passed;
  attempt.status = status;
  attempt.submittedAt = new Date();
  await attempt.save();
  return attempt;
};

// If the clock has run out on an in-progress attempt, close it with the
// answers saved so far. Returns the attempt (possibly just finished).
const expireIfOverdue = async (attempt, test) => {
  if (attempt.status !== "in_progress") return attempt;
  const deadline =
    new Date(attempt.startedAt).getTime() + test.durationMin * 60_000 + 30_000;
  if (Date.now() > deadline) {
    await finishAttempt(attempt, test, "auto_submitted");
  }
  return attempt;
};

// POST /api/v1/test/:testId/start { consent, noticeVersion }
// Consent is mandatory: no acceptance, no attempt.
export const startTestAttempt = async (req, res) => {
  try {
    const test = await loadTestForStudent(req, res, req.params.testId);
    if (!test) return;
    const { consent, noticeVersion } = req.body || {};
    if (consent !== true) {
      return fail(res, 400, "Please read and accept the integrity-logging notice before starting.");
    }
    if (noticeVersion !== TEST_NOTICE_VERSION) {
      return fail(res, 400, "The notice has been updated — please review it and try again.");
    }
    let attempt = await TestAttempt.findOne({
      testId: test._id,
      userId: req.id,
      status: "in_progress",
    });
    if (attempt) {
      // Resume the open attempt (a refresh should not restart a test).
      await expireIfOverdue(attempt, test);
      if (attempt.status !== "in_progress") {
        return fail(res, 409, "Your previous attempt was closed when its time ran out. You can start a new attempt.");
      }
    } else {
      attempt = await TestAttempt.create({
        testId: test._id,
        courseId: test.courseId,
        userId: req.id,
        consentAt: new Date(),
        noticeVersion: TEST_NOTICE_VERSION,
        startedAt: new Date(),
        answers: test.questions.map(() => -1),
      });
    }
    return res.status(201).json({
      success: true,
      attempt: {
        _id: attempt._id,
        status: attempt.status,
        startedAt: attempt.startedAt,
        endsAt: new Date(
          new Date(attempt.startedAt).getTime() + test.durationMin * 60_000
        ),
        warningsUsed: attempt.warningsUsed,
        answers: attempt.answers,
      },
      test: studentTestShape(test),
      message: "Test started.",
    });
  } catch (error) {
    return serverError(res, error, "Failed to start test");
  }
};

// Load an attempt that belongs to the caller and its test.
const loadOwnAttempt = async (req, res) => {
  const attempt = await TestAttempt.findById(req.params.attemptId);
  if (!attempt || String(attempt.userId) !== String(req.id)) {
    fail(res, 404, "Attempt not found!");
    return null;
  }
  const test = await Test.findById(attempt.testId);
  if (!test) {
    fail(res, 404, "Test not found!");
    return null;
  }
  return { attempt, test };
};

// PUT /api/v1/test/attempt/:attemptId/answers { answers } — autosave.
export const saveAttemptAnswers = async (req, res) => {
  try {
    const loaded = await loadOwnAttempt(req, res);
    if (!loaded) return;
    const { attempt, test } = loaded;
    if (attempt.status !== "in_progress") {
      return fail(res, 409, "This attempt is already submitted.");
    }
    await expireIfOverdue(attempt, test);
    if (attempt.status !== "in_progress") {
      return fail(res, 409, "Time is up — this attempt has been auto-submitted.");
    }
    const { answers } = req.body || {};
    if (!Array.isArray(answers) || answers.length !== test.questions.length) {
      return fail(res, 400, `Answers must cover all ${test.questions.length} questions.`);
    }
    attempt.answers = answers.map((a) =>
      Number.isInteger(a) && a >= 0 ? a : -1
    );
    await attempt.save();
    return res.status(200).json({ success: true, saved: true });
  } catch (error) {
    return serverError(res, error, "Failed to save answers");
  }
};

// POST /api/v1/test/attempt/:attemptId/event { type, durationMs, charCount }
// The server stamps the time; the client only names what happened.
export const postAttemptEvent = async (req, res) => {
  try {
    const loaded = await loadOwnAttempt(req, res);
    if (!loaded) return;
    const { attempt, test } = loaded;
    if (attempt.status !== "in_progress") {
      return fail(res, 409, "This attempt is already submitted.");
    }
    const { type, durationMs, charCount } = req.body || {};
    if (!TEST_EVENT_TYPES.includes(type)) {
      return fail(res, 400, "Unknown event type.");
    }
    const event = {
      type,
      at: new Date(),
      durationMs:
        durationMs === undefined || durationMs === null
          ? null
          : Math.max(0, Math.min(Number(durationMs) || 0, 24 * 60 * 60 * 1000)),
      // Paste events carry a COUNT only. Anything that looks like
      // content is dropped here — it is never stored.
      charCount:
        type === "paste_attempt"
          ? Math.max(0, Math.min(Number(charCount) || 0, 1_000_000))
          : null,
    };
    attempt.events.push(event);

    let warningLevel = "none";
    if (isQualifying(type, event.durationMs)) {
      attempt.warningsUsed += 1;
      if (attempt.warningsUsed > test.maxWarnings) {
        await finishAttempt(attempt, test, "auto_submitted");
        return res.status(200).json({
          success: true,
          warningsUsed: attempt.warningsUsed,
          maxWarnings: test.maxWarnings,
          warningLevel: "auto_submitted",
          status: attempt.status,
          message: "Warning limit reached — your test has been submitted with the answers saved so far.",
        });
      }
      warningLevel =
        attempt.warningsUsed >= test.maxWarnings ? "final" : "warning";
    }
    await attempt.save();
    return res.status(200).json({
      success: true,
      warningsUsed: attempt.warningsUsed,
      maxWarnings: test.maxWarnings,
      warningLevel,
      status: attempt.status,
    });
  } catch (error) {
    return serverError(res, error, "Failed to record event");
  }
};

// POST /api/v1/test/attempt/:attemptId/submit { answers? }
export const submitTestAttempt = async (req, res) => {
  try {
    const loaded = await loadOwnAttempt(req, res);
    if (!loaded) return;
    const { attempt, test } = loaded;
    if (attempt.status !== "in_progress") {
      return fail(res, 409, "This attempt is already submitted.");
    }
    const { answers } = req.body || {};
    if (answers !== undefined) {
      if (!Array.isArray(answers) || answers.length !== test.questions.length) {
        return fail(res, 400, `Answers must cover all ${test.questions.length} questions.`);
      }
      attempt.answers = answers;
    }
    await finishAttempt(attempt, test, "submitted");
    return res.status(200).json({
      success: true,
      attempt: {
        _id: attempt._id,
        status: attempt.status,
        scorePct: attempt.scorePct,
        passed: attempt.passed,
        submittedAt: attempt.submittedAt,
        warningsUsed: attempt.warningsUsed,
      },
      message: attempt.passed ? "Test passed." : "Test submitted — below the pass mark this time.",
    });
  } catch (error) {
    return serverError(res, error, "Failed to submit test");
  }
};

// GET /api/v1/test/attempt/:attemptId/result — own finished attempt,
// with the per-question breakdown (answers revealed only now).
export const getAttemptResult = async (req, res) => {
  try {
    const loaded = await loadOwnAttempt(req, res);
    if (!loaded) return;
    const { attempt, test } = loaded;
    await expireIfOverdue(attempt, test);
    if (attempt.status === "in_progress") {
      return fail(res, 409, "This attempt is still in progress.");
    }
    return res.status(200).json({
      success: true,
      test: {
        _id: test._id,
        title: test.title,
        passPct: test.passPct,
        maxWarnings: test.maxWarnings,
      },
      attempt: {
        _id: attempt._id,
        status: attempt.status,
        scorePct: attempt.scorePct,
        passed: attempt.passed,
        warningsUsed: attempt.warningsUsed,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        reviewDecision: attempt.reviewDecision,
        flaggedEvents: (attempt.events || [])
          .filter((e) => isQualifying(e.type, e.durationMs))
          .map((e) => ({ type: e.type, at: e.at, durationMs: e.durationMs })),
      },
      results: test.questions.map((q, i) => ({
        prompt: q.prompt,
        options: q.options,
        yourAnswer: attempt.answers?.[i] ?? -1,
        correctIndex: q.correctIndex,
        correct: (attempt.answers?.[i] ?? -1) === q.correctIndex,
        explanation: q.explanation || "",
      })),
    });
  } catch (error) {
    return serverError(res, error, "Failed to load result");
  }
};
