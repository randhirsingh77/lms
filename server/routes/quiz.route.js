import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { validateIds } from "../middlewares/validateIds.js";
import {
  getCourseQuizStatus,
  getLectureQuizForStudent,
  submitQuizAttempt,
} from "../controllers/quiz.controller.js";

const router = express.Router();

// Student-facing quiz endpoints. Instructor authoring lives on the
// course router (PUT/GET/DELETE /course/:courseId/lecture/:lectureId/quiz)
// behind isAuthenticated + isInstructor + ownership checks.
router.route("/lecture/:lectureId").get(isAuthenticated, validateIds("lectureId"), getLectureQuizForStudent);
router.route("/course/:courseId/status").get(isAuthenticated, validateIds("courseId"), getCourseQuizStatus);
router.route("/:quizId/submit").post(isAuthenticated, validateIds("quizId"), submitQuizAttempt);

export default router;
