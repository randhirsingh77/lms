import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { validateIds } from "../middlewares/validateIds.js";
import { createCourse, createLecture, editCourse, editLecture, getCourseById, getCourseLecture, getCreatorCourses, getLectureById, getPublishedCourse, removeLecture, searchCourse, togglePublishCourse } from "../controllers/course.controller.js";
import upload from "../utils/multer.js";
const router = express.Router();

router.route("/").post(isAuthenticated,createCourse);
router.route("/search").get(isAuthenticated, searchCourse);
router.route("/published-courses").get( getPublishedCourse);
router.route("/").get(isAuthenticated,getCreatorCourses);
router.route("/:courseId").put(isAuthenticated, validateIds("courseId"), upload.single("courseThumbnail"), editCourse);
router.route("/:courseId").get(isAuthenticated, validateIds("courseId"), getCourseById);
router.route("/:courseId/lecture").post(isAuthenticated, validateIds("courseId"), createLecture);
router.route("/:courseId/lecture").get(isAuthenticated, validateIds("courseId"), getCourseLecture);
router.route("/:courseId/lecture/:lectureId").post(isAuthenticated, validateIds("courseId", "lectureId"), editLecture);
router.route("/lecture/:lectureId").delete(isAuthenticated, validateIds("lectureId"), removeLecture);
router.route("/lecture/:lectureId").get(isAuthenticated, validateIds("lectureId"), getLectureById);
router.route("/:courseId").patch(isAuthenticated, validateIds("courseId"), togglePublishCourse);


export default router;
