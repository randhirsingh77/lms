import express from "express";
import { changePassword, forgotPassword, getUserProfile, login, logout, register, resetPassword, updateProfile } from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
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
router.route("/profile").get(isAuthenticated, getUserProfile);
router.route("/profile/update").put(isAuthenticated, upload.single("profilePhoto"), updateProfile);

export default router;