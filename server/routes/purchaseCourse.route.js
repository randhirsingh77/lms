import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import isInstructor from "../middlewares/isInstructor.js";
import { createCheckoutSession, getAllPurchasedCourse, getCourseDetailWithPurchaseStatus, stripeWebhook } from "../controllers/coursePurchase.controller.js";

const router = express.Router();

router.route("/checkout/create-checkout-session").post(isAuthenticated, createCheckoutSession);
// Raw body for this route is mounted in index.js (before express.json()).
router.route("/webhook").post(stripeWebhook);
router.route("/course/:courseId/detail-with-status").get(isAuthenticated,getCourseDetailWithPurchaseStatus);

// Platform-wide sales list — this feeds the instructor dashboard. It used
// to be readable by ANY logged-in account, students included.
router.route("/").get(isAuthenticated, isInstructor, getAllPurchasedCourse);

export default router;
