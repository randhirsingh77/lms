import express from "express"
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { validateIds } from "../middlewares/validateIds.js";
import { getCourseProgress, markAsCompleted, markAsInCompleted, updateLectureProgress } from "../controllers/courseProgress.controller.js";

const router = express.Router()

router.route("/:courseId").get(isAuthenticated, validateIds("courseId"), getCourseProgress);
router.route("/:courseId/lecture/:lectureId/view").post(isAuthenticated, validateIds("courseId", "lectureId"), updateLectureProgress);
router.route("/:courseId/complete").post(isAuthenticated, validateIds("courseId"), markAsCompleted);
router.route("/:courseId/incomplete").post(isAuthenticated, validateIds("courseId"), markAsInCompleted);

export default router;
