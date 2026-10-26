import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import isInstructor from "../middlewares/isInstructor.js";
import { validateIds } from "../middlewares/validateIds.js";
import {
  createTest,
  listCourseTestsForAuthoring,
  getTestForAuthoring,
  updateTest,
  deleteTest,
  setTestPublished,
  listTestAttempts,
  reviewTestAttempt,
  listMyTests,
  getTestBrief,
  startTestAttempt,
  saveAttemptAnswers,
  postAttemptEvent,
  submitTestAttempt,
  getAttemptResult,
} from "../controllers/test.controller.js";

const router = express.Router();

// Instructor authoring + review (role checked, then course ownership
// is enforced inside the controller).
router
  .route("/course/:courseId")
  .post(isAuthenticated, isInstructor, validateIds("courseId"), createTest)
  .get(isAuthenticated, isInstructor, validateIds("courseId"), listCourseTestsForAuthoring);
router
  .route("/authoring/:testId")
  .get(isAuthenticated, isInstructor, validateIds("testId"), getTestForAuthoring);
router
  .route("/:testId/publish")
  .patch(isAuthenticated, isInstructor, validateIds("testId"), setTestPublished);
router
  .route("/:testId/attempts")
  .get(isAuthenticated, isInstructor, validateIds("testId"), listTestAttempts);
router
  .route("/attempt/:attemptId/review")
  .patch(isAuthenticated, isInstructor, validateIds("attemptId"), reviewTestAttempt);
router
  .route("/:testId")
  .put(isAuthenticated, isInstructor, validateIds("testId"), updateTest)
  .delete(isAuthenticated, isInstructor, validateIds("testId"), deleteTest);

// Student endpoints. Payloads never carry correct answers before an
// attempt is submitted (see test.controller.js).
router.route("/mine").get(isAuthenticated, listMyTests);
router
  .route("/:testId/brief")
  .get(isAuthenticated, validateIds("testId"), getTestBrief);
router
  .route("/:testId/start")
  .post(isAuthenticated, validateIds("testId"), startTestAttempt);
router
  .route("/attempt/:attemptId/answers")
  .put(isAuthenticated, validateIds("attemptId"), saveAttemptAnswers);
router
  .route("/attempt/:attemptId/event")
  .post(isAuthenticated, validateIds("attemptId"), postAttemptEvent);
router
  .route("/attempt/:attemptId/submit")
  .post(isAuthenticated, validateIds("attemptId"), submitTestAttempt);
router
  .route("/attempt/:attemptId/result")
  .get(isAuthenticated, validateIds("attemptId"), getAttemptResult);

export default router;
