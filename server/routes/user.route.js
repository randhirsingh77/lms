import express from "express";
import { changePassword, forgotPassword, getPublicInstructor, getPublicStudentProfile, getUserProfile, login, logout, register, resetPassword, updateProfile, updatePublicProfileSettings } from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { validateIds } from "../middlewares/validateIds.js";
import upload from "../utils/multer.js";

const router = express.Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logout);
// Password recovery + change. The strict per-endpoint rate limiters for
// these three live in index.js (mounted by exact path before this router).
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password").post(resetPassword);
router.route("/change-password").post(isAuthenticated, changePassword);
// Public, student-facing instructor page. NO auth: the controller builds
// the payload field-by-field from the instructor's privacy choices, so
// private data is never in the response to begin with.
router.route("/instructor/:id").get(validateIds("id"), getPublicInstructor);
// Public, opt-in student skill page. NO auth: 404 unless the student
// enabled it, and the payload never contains contact details.
router.route("/u/:slug").get(getPublicStudentProfile);
router.route("/public-profile").put(isAuthenticated, updatePublicProfileSettings);
router.route("/profile").get(isAuthenticated, getUserProfile);
router.route("/profile/update").put(isAuthenticated, upload.single("profilePhoto"), updateProfile);

export default router;