import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import isInstructor from "../middlewares/isInstructor.js";
import { validateIds } from "../middlewares/validateIds.js";
import { createCategory, createCourse, createLecture, editCourse, editLecture, getCategories, getCourseById, getCourseLecture, getCreatorCourses, getLectureById, getPublishedCourse, removeLecture, searchCourse, togglePublishCourse } from "../controllers/course.controller.js";
import { deleteLectureQuiz, getLectureQuizForAuthoring, upsertLectureQuiz } from "../controllers/quiz.controller.js";
import upload from "../utils/multer.js";
const router = express.Router();

// Categories must be registered BEFORE "/:courseId" — otherwise
// "categories" is captured as a course id and rejected by validateIds.
router.route("/categories").get(getCategories);
router.route("/category").post(isAuthenticated, isInstructor, createCategory);
// Creating a course is instructor work — the route used to accept any
// logged-in account, so a student could mint courses via the API even
// though the UI never shows them the button.
router.route("/").post(isAuthenticated, isInstructor, createCourse);
router.route("/search").get(isAuthenticated, searchCourse);
router.route("/published-courses").get( getPublishedCourse);
router.route("/").get(isAuthenticated,getCreatorCourses);
router.route("/:courseId").put(isAuthenticated, validateIds("courseId"), upload.single("courseThumbnail"), editCourse);
router.route("/:courseId").get(isAuthenticated, validateIds("courseId"), getCourseById);
router.route("/:courseId/lecture").post(isAuthenticated, validateIds("courseId"), createLecture);
router.route("/:courseId/lecture").get(isAuthenticated, validateIds("courseId"), getCourseLecture);
router.route("/:courseId/lecture/:lectureId").post(isAuthenticated, validateIds("courseId", "lectureId"), editLecture);
// Per-lecture quiz authoring — instructor + course ownership are both
// enforced (middleware for the role, controller for ownership).
router.route("/:courseId/lecture/:lectureId/quiz")
    .get(isAuthenticated, isInstructor, validateIds("courseId", "lectureId"), getLectureQuizForAuthoring)
    .put(isAuthenticated, isInstructor, validateIds("courseId", "lectureId"), upsertLectureQuiz)
    .delete(isAuthenticated, isInstructor, validateIds("courseId", "lectureId"), deleteLectureQuiz);
router.route("/lecture/:lectureId").delete(isAuthenticated, validateIds("lectureId"), removeLecture);
router.route("/lecture/:lectureId").get(isAuthenticated, validateIds("lectureId"), getLectureById);
router.route("/:courseId").patch(isAuthenticated, validateIds("courseId"), togglePublishCourse);


export default router;
