import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import isInstructor from "../middlewares/isInstructor.js";
import { validateIds } from "../middlewares/validateIds.js";
import {
  createLiveSession,
  listCourseSessionsForOwner,
  setLiveSessionStatus,
  deleteLiveSession,
  listMyLiveSessions,
  getLiveSessionJoinInfo,
} from "../controllers/liveSession.controller.js";

const router = express.Router();

// Instructor scheduling (role checked, then course ownership is
// enforced inside the controller).
router
  .route("/course/:courseId")
  .post(isAuthenticated, isInstructor, validateIds("courseId"), createLiveSession)
  .get(isAuthenticated, isInstructor, validateIds("courseId"), listCourseSessionsForOwner);
router
  .route("/:sessionId/status")
  .patch(isAuthenticated, isInstructor, validateIds("sessionId"), setLiveSessionStatus);
router
  .route("/:sessionId")
  .delete(isAuthenticated, isInstructor, validateIds("sessionId"), deleteLiveSession);

// Student endpoints. The room slug is only ever returned inside the
// join window (see liveSession.controller.js).
router.route("/mine").get(isAuthenticated, listMyLiveSessions);
router
  .route("/:sessionId/join")
  .get(isAuthenticated, validateIds("sessionId"), getLiveSessionJoinInfo);

export default router;
